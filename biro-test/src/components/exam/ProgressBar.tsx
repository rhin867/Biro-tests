import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'default' | 'correct' | 'incorrect' | 'skipped' | 'primary';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  default: 'bg-primary',
  correct: 'bg-correct',
  incorrect: 'bg-incorrect',
  skipped: 'bg-skipped',
  primary: 'bg-primary',
};

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  max,
  variant = 'default',
  showLabel = false,
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full overflow-hidden rounded-full bg-muted', sizeStyles[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantStyles[variant]
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

interface MultiProgressBarProps {
  segments: Array<{
    value: number;
    variant: 'correct' | 'incorrect' | 'skipped';
    label?: string;
  }>;
  total: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MultiProgressBar({
  segments,
  total,
  size = 'md',
  className,
}: MultiProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className={cn('flex w-full overflow-hidden rounded-full bg-muted', sizeStyles[size])}>
        {segments.map((segment, index) => {
          const percentage = total > 0 ? (segment.value / total) * 100 : 0;
          return (
            <div
              key={index}
              className={cn(
                'h-full transition-all duration-500',
                variantStyles[segment.variant],
                index === 0 && 'rounded-l-full',
                index === segments.length - 1 && 'rounded-r-full'
              )}
              style={{ width: `${percentage}%` }}
              title={segment.label ? `${segment.label}: ${segment.value}` : `${segment.value}`}
            />
          );
        })}
      </div>
    </div>
  );
}
