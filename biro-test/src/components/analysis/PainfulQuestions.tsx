import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Clock, TrendingDown, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/exam-utils';

interface PainfulQuestionsProps {
  questionResults: QuestionResult[];
  onQuestionClick: (qr: QuestionResult) => void;
}

const subjectColors: Record<Subject, string> = {
  Physics: 'text-[hsl(199,89%,48%)]',
  Chemistry: 'text-[hsl(142,76%,36%)]',
  Maths: 'text-[hsl(280,65%,60%)]',
};

export function PainfulQuestions({ questionResults, onQuestionClick }: PainfulQuestionsProps) {
  // Time Wasters: Questions where user spent most time but got wrong
  const timeWasters = questionResults
    .filter(q => q.isAttempted && !q.isCorrect)
    .sort((a, b) => b.timeSpent - a.timeSpent)
    .slice(0, 5);

  // Painful by subject
  const painfulBySubject: Record<Subject, QuestionResult[]> = {
    Physics: [],
    Chemistry: [],
    Maths: [],
  };

  questionResults
    .filter(q => q.isAttempted && !q.isCorrect)
    .forEach(q => {
      painfulBySubject[q.subject].push(q);
    });

  // Toughest question: highest time + wrong
  const allAttempted = questionResults.filter(q => q.isAttempted);
  const toughest = allAttempted
    .filter(q => !q.isCorrect)
    .sort((a, b) => b.timeSpent - a.timeSpent)[0];

  // Easiest question: lowest time + correct
  const easiest = allAttempted
    .filter(q => q.isCorrect)
    .sort((a, b) => a.timeSpent - b.timeSpent)[0];

  // Easiest question user skipped (low time, others got it right / it was easy)
  const lowestHangingFruit = questionResults
    .filter(q => !q.isAttempted)
    .sort((a, b) => a.timeSpent - b.timeSpent)[0];

  return (
    <div className="space-y-6">
      {/* Toughest & Easiest Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toughest && (
          <Card className="border-incorrect/20 bg-incorrect/5 cursor-pointer hover:bg-incorrect/10 transition-colors"
            onClick={() => onQuestionClick(toughest)}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-incorrect/20 flex items-center justify-center flex-shrink-0">
                  <Flame className="h-5 w-5 text-incorrect" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Deadliest Question</p>
                  <p className="font-bold text-lg">Q{toughest.questionNumber}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className={subjectColors[toughest.subject]}>{toughest.subject}</span>
                    {' • '}{toughest.chapter}
                  </p>
                  <p className="text-sm mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatTime(toughest.timeSpent)} spent • <span className="text-incorrect">Incorrect</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {easiest && (
          <Card className="border-correct/20 bg-correct/5 cursor-pointer hover:bg-correct/10 transition-colors"
            onClick={() => onQuestionClick(easiest)}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-correct/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-5 w-5 text-correct" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Quickest Correct</p>
                  <p className="font-bold text-lg">Q{easiest.questionNumber}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className={subjectColors[easiest.subject]}>{easiest.subject}</span>
                    {' • '}{easiest.chapter}
                  </p>
                  <p className="text-sm mt-1">
                    <Zap className="h-3 w-3 inline mr-1" />
                    {formatTime(easiest.timeSpent)} spent • <span className="text-correct">Correct</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {lowestHangingFruit && (
        <Card className="border-review/20 bg-review/5 cursor-pointer hover:bg-review/10 transition-colors"
          onClick={() => onQuestionClick(lowestHangingFruit)}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-review mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">Missed Opportunity — Q{lowestHangingFruit.questionNumber}</p>
                <p className="text-sm text-muted-foreground">
                  You skipped Q{lowestHangingFruit.questionNumber} ({lowestHangingFruit.subject} — {lowestHangingFruit.chapter}).
                  You looked at it for {formatTime(lowestHangingFruit.timeSpent)} but didn't attempt it.
                  This could have been an easy pickup.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Painful Questions by Subject */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-incorrect" />
            Painful Questions
          </CardTitle>
          <CardDescription>
            Questions that cost you the most — biggest time-wasters and score-killers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['Physics', 'Chemistry', 'Maths'] as Subject[]).map(subject => {
            const qs = painfulBySubject[subject];
            if (qs.length === 0) return null;
            return (
              <div key={subject}>
                <h4 className={cn('font-semibold mb-2', subjectColors[subject])}>{subject}</h4>
                <div className="flex flex-wrap gap-2">
                  {qs.map(q => (
                    <button
                      key={q.questionId}
                      onClick={() => onQuestionClick(q)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-incorrect/10 border border-incorrect/20 text-sm hover:bg-incorrect/20 transition-colors"
                    >
                      <span className="font-medium">Q {q.questionNumber}</span>
                      <span className="text-xs text-muted-foreground">({formatTime(q.timeSpent)})</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {timeWasters.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No painful questions — all attempts were correct!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
