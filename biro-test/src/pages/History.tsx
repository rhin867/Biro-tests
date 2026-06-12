import React from 'react';
import { Link } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MultiProgressBar } from '@/components/exam/ProgressBar';
import { getResults } from '@/lib/storage';
import { formatTime } from '@/lib/exam-utils';
import { BarChart3, Calendar, Clock, Target } from 'lucide-react';

export default function History() {
  const results = getResults().reverse();

  return (
    <MainLayout>
      <PageHeader title="Test History" description={`${results.length} completed attempts`} />

      {results.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Test History</h3>
            <p className="text-muted-foreground mb-4">Complete a test to see your history</p>
            <Link to="/tests"><Button>View Tests</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.attemptId} className="hover:border-primary/50 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{result.testName}</h3>
                      <Badge variant={result.accuracy >= 60 ? 'default' : 'destructive'}>
                        {result.accuracy.toFixed(1)}% accuracy
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(result.completedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(result.timeTaken)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {result.score}/{result.maxScore}
                      </span>
                    </div>
                    <MultiProgressBar
                      segments={[
                        { value: result.correct, variant: 'correct' },
                        { value: result.incorrect, variant: 'incorrect' },
                        { value: result.skipped, variant: 'skipped' },
                      ]}
                      total={result.totalQuestions}
                      size="sm"
                    />
                  </div>
                  <Link to={`/analysis/${result.attemptId}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <BarChart3 className="h-4 w-4" />
                      View Analysis
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
