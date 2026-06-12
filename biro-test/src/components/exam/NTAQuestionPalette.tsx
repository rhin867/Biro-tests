import React from 'react';
import { cn } from '@/lib/utils';
import { QuestionStatus, Subject } from '@/types/exam';

interface NTAQuestionPaletteProps {
  totalQuestions: number;
  currentQuestion: number;
  questionStatuses: Record<number, QuestionStatus>;
  questionSubjects: Record<number, Subject>;
  onQuestionClick: (questionNumber: number) => void;
  currentSubject: Subject;
  className?: string;
}

const statusStyles: Record<QuestionStatus, string> = {
  unattempted: 'bg-secondary text-secondary-foreground hover:bg-accent',
  answered: 'bg-correct text-correct-foreground',
  'marked-review': 'bg-review text-review-foreground',
  'answered-marked': 'bg-gradient-to-br from-correct to-review text-correct-foreground',
  skipped: 'bg-incorrect text-incorrect-foreground',
};

export function NTAQuestionPalette({
  totalQuestions,
  currentQuestion,
  questionStatuses,
  questionSubjects,
  onQuestionClick,
  currentSubject,
  className,
}: NTAQuestionPaletteProps) {
  // Filter questions by current subject
  const subjectQuestions = Array.from({ length: totalQuestions }, (_, i) => i + 1)
    .filter((num) => questionSubjects[num] === currentSubject);

  const allQuestions = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  // Count stats for current subject
  const answeredCount = subjectQuestions.filter(
    (num) => questionStatuses[num] === 'answered' || questionStatuses[num] === 'answered-marked'
  ).length;
  const markedCount = subjectQuestions.filter(
    (num) => questionStatuses[num] === 'marked-review' || questionStatuses[num] === 'answered-marked'
  ).length;
  const notVisitedCount = subjectQuestions.filter(
    (num) => questionStatuses[num] === 'unattempted'
  ).length;
  const notAnsweredCount = subjectQuestions.filter(
    (num) => questionStatuses[num] === 'skipped'
  ).length;

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="p-3 border-b border-border bg-muted/50">
        <h3 className="text-sm font-semibold text-center">{currentSubject} - Question Palette</h3>
      </div>

      {/* Question Grid - Always visible */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-5 gap-2">
          {subjectQuestions.map((questionNum) => {
            const status = questionStatuses[questionNum] || 'unattempted';
            const isCurrent = questionNum === currentQuestion;

            return (
              <button
                key={questionNum}
                onClick={() => onQuestionClick(questionNum)}
                className={cn(
                  'h-10 w-10 rounded flex items-center justify-center text-sm font-medium transition-all',
                  statusStyles[status],
                  isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
              >
                {questionNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="border-t border-border p-3 bg-card space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-secondary flex items-center justify-center text-[10px]">
              {notVisitedCount}
            </div>
            <span className="text-muted-foreground">Not Visited</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-incorrect flex items-center justify-center text-[10px] text-incorrect-foreground">
              {notAnsweredCount}
            </div>
            <span className="text-muted-foreground">Not Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-correct flex items-center justify-center text-[10px] text-correct-foreground">
              {answeredCount}
            </div>
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-review flex items-center justify-center text-[10px] text-review-foreground">
              {markedCount}
            </div>
            <span className="text-muted-foreground">Marked</span>
          </div>
        </div>

        {/* Summary Line */}
        <div className="text-center text-xs text-muted-foreground border-t border-border pt-2">
          {answeredCount} answered of {subjectQuestions.length} questions
        </div>
      </div>
    </div>
  );
}
