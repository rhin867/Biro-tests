import React from 'react';
import { cn } from '@/lib/utils';
import { Subject } from '@/types/exam';
import { Button } from '@/components/ui/button';

interface SubjectTabsProps {
  subjects: Subject[];
  activeSubject: Subject;
  onSubjectChange: (subject: Subject) => void;
  subjectCounts?: Record<Subject, { total: number; answered: number }>;
  className?: string;
}

const subjectStyles: Record<Subject, string> = {
  Physics: 'data-[active=true]:bg-physics data-[active=true]:text-physics-foreground hover:bg-physics/20',
  Chemistry: 'data-[active=true]:bg-chemistry data-[active=true]:text-chemistry-foreground hover:bg-chemistry/20',
  Maths: 'data-[active=true]:bg-maths data-[active=true]:text-maths-foreground hover:bg-maths/20',
};

export function SubjectTabs({
  subjects,
  activeSubject,
  onSubjectChange,
  subjectCounts,
  className,
}: SubjectTabsProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {subjects.map((subject) => {
        const isActive = subject === activeSubject;
        const count = subjectCounts?.[subject];

        return (
          <Button
            key={subject}
            variant="ghost"
            data-active={isActive}
            onClick={() => onSubjectChange(subject)}
            className={cn(
              'relative px-4 py-2 transition-all duration-200',
              subjectStyles[subject],
              isActive && 'font-semibold'
            )}
          >
            {subject}
            {count && (
              <span className="ml-2 text-xs opacity-80">
                ({count.answered}/{count.total})
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-current rounded-full" />
            )}
          </Button>
        );
      })}
    </div>
  );
}
