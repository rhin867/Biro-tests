import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'correct' | 'incorrect' | 'skipped' | 'primary';
  className?: string;
}

const variantStyles = {
  default: 'bg-card',
  correct: 'bg-correct/10 border-correct/30',
  incorrect: 'bg-incorrect/10 border-incorrect/30',
  skipped: 'bg-skipped/10 border-skipped/30',
  primary: 'bg-primary/10 border-primary/30',
};

const variantValueStyles = {
  default: 'text-foreground',
  correct: 'text-correct',
  incorrect: 'text-incorrect',
  skipped: 'text-skipped',
  primary: 'text-primary',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:shadow-lg',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('text-2xl font-bold', variantValueStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center text-xs font-medium',
              trend.isPositive ? 'text-correct' : 'text-incorrect'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'rounded-lg p-2',
            variant === 'default' ? 'bg-muted' : 'bg-background/50'
          )}>
            <Icon className={cn('h-5 w-5', variantValueStyles[variant])} />
          </div>
        )}
      </div>
    </div>
  );
}
