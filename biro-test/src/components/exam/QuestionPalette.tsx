import React from 'react';
import { cn } from '@/lib/utils';
import { QuestionStatus } from '@/types/exam';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentQuestion: number;
  questionStatuses: Record<number, QuestionStatus>;
  onQuestionClick: (questionNumber: number) => void;
  className?: string;
}

const statusStyles: Record<QuestionStatus, string> = {
  unattempted: 'bg-secondary text-secondary-foreground hover:bg-accent',
  answered: 'bg-correct text-correct-foreground',
  'marked-review': 'bg-review text-review-foreground',
  'answered-marked': 'bg-gradient-to-br from-correct to-review text-correct-foreground',
  skipped: 'bg-skipped text-skipped-foreground',
};

export function QuestionPalette({
  totalQuestions,
  currentQuestion,
  questionStatuses,
  onQuestionClick,
  className,
}: QuestionPaletteProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Question Palette
      </h3>
      
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const questionNum = i + 1;
          const status = questionStatuses[questionNum] || 'unattempted';
          const isCurrent = questionNum === currentQuestion;

          return (
            <button
              key={questionNum}
              onClick={() => onQuestionClick(questionNum)}
              className={cn(
                'question-btn',
                statusStyles[status],
                isCurrent && 'question-btn-current'
              )}
            >
              {questionNum}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 pt-4 border-t border-border">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Legend
        </h4>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <LegendItem color="bg-secondary" label="Not Visited" />
          <LegendItem color="bg-correct" label="Answered" />
          <LegendItem color="bg-review" label="Marked for Review" />
          <LegendItem color="bg-gradient-to-r from-correct to-review" label="Answered & Marked" />
          <LegendItem color="bg-skipped" label="Not Answered" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-4 w-4 rounded', color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
