import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BookOpen, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissedConceptsProps {
  questionResults: QuestionResult[];
}

const subjectIcons: Record<Subject, string> = {
  Physics: '⚛️',
  Chemistry: '🧪',
  Maths: '📐',
};

const subjectColors: Record<Subject, string> = {
  Physics: 'border-l-[hsl(199,89%,48%)]',
  Chemistry: 'border-l-[hsl(142,76%,36%)]',
  Maths: 'border-l-[hsl(280,65%,60%)]',
};

export function MissedConcepts({ questionResults }: MissedConceptsProps) {
  // Get incorrect questions grouped by subject -> chapter -> topic
  const missedBySubject: Record<Subject, { chapter: string; questions: QuestionResult[] }[]> = {
    Physics: [],
    Chemistry: [],
    Maths: [],
  };

  const incorrectQs = questionResults.filter(qr => qr.isAttempted && !qr.isCorrect);

  // Group by subject and chapter
  (['Physics', 'Chemistry', 'Maths'] as Subject[]).forEach(subject => {
    const subjectQs = incorrectQs.filter(q => q.subject === subject);
    const chapterMap: Record<string, QuestionResult[]> = {};
    
    subjectQs.forEach(q => {
      const ch = q.chapter || 'General';
      if (!chapterMap[ch]) chapterMap[ch] = [];
      chapterMap[ch].push(q);
    });

    missedBySubject[subject] = Object.entries(chapterMap).map(([chapter, questions]) => ({
      chapter,
      questions,
    }));
  });

  const hasAnyMissed = Object.values(missedBySubject).some(s => s.length > 0);

  if (!hasAnyMissed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-correct" />
            No Missed Concepts!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">All attempted questions were correct. Great job!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-review" />
            Missed Concepts
          </CardTitle>
          <CardDescription>
            Topics where you got questions wrong — focus your revision here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['Physics', 'Chemistry', 'Maths'] as Subject[]).map(subject => {
            const data = missedBySubject[subject];
            if (data.length === 0) return null;
            
            return (
              <div key={subject} className={cn('border-l-4 pl-4 space-y-3', subjectColors[subject])}>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span>{subjectIcons[subject]}</span>
                  {subject}
                </h3>
                <ol className="space-y-2">
                  {data.map((item, idx) => (
                    <li key={item.chapter} className="flex items-start gap-3">
                      <span className="text-muted-foreground font-medium min-w-[24px]">{idx + 1}.</span>
                      <div className="flex-1">
                        <span className="font-medium">{item.chapter}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.questions.map(q => (
                            <Badge key={q.questionId} variant="outline" className="text-xs border-incorrect/30 text-incorrect">
                              Q{q.questionNumber}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
