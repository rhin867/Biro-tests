import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface DifficultyAnalysisProps {
  questionResults: QuestionResult[];
  questions: { id: string; level: string }[];
}

type DifficultyLevel = 'Easy' | 'Moderate' | 'Tough';

function getDifficultyFromLevel(level: string): DifficultyLevel {
  const l = level?.toLowerCase() || 'moderate';
  if (l === 'easy' || l === 'simple') return 'Easy';
  if (l === 'tough' || l === 'difficult' || l === 'hard') return 'Tough';
  return 'Moderate';
}

interface DifficultyData {
  difficulty: DifficultyLevel;
  correct: number;
  incorrect: number;
  unattempted: number;
  total: number;
}

function getDifficultyBreakdown(
  questionResults: QuestionResult[],
  questions: { id: string; level: string }[],
  subject?: Subject
): DifficultyData[] {
  const filtered = subject
    ? questionResults.filter(q => q.subject === subject)
    : questionResults;

  const levels: DifficultyLevel[] = ['Easy', 'Moderate', 'Tough'];
  return levels.map(difficulty => {
    const qs = filtered.filter(qr => {
      const q = questions.find(tq => tq.id === qr.questionId);
      return getDifficultyFromLevel(q?.level || '') === difficulty;
    });
    return {
      difficulty,
      correct: qs.filter(q => q.isCorrect).length,
      incorrect: qs.filter(q => q.isAttempted && !q.isCorrect).length,
      unattempted: qs.filter(q => !q.isAttempted).length,
      total: qs.length,
    };
  }).filter(d => d.total > 0);
}

// Generate simulated benchmark data
function getBenchmarkDifficulty(total: number, level: DifficultyLevel) {
  const factor = level === 'Easy' ? 0.95 : level === 'Moderate' ? 0.75 : 0.60;
  const topperCorrect = Math.round(total * factor);
  const top10Correct = Math.round(total * factor * 0.85);
  const top25Correct = Math.round(total * factor * 0.72);
  return {
    topper: { correct: topperCorrect, incorrect: Math.round(total * 0.02), unattempted: total - topperCorrect - Math.round(total * 0.02) },
    top10: { correct: top10Correct, incorrect: Math.round(total * 0.05), unattempted: total - top10Correct - Math.round(total * 0.05) },
    top25: { correct: top25Correct, incorrect: Math.round(total * 0.06), unattempted: total - top25Correct - Math.round(total * 0.06) },
  };
}

export function DifficultyAnalysis({ questionResults, questions }: DifficultyAnalysisProps) {
  const renderSection = (subject?: Subject) => {
    const data = getDifficultyBreakdown(questionResults, questions, subject);

    return (
      <div className="space-y-6">
        {data.map(row => {
          const bench = getBenchmarkDifficulty(row.total, row.difficulty);

          const students = [
            { label: '🎯 You', correct: row.correct, incorrect: row.incorrect, unattempted: row.unattempted },
            { label: '👑 Topper', ...bench.topper },
            { label: '🥈 Top 10%ile', ...bench.top10 },
            { label: '🥉 Top 25%ile', ...bench.top25 },
          ];

          return (
            <Card key={row.difficulty}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {row.difficulty} ({row.total} Qs)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium">Students</th>
                        <th className="text-center py-2 px-3 font-medium text-correct">Attempted Correct</th>
                        <th className="text-center py-2 px-3 font-medium text-incorrect">Attempted Wrong</th>
                        <th className="text-center py-2 px-3 font-medium">Not Attempted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s.label} className={cn(
                          'border-b border-border/30',
                          i === 0 && 'bg-primary/5 font-semibold'
                        )}>
                          <td className="py-2 px-3">{s.label}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-correct font-bold">{s.correct}</span>
                            <span className="text-muted-foreground text-xs">/{row.total}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-incorrect font-bold">{s.incorrect}</span>
                            <span className="text-muted-foreground text-xs">/{row.total}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="font-bold">{s.unattempted}</span>
                            <span className="text-muted-foreground text-xs">/{row.total}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Combined Graph */}
        {data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Graphical Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-correct" />Correct</div>
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-incorrect" />Incorrect</div>
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-muted" />Unattempted</div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} barCategoryGap="20%">
                  <XAxis dataKey="difficulty" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }} />
                  <Bar dataKey="correct" name="Correct" fill="hsl(var(--correct))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="incorrect" name="Incorrect" fill="hsl(var(--incorrect))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unattempted" name="Unattempted" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Difficulty Analysis</CardTitle>
          <CardDescription>
            Performance breakdown by difficulty — Easy, Moderate, and Tough with benchmark comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overall" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="physics">Physics</TabsTrigger>
              <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
              <TabsTrigger value="maths">Mathematics</TabsTrigger>
            </TabsList>
            <TabsContent value="overall">{renderSection()}</TabsContent>
            <TabsContent value="physics">{renderSection('Physics')}</TabsContent>
            <TabsContent value="chemistry">{renderSection('Chemistry')}</TabsContent>
            <TabsContent value="maths">{renderSection('Maths')}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
