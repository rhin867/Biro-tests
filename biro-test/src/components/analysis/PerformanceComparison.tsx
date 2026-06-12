import React from 'react';
import { TestResult, Subject, QuestionResult } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

interface PerformanceComparisonProps {
  result: TestResult;
}

const subjectLabels: Record<Subject, string> = {
  Physics: 'Physics',
  Chemistry: 'Chemistry',
  Maths: 'Mathematics',
};

function formatTimeHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type AttemptQuality = 'Perfect' | 'Wasted' | 'Overtime' | 'Confused';

function classifyAttempt(q: QuestionResult, idealTime: number = 180): AttemptQuality | null {
  if (q.isCorrect) return q.timeSpent <= idealTime ? 'Perfect' : 'Overtime';
  if (q.isAttempted && !q.isCorrect) return q.timeSpent < idealTime * 0.25 ? 'Wasted' : 'Overtime';
  if (!q.isAttempted && q.timeSpent > idealTime * 0.5) return 'Confused';
  return null;
}

// Simulate benchmark data based on actual results
function generateBenchmarks(result: TestResult) {
  const total = result.totalQuestions;
  const maxScore = result.maxScore;
  
  return {
    topper: {
      score: Math.round(maxScore * 0.95),
      correct: Math.round(total * 0.92),
      incorrect: Math.round(total * 0.03),
      skipped: Math.round(total * 0.05),
      accuracy: 98,
      time: Math.round(result.timeTaken * 0.7),
      perfect: Math.round(total * 0.85),
      wasted: Math.round(total * 0.02),
      overtime: Math.round(total * 0.05),
      confused: Math.round(total * 0.01),
    },
    top10: {
      score: Math.round(maxScore * 0.8),
      correct: Math.round(total * 0.72),
      incorrect: Math.round(total * 0.08),
      skipped: Math.round(total * 0.2),
      accuracy: 92,
      time: Math.round(result.timeTaken * 0.95),
      perfect: Math.round(total * 0.60),
      wasted: Math.round(total * 0.04),
      overtime: Math.round(total * 0.08),
      confused: Math.round(total * 0.04),
    },
    top25: {
      score: Math.round(maxScore * 0.7),
      correct: Math.round(total * 0.62),
      incorrect: Math.round(total * 0.08),
      skipped: Math.round(total * 0.3),
      accuracy: 89,
      time: Math.round(result.timeTaken * 1.05),
      perfect: Math.round(total * 0.50),
      wasted: Math.round(total * 0.04),
      overtime: Math.round(total * 0.08),
      confused: Math.round(total * 0.05),
    },
  };
}

