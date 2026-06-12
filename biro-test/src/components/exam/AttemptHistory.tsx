import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestResult } from '@/types/exam';
import { formatTime } from '@/lib/exam-utils';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Clock, Target, CheckCircle2, XCircle } from 'lucide-react';

interface AttemptHistoryProps {
  testId: string;
  results: TestResult[];
}

export function AttemptHistory({ testId, results }: AttemptHistoryProps) {
  if (results.length === 0) {
    return null;
  }

  // Sort by date descending
  const sortedResults = [...results].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Attempt History</span>
          <Badge variant="outline">{results.length} attempts</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedResults.map((result, index) => {
          const attemptNum = results.length - index;
          const isLatest = index === 0;

          return (
            <div
              key={result.attemptId}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <Badge variant={isLatest ? 'default' : 'secondary'}>
                    Attempt {attemptNum}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(result.completedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="font-medium">{result.score}/{result.maxScore}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-correct" />
                    <span>{result.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-correct" />
                    <span>{result.correct}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatTime(result.timeTaken)}</span>
                  </div>
                </div>
              </div>

              <Link to={`/analysis/${result.attemptId}`}>
                <Button variant="ghost" size="sm" className="gap-1">
                  View Analysis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
