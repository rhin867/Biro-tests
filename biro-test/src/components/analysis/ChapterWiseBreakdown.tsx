import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChapterResult, Subject, QuestionResult } from '@/types/exam';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ChapterWiseBreakdownProps {
  chapterData: Record<string, ChapterResult>;
  questionResults: QuestionResult[];
  onQuestionClick: (questionResult: QuestionResult) => void;
}

const subjectColors: Record<Subject, string> = {
  Physics: 'border-l-blue-500',
  Chemistry: 'border-l-green-500',
  Maths: 'border-l-purple-500',
};

export function ChapterWiseBreakdown({
  chapterData,
  questionResults,
  onQuestionClick,
}: ChapterWiseBreakdownProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const toggleChapter = (key: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Group by subject
  const groupedBySubject = Object.entries(chapterData).reduce((acc, [key, chapter]) => {
    if (!acc[chapter.subject]) {
      acc[chapter.subject] = [];
    }
    acc[chapter.subject].push({ key, ...chapter });
    return acc;
  }, {} as Record<Subject, (ChapterResult & { key: string })[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedBySubject).map(([subject, chapters]) => (
        <Card key={subject} className={cn('border-l-4', subjectColors[subject as Subject])}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{subject}</span>
              <Badge variant="outline">
                {chapters.reduce((sum, c) => sum + c.correct, 0)}/{chapters.reduce((sum, c) => sum + c.total, 0)} correct
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chapters.map((chapter) => {
              const isExpanded = expandedChapters.has(chapter.key);
              const chapterQuestions = questionResults.filter(
                qr => chapter.questionIds.includes(qr.questionId)
              );
              
              return (
                <div key={chapter.key} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleChapter(chapter.key)}
                    className="w-full flex items-center justify-between p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{chapter.chapter}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={cn(
                          'text-sm font-medium',
                          chapter.accuracy >= 70 ? 'text-correct' : 
                          chapter.accuracy >= 40 ? 'text-yellow-500' : 'text-incorrect'
                        )}>
                          {chapter.accuracy.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-20">
                        <Progress 
                          value={chapter.accuracy} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-3 bg-muted/30 border-t border-border">
                      <div className="flex flex-wrap gap-2">
                        {chapterQuestions.map((qr) => (
                          <button
                            key={qr.questionId}
                            onClick={() => onQuestionClick(qr)}
                            className={cn(
                              'h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                              qr.isCorrect 
                                ? 'bg-correct/20 text-correct border-2 border-correct/30 hover:bg-correct/30'
                                : qr.isAttempted
                                  ? 'bg-incorrect/20 text-incorrect border-2 border-incorrect/30 hover:bg-incorrect/30'
                                  : 'bg-muted text-muted-foreground border-2 border-border hover:bg-accent'
                            )}
                          >
                            {qr.questionNumber}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span className="text-correct">✓ {chapter.correct} correct</span>
                        <span className="text-incorrect">✗ {chapter.incorrect} wrong</span>
                        <span>{chapter.skipped} skipped</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
