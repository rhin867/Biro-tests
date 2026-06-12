import React from 'react';
import { TestResult, QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface ScorePotentialProps {
  result: TestResult;
  positiveMarking: number;
  negativeMarking: number;
}

export function ScorePotential({ result, positiveMarking, negativeMarking }: ScorePotentialProps) {
  const marksLostToNegative = result.incorrect * negativeMarking;
  const potentialWithoutNegative = result.score + marksLostToNegative;

  // Wasted attempts
  const wastedQuestions = result.questionResults.filter(
    q => q.isAttempted && !q.isCorrect && q.timeSpent < 30
  );
  const confusedQuestions = result.questionResults.filter(
    q => !q.isAttempted && q.timeSpent > 60
  );
  const timeWastedOnConfused = confusedQuestions.reduce((s, q) => s + q.timeSpent, 0);

  // Score potential calculation (50%, 75%, 100% less errors)
  const totalErrors = result.incorrect;
  const getScoreWithLessErrors = (reductionPercent: number) => {
    const errorsRemoved = Math.round(totalErrors * reductionPercent / 100);
    return result.score + (errorsRemoved * (positiveMarking + negativeMarking));
  };

  // Chart data for score potential
  const potentialChartData = [
    { name: 'Actual Score', score: result.score, improved: 0 },
    { name: '50% less error', score: result.score, improved: getScoreWithLessErrors(50) - result.score },
    { name: '75% less error', score: result.score, improved: getScoreWithLessErrors(75) - result.score },
    { name: '100% less error', score: result.score, improved: getScoreWithLessErrors(100) - result.score },
  ];

  // Subject-wise potential
  const getSubjectPotential = (subject: Subject) => {
    const subjectQs = result.questionResults.filter(q => q.subject === subject);
    const subjectIncorrect = subjectQs.filter(q => q.isAttempted && !q.isCorrect).length;
    const subjectScore = result.subjectWise[subject].score;

    return [
      { name: 'Actual', score: subjectScore, improved: 0 },
      { name: '50% less', score: subjectScore, improved: Math.round(subjectIncorrect * 0.5) * (positiveMarking + negativeMarking) },
      { name: '75% less', score: subjectScore, improved: Math.round(subjectIncorrect * 0.75) * (positiveMarking + negativeMarking) },
      { name: '100% less', score: subjectScore, improved: subjectIncorrect * (positiveMarking + negativeMarking) },
    ];
  };

  // Behavior classification
  let behaviorTag = 'Balanced Solver';
  if (wastedQuestions.length > 5) behaviorTag = 'The Gambler';
  else if (confusedQuestions.length > 5) behaviorTag = 'The Overthinker';
  else if (result.accuracy > 85) behaviorTag = 'The Precision Player';
  else if (result.attempted / result.totalQuestions > 0.9) behaviorTag = 'The Completionist';

  const renderChart = (data: typeof potentialChartData, maxScore: number) => (
    <div>
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }} />
          Actual Score
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(var(--primary) / 0.4)' }} />
          Improved score by error reduction
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="name"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            domain={[0, maxScore]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'improved') return [value, 'Improvement'];
              return [value, 'Base Score'];
            }}
          />
          <Bar dataKey="score" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} name="score">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
            ))}
          </Bar>
          <Bar dataKey="improved" stackId="a" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="improved">
            {data.map((entry, index) => (
              <Cell key={`cell2-${index}`} fill="hsl(var(--primary) / 0.4)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Labels above bars */}
      <div className="flex justify-around text-sm font-medium -mt-2">
        {data.map((d, i) => (
          <span key={i}>{d.score + d.improved}/{maxScore}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Score Potential Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Score Potential
          </CardTitle>
          <CardDescription>
            How your score would improve by reducing errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overall" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="maths">Mathematics</TabsTrigger>
              <TabsTrigger value="physics">Physics</TabsTrigger>
              <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
            </TabsList>
            <TabsContent value="overall">
              {renderChart(potentialChartData, result.maxScore)}
            </TabsContent>
            <TabsContent value="maths">
              {renderChart(getSubjectPotential('Maths'), result.subjectWise.Maths.maxScore)}
            </TabsContent>
            <TabsContent value="physics">
              {renderChart(getSubjectPotential('Physics'), result.subjectWise.Physics.maxScore)}
            </TabsContent>
            <TabsContent value="chemistry">
              {renderChart(getSubjectPotential('Chemistry'), result.subjectWise.Chemistry.maxScore)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-muted text-center">
          <p className="text-2xl font-bold text-primary">{result.score}</p>
          <p className="text-xs text-muted-foreground">Actual Score</p>
        </div>
        <div className="p-4 rounded-lg bg-correct/10 text-center">
          <p className="text-2xl font-bold text-correct">{potentialWithoutNegative}</p>
          <p className="text-xs text-muted-foreground">Without Negatives</p>
        </div>
        <div className="p-4 rounded-lg bg-review/10 text-center">
          <p className="text-2xl font-bold text-review">{marksLostToNegative}</p>
          <p className="text-xs text-muted-foreground">Lost to Negatives</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 text-center">
          <p className="text-2xl font-bold">{getScoreWithLessErrors(100)}</p>
          <p className="text-xs text-muted-foreground">Max Achievable</p>
        </div>
      </div>

      {/* Behavior Tag */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Attempt Style</p>
              <p className="font-semibold text-lg">{behaviorTag}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {wastedQuestions.length > 0 && (
        <Card className="border-incorrect/20 bg-incorrect/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-incorrect mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">
                  ⚠️ Gambler Alert: {wastedQuestions.length} Wasted Attempts
                </p>
                <p className="text-sm text-muted-foreground">
                  You lost <span className="font-medium text-incorrect">{wastedQuestions.length * negativeMarking} marks</span> by
                  guessing blindly in under 30 seconds on questions {wastedQuestions.map(q => `Q${q.questionNumber}`).join(', ')}.
                  If you had skipped these, your score would be {result.score + wastedQuestions.length * negativeMarking}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {confusedQuestions.length > 0 && (
        <Card className="border-review/20 bg-review/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-review mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">
                  ⏳ Time Leak: {Math.round(timeWastedOnConfused / 60)} minutes wasted
                </p>
                <p className="text-sm text-muted-foreground">
                  You spent {Math.round(timeWastedOnConfused / 60)} minutes on {confusedQuestions.length} questions 
                  you didn't answer ({confusedQuestions.map(q => `Q${q.questionNumber}`).slice(0, 5).join(', ')}).
                  Learn to skip faster.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result.accuracy >= 80 && result.attempted / result.totalQuestions < 0.7 && (
        <Card className="border-correct/20 bg-correct/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-correct mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">
                  💡 High Accuracy but Low Attempts
                </p>
                <p className="text-sm text-muted-foreground">
                  Your accuracy is {result.accuracy.toFixed(0)}% but you only attempted {result.attempted}/{result.totalQuestions} questions.
                  Attempting just 5 more could add up to {5 * positiveMarking} marks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
