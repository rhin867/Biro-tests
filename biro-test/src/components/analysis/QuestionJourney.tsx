import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, X, ChevronRight, Flag, Clock } from 'lucide-react';

interface QuestionJourneyProps {
  questionResults: QuestionResult[];
  totalDuration: number;
}

export function QuestionJourney({ questionResults, totalDuration }: QuestionJourneyProps) {
  const chunkMinutes = 30;
  const numChunks = Math.ceil(totalDuration / chunkMinutes);

  let cumulativeTime = 0;
  const questionsWithTime = questionResults.map(q => {
    const startMinute = cumulativeTime / 60;
    cumulativeTime += q.timeSpent;
    return { ...q, positionMinute: startMinute, visitCount: 1 };
  });

  const chunks = Array.from({ length: numChunks }, (_, i) => {
    const rangeStart = i * chunkMinutes;
    const rangeEnd = (i + 1) * chunkMinutes;
    const questions = questionsWithTime.filter(
      q => q.positionMinute >= rangeStart && q.positionMinute < rangeEnd
    );
    return { label: `${rangeStart} - ${rangeEnd} min`, rangeStart, rangeEnd, questions };
  }).filter(c => c.questions.length > 0);

  const getStatusIcon = (qr: QuestionResult) => {
    if (qr.isCorrect) return <Check className="h-3 w-3 text-correct" />;
    if (qr.isAttempted) return <X className="h-3 w-3 text-incorrect" />;
    return <ChevronRight className="h-3 w-3 text-muted-foreground" />;
  };

  const getStatusBorder = (qr: QuestionResult) => {
    if (qr.isCorrect) return 'border-correct/40 bg-correct/5';
    if (qr.isAttempted) return 'border-incorrect/40 bg-incorrect/5';
    return 'border-muted-foreground/20 bg-muted/30';
  };

  const getSubjectBorderColor = (subject: Subject) => {
    switch (subject) {
      case 'Physics': return 'ring-[hsl(199,89%,48%)]';
      case 'Chemistry': return 'ring-[hsl(142,76%,36%)]';
      case 'Maths': return 'ring-[hsl(280,65%,60%)]';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Question Journey
        </CardTitle>
        <div className="flex flex-wrap gap-4 text-sm mt-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded border border-correct/40 bg-correct/10 flex items-center justify-center">
              <Check className="h-3 w-3 text-correct" />
            </div>
            Answered Correct
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded border border-incorrect/40 bg-incorrect/10 flex items-center justify-center">
              <X className="h-3 w-3 text-incorrect" />
            </div>
            Answered Wrong
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded border border-muted-foreground/20 bg-muted/30 flex items-center justify-center">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
            Skipped
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded border border-review/40 bg-review/10 flex items-center justify-center">
              <Flag className="h-3 w-3 text-review" />
            </div>
            Marked for Review
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {chunks.map((chunk, chunkIndex) => (
            <div key={chunkIndex}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-semibold">{chunk.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({chunk.questions.length} questions)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {chunk.questions.map((q, i) => (
                  <React.Fragment key={q.questionId}>
                    <div
                      className={cn(
                        'relative flex h-11 w-11 items-center justify-center rounded-lg border-2 text-xs font-bold transition-all hover:ring-2 hover:ring-primary/30 cursor-default',
                        getStatusBorder(q),
                        q.markedForRevision && 'ring-1 ring-review/50'
                      )}
                      title={`Q${q.questionNumber} • ${q.subject} • ${q.isCorrect ? 'Correct' : q.isAttempted ? 'Incorrect' : 'Skipped'} • ${Math.round(q.timeSpent)}s`}
                    >
                      {q.questionNumber}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
                        {getStatusIcon(q)}
                      </div>
                      {q.markedForRevision && (
                        <div className="absolute -top-1 -right-1">
                          <Flag className="h-2.5 w-2.5 text-review" />
                        </div>
                      )}
                    </div>
                    {i < chunk.questions.length - 1 && (
                      <div className="flex items-center text-muted-foreground/30 flex-shrink-0">
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
