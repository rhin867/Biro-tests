import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/exam-utils';
import { Clock } from 'lucide-react';

interface ExamTimerProps {
  initialTime: number; // in seconds
  onTimeUp: () => void;
  onTick?: (remaining: number) => void;
  isPaused?: boolean;
  className?: string;
}

export function ExamTimer({
  initialTime,
  onTimeUp,
  onTick,
  isPaused = false,
  className,
}: ExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  const getTimerClass = useCallback(() => {
    const percentage = (timeRemaining / initialTime) * 100;
    if (percentage <= 10) return 'timer-critical';
    if (percentage <= 25) return 'timer-warning';
    return 'timer-normal';
  }, [timeRemaining, initialTime]);

  useEffect(() => {
    if (isPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (onTick) onTick(newTime);
        if (newTime <= 0) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUp, onTick, timeRemaining]);

  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className={cn('h-5 w-5', getTimerClass())} />
      <span className={cn('font-mono text-xl font-bold', getTimerClass())}>
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}

interface QuestionTimerProps {
  questionId: string;
  isActive: boolean;
  onTimeUpdate: (questionId: string, seconds: number) => void;
  className?: string;
}

export function QuestionTimer({
  questionId,
  isActive,
  onTimeUpdate,
  className,
}: QuestionTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const newTime = prev + 1;
        onTimeUpdate(questionId, newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, questionId, onTimeUpdate]);

  useEffect(() => {
    setElapsed(0);
  }, [questionId]);

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      Time on question: <span className="font-mono font-medium">{formatTime(elapsed)}</span>
    </div>
  );
}
