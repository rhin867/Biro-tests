import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface TimeAnalysisProps {
  questionResults: QuestionResult[];
  totalDuration: number;
}

function formatTimeHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function TimeAnalysis({ questionResults, totalDuration }: TimeAnalysisProps) {
  // Quality of time
  const getTimeStats = (qs: QuestionResult[]) => {
    const timeOnCorrect = qs.filter(q => q.isCorrect).reduce((s, q) => s + q.timeSpent, 0);
    const timeOnIncorrect = qs.filter(q => q.isAttempted && !q.isCorrect).reduce((s, q) => s + q.timeSpent, 0);
    const timeOnUnattempted = qs.filter(q => !q.isAttempted).reduce((s, q) => s + q.timeSpent, 0);
    const total = timeOnCorrect + timeOnIncorrect + timeOnUnattempted;
    return { timeOnCorrect, timeOnIncorrect, timeOnUnattempted, total };
  };

  const overall = getTimeStats(questionResults);

  // Time journey - 30-min chunks
  const chunkMinutes = 30;
  const numChunks = Math.ceil(totalDuration / chunkMinutes);
  
  let cumulativeTime = 0;
  const questionsWithPosition = questionResults.map(q => {
    const start = cumulativeTime;
    cumulativeTime += q.timeSpent;
    return { ...q, positionMinute: (start + cumulativeTime) / 2 / 60 };
  });

  const timeJourneyData = Array.from({ length: numChunks }, (_, i) => {
    const rangeStart = i * chunkMinutes;
    const rangeEnd = (i + 1) * chunkMinutes;
    const questionsInRange = questionsWithPosition.filter(
      q => q.positionMinute >= rangeStart && q.positionMinute < rangeEnd
    );
    const correct = questionsInRange.filter(q => q.isCorrect).length;
    const incorrect = questionsInRange.filter(q => q.isAttempted && !q.isCorrect).length;
    
    return {
      period: `${rangeStart}-${rangeEnd}min`,
      label: i === 0 ? 'First 30 mins' : `${rangeStart}-${rangeEnd} min`,
      Correct: correct,
      Incorrect: incorrect,
      Overall: questionsInRange.length,
    };
  });

  // Subject-wise time
  const subjectTimeData = (['Physics', 'Chemistry', 'Maths'] as Subject[]).map(subject => {
    const subjectQs = questionResults.filter(q => q.subject === subject);
    const stats = getTimeStats(subjectQs);
    const attempted = subjectQs.filter(q => q.isAttempted).length;
    const correct = subjectQs.filter(q => q.isCorrect).length;
    return {
      name: subject === 'Maths' ? 'Mathematics' : subject,
      subject,
      ...stats,
      attempted,
      correct,
      total: subjectQs.length,
      attemptPercent: subjectQs.length > 0 ? Math.round((attempted / subjectQs.length) * 100) : 0,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    };
  }).filter(s => s.total > 0);

  const renderTimeBar = (correct: number, incorrect: number, unattempted: number, total: number) => {
    if (total === 0) return null;
    const cp = (correct / total * 100);
    const ip = (incorrect / total * 100);
    const up = (unattempted / total * 100);
    return (
      <div className="w-full h-6 rounded-lg overflow-hidden flex">
        <div className="bg-correct flex items-center justify-center text-[10px] font-medium text-white"
          style={{ width: `${cp}%` }}>
          {cp > 15 && `${Math.round(cp)}%`}
        </div>
        <div className="bg-incorrect flex items-center justify-center text-[10px] font-medium text-white"
          style={{ width: `${ip}%` }}>
          {ip > 15 && `${Math.round(ip)}%`}
        </div>
        <div className="bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground"
          style={{ width: `${up}%` }}>
          {up > 15 && `${Math.round(up)}%`}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Time and Accuracy Table - like PDF page 5 */}
      <Card>
        <CardHeader>
          <CardTitle>Time and Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Subject</th>
                  <th className="text-center py-3 px-4 font-medium">Time Spent</th>
                  <th className="text-center py-3 px-4 font-medium">Attempt (%)</th>
                  <th className="text-center py-3 px-4 font-medium">Accuracy (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50 font-semibold bg-muted/20">
                  <td className="py-3 px-4">Overall</td>
                  <td className="py-3 px-4 text-center">{formatTimeHMS(overall.total)}</td>
                  <td className="py-3 px-4 text-center">
                    {questionResults.length > 0 
                      ? Math.round((questionResults.filter(q => q.isAttempted).length / questionResults.length) * 100)
                      : 0}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {(() => {
                      const a = questionResults.filter(q => q.isAttempted);
                      return a.length > 0 ? Math.round((a.filter(q => q.isCorrect).length / a.length) * 100) : 0;
                    })()}
                  </td>
                </tr>
                {subjectTimeData.map(s => (
                  <tr key={s.subject} className="border-b border-border/30">
                    <td className="py-3 px-4">{s.name}</td>
                    <td className="py-3 px-4 text-center">{formatTimeHMS(s.total)}</td>
                    <td className="py-3 px-4 text-center">{s.attemptPercent}</td>
                    <td className="py-3 px-4 text-center font-medium">{s.accuracy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quality of Time Spent */}
      <Card>
        <CardHeader>
          <CardTitle>Quality of Time Spent</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overall" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="physics">Physics</TabsTrigger>
              <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
              <TabsTrigger value="maths">Mathematics</TabsTrigger>
            </TabsList>
            {['overall', 'physics', 'chemistry', 'maths'].map(tab => {
              const qs = tab === 'overall' 
                ? questionResults
                : questionResults.filter(q => q.subject === (tab === 'maths' ? 'Maths' : tab.charAt(0).toUpperCase() + tab.slice(1)) as Subject);
              const stats = getTimeStats(qs);
              return (
                <TabsContent key={tab} value={tab}>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-correct" />
                        Time on Correct: {formatTimeHMS(stats.timeOnCorrect)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-incorrect" />
                        Time on Incorrect: {formatTimeHMS(stats.timeOnIncorrect)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-muted" />
                        Time on Unattempted: {formatTimeHMS(stats.timeOnUnattempted)}
                      </div>
                    </div>
                    {renderTimeBar(stats.timeOnCorrect, stats.timeOnIncorrect, stats.timeOnUnattempted, stats.total)}
                    <p className="text-sm text-muted-foreground">Total: {formatTimeHMS(stats.total)}</p>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Attempts Over Time - Table + Graph like PDF page 13 */}
      <Card>
        <CardHeader>
          <CardTitle>Attempts Over {Math.ceil(totalDuration / 60)} Hour(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Interval</th>
                  <th className="text-center py-3 px-4 font-medium text-correct">Correct</th>
                  <th className="text-center py-3 px-4 font-medium text-incorrect">Incorrect</th>
                  <th className="text-center py-3 px-4 font-medium">Overall</th>
                </tr>
              </thead>
              <tbody>
                {timeJourneyData.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-3 px-4 font-medium">{row.label}</td>
                    <td className="py-3 px-4 text-center text-correct font-medium">{row.Correct}</td>
                    <td className="py-3 px-4 text-center text-incorrect font-medium">{row.Incorrect}</td>
                    <td className="py-3 px-4 text-center font-medium">{row.Overall}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar Chart */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-correct" />
              Correct
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-incorrect" />
              Incorrect
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-muted border border-border" />
              Overall
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeJourneyData} barCategoryGap="15%">
              <XAxis
                dataKey="period"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="Correct" fill="hsl(var(--correct))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Incorrect" fill="hsl(var(--incorrect))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Overall" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