export function PerformanceComparison({ result }: PerformanceComparisonProps) {
  const bench = generateBenchmarks(result);

  // User attempt quality counts
  const userQuality = { Perfect: 0, Wasted: 0, Overtime: 0, Confused: 0 };
  result.questionResults.forEach(q => {
    const c = classifyAttempt(q);
    if (c) userQuality[c]++;
  });

  const students = [
    { label: 'You', icon: '🎯', ...getUserRow() },
    { label: 'Topper', icon: '👑', ...bench.topper },
    { label: 'Top 10%ile', icon: '🥈', ...bench.top10 },
    { label: 'Top 25%ile', icon: '🥉', ...bench.top25 },
  ];

  function getUserRow() {
    return {
      score: result.score,
      correct: result.correct,
      incorrect: result.incorrect,
      skipped: result.skipped,
      accuracy: Math.round(result.accuracy),
      time: result.timeTaken,
      perfect: userQuality.Perfect,
      wasted: userQuality.Wasted,
      overtime: userQuality.Overtime,
      confused: userQuality.Confused,
    };
  }

  // Graphical data for attempt analysis comparison
  const attemptCompareData = students.map(s => ({
    name: s.label,
    Perfect: s.perfect,
    Wasted: s.wasted,
    Overtime: s.overtime,
    Confused: s.confused,
  }));

  return (
    <div className="space-y-6">
      {/* Overall Score Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Students</th>
                  <th className="text-center py-3 px-4 font-medium">Score</th>
                  <th className="text-center py-3 px-4 font-medium text-correct">Attempted Correct</th>
                  <th className="text-center py-3 px-4 font-medium text-incorrect">Attempted Wrong</th>
                  <th className="text-center py-3 px-4 font-medium">Not Attempted</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.label} className={cn(
                    'border-b border-border/30',
                    i === 0 && 'bg-primary/5 font-semibold'
                  )}>
                    <td className="py-3 px-4 flex items-center gap-2">
                      <span>{s.icon}</span> {s.label}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold">{s.score}</span>
                      <span className="text-muted-foreground text-xs">/{result.maxScore}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-correct font-bold">{s.correct}</span>
                      <span className="text-muted-foreground text-xs">/{result.totalQuestions}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-incorrect font-bold">{s.incorrect}</span>
                      <span className="text-muted-foreground text-xs">/{result.totalQuestions}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold">{s.skipped}</span>
                      <span className="text-muted-foreground text-xs">/{result.totalQuestions}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Subject-wise Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Subject</th>
                  <th className="text-center py-3 px-4 font-medium">Total Score</th>
                  <th className="text-center py-3 px-4 font-medium text-correct">Correct</th>
                  <th className="text-center py-3 px-4 font-medium text-incorrect">Wrong</th>
                  <th className="text-center py-3 px-4 font-medium">Skipped</th>
                  <th className="text-center py-3 px-4 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50 font-semibold bg-muted/20">
                  <td className="py-3 px-4">✓ Overall</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-primary font-bold text-lg">{result.score}</span>
                    <span className="text-muted-foreground text-xs">/{result.maxScore}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-correct font-bold">{result.correct}/{result.totalQuestions}</td>
                  <td className="py-3 px-4 text-center text-incorrect font-bold">{result.incorrect}/{result.totalQuestions}</td>
                  <td className="py-3 px-4 text-center">{result.skipped}/{result.totalQuestions}</td>
                  <td className="py-3 px-4 text-center">{formatTimeHMS(result.timeTaken)}</td>
                </tr>
                {(['Maths', 'Physics', 'Chemistry'] as Subject[]).map(subject => {
                  const data = result.subjectWise[subject];
                  if (data.total === 0) return null;
                  return (
                    <tr key={subject} className="border-b border-border/30">
                      <td className={cn('py-3 px-4 font-medium',
                        subject === 'Maths' ? 'text-[hsl(280,65%,60%)]' :
                        subject === 'Physics' ? 'text-[hsl(199,89%,48%)]' :
                        'text-[hsl(142,76%,36%)]'
                      )}>{subjectLabels[subject]}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold">{data.score}</span>
                        <span className="text-muted-foreground text-xs">/{data.maxScore}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-correct font-bold">{data.correct}/{data.total}</td>
                      <td className="py-3 px-4 text-center text-incorrect font-bold">{data.incorrect}/{data.total}</td>
                      <td className="py-3 px-4 text-center">{data.skipped}/{data.total}</td>
                      <td className="py-3 px-4 text-center">{formatTimeHMS(data.timeTaken)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Progress bars */}
          <div className="mt-4 space-y-3">
            {(['Maths', 'Physics', 'Chemistry'] as Subject[]).map(subject => {
              const data = result.subjectWise[subject];
              if (data.total === 0) return null;
              return (
                <div key={subject} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24">{subjectLabels[subject]}</span>
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden flex bg-muted">
                    <div className="bg-correct h-full" style={{ width: `${(data.correct / data.total) * 100}%` }} />
                    <div className="bg-incorrect h-full" style={{ width: `${(data.incorrect / data.total) * 100}%` }} />
                    <div className="bg-review h-full" style={{ width: `${(data.skipped / data.total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attempt Analysis Comparison - like PDF pages 8-9 */}
      <Card>
        <CardHeader>
          <CardTitle>Attempt Analysis Comparison</CardTitle>
          <CardDescription>Perfect, Wasted, Overtime, Confused — You vs Benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table">Tabular</TabsTrigger>
              <TabsTrigger value="graph">Graphical</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium">Students</th>
                      <th className="text-center py-3 px-4 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-correct" />Perfect
                        </span>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-incorrect" />Wasted
                        </span>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(30, 95%, 55%)' }} />Overtime
                        </span>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-review" />Confused
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.label} className={cn(
                        'border-b border-border/30',
                        i === 0 && 'bg-primary/5 font-semibold'
                      )}>
                        <td className="py-3 px-4 flex items-center gap-2">
                          <span>{s.icon}</span> {s.label}
                        </td>
                        <td className="py-3 px-4 text-center text-correct font-bold">{s.perfect}</td>
                        <td className="py-3 px-4 text-center text-incorrect font-bold">{s.wasted}</td>
                        <td className="py-3 px-4 text-center font-bold" style={{ color: 'hsl(30, 95%, 55%)' }}>{s.overtime}</td>
                        <td className="py-3 px-4 text-center text-review font-bold">{s.confused}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="graph">
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-correct" />Perfect</div>
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-incorrect" />Wasted</div>
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(30, 95%, 55%)' }} />Overtime</div>
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-review" />Confused</div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attemptCompareData} barCategoryGap="15%">
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }} />
                  <Bar dataKey="Perfect" fill="hsl(var(--correct))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Wasted" fill="hsl(var(--incorrect))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Overtime" fill="hsl(30, 95%, 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Confused" fill="hsl(var(--review))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Time Breakdown Comparison - like PDF page 10 */}
      <Card>
        <CardHeader>
          <CardTitle>Time Breakdown Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Students</th>
                  <th className="text-center py-3 px-4 font-medium">Time Spent</th>
                  <th className="text-center py-3 px-4 font-medium">Qs Attempted</th>
                  <th className="text-center py-3 px-4 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '🎯 You', time: result.timeTaken, attempted: `${Math.round((result.attempted / result.totalQuestions) * 100)}%`, accuracy: `${Math.round(result.accuracy)}%` },
                  { label: '👑 Topper', time: bench.topper.time, attempted: '100%', accuracy: `${bench.topper.accuracy}%` },
                  { label: '🥈 Top 10%ile', time: bench.top10.time, attempted: '77%', accuracy: `${bench.top10.accuracy}%` },
                  { label: '🥉 Top 25%ile', time: bench.top25.time, attempted: '67%', accuracy: `${bench.top25.accuracy}%` },
                ].map((s, i) => (
                  <tr key={s.label} className={cn('border-b border-border/30', i === 0 && 'bg-primary/5 font-semibold')}>
                    <td className="py-3 px-4">{s.label}</td>
                    <td className="py-3 px-4 text-center">{formatTimeHMS(s.time)}</td>
                    <td className="py-3 px-4 text-center">{s.attempted}</td>
                    <td className="py-3 px-4 text-center">{s.accuracy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
