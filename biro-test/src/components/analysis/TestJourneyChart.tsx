import React from 'react';
import { QuestionResult } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface TestJourneyChartProps {
  questionResults: QuestionResult[];
}

export function TestJourneyChart({ questionResults }: TestJourneyChartProps) {
  const data = questionResults.map((qr, index) => ({
    questionNumber: qr.questionNumber,
    index: index + 1,
    status: qr.isCorrect ? 'correct' : qr.isAttempted ? 'incorrect' : 'skipped',
    timeSpent: qr.timeSpent,
    subject: qr.subject,
  }));

  const correctData = data.filter(d => d.status === 'correct');
  const incorrectData = data.filter(d => d.status === 'incorrect');
  const skippedData = data.filter(d => d.status === 'skipped');

  // Calculate cumulative correct count for the journey line
  let cumulativeCorrect = 0;
  const journeyData = data.map((d) => {
    if (d.status === 'correct') cumulativeCorrect++;
    return {
      questionNumber: d.questionNumber,
      cumulativeCorrect,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">Question {data.questionNumber}</p>
          <p className="text-sm text-muted-foreground capitalize">{data.status}</p>
          <p className="text-sm text-muted-foreground">{data.subject}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Test Journey</span>
          <div className="flex items-center gap-4 text-sm font-normal">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-correct" />
              <span>Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-incorrect" />
              <span>Incorrect</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <span>Skipped</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis 
              type="number" 
              dataKey="index" 
              name="Question Order"
              label={{ value: 'Question Order', position: 'bottom', offset: 0 }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              type="number" 
              dataKey="questionNumber" 
              name="Question ID"
              label={{ value: 'Question ID', angle: -90, position: 'insideLeft' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <ZAxis range={[100, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              name="Correct" 
              data={correctData} 
              fill="hsl(var(--correct))" 
            />
            <Scatter 
              name="Incorrect" 
              data={incorrectData} 
              fill="hsl(var(--incorrect))" 
            />
            <Scatter 
              name="Skipped" 
              data={skippedData} 
              fill="hsl(var(--muted))" 
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
