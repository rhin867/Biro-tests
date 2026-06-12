import React from 'react';
import { cn } from '@/lib/utils';
import { MistakeType } from '@/types/exam';
import { getMistakeTypeLabel } from '@/lib/exam-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';

interface MistakeFeedbackProps {
  selectedTypes: MistakeType[];
  onTypesChange: (types: MistakeType[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  markedForRevision: boolean;
  onRevisionToggle: () => void;
  className?: string;
}

const mistakeTypes: MistakeType[] = [
  'concept',
  'formula',
  'calculation',
  'time-management',
  'guessing',
  'forgot-concept',
  'misread',
  'correct-slow',
  'perfectly-known',
];

const typeColors: Record<MistakeType, string> = {
  'concept': 'border-red-500/50 data-[state=checked]:bg-red-500/20',
  'formula': 'border-orange-500/50 data-[state=checked]:bg-orange-500/20',
  'calculation': 'border-yellow-500/50 data-[state=checked]:bg-yellow-500/20',
  'time-management': 'border-blue-500/50 data-[state=checked]:bg-blue-500/20',
  'guessing': 'border-purple-500/50 data-[state=checked]:bg-purple-500/20',
  'forgot-concept': 'border-pink-500/50 data-[state=checked]:bg-pink-500/20',
  'misread': 'border-teal-500/50 data-[state=checked]:bg-teal-500/20',
  'correct-slow': 'border-green-500/50 data-[state=checked]:bg-green-500/20',
  'perfectly-known': 'border-cyan-500/50 data-[state=checked]:bg-cyan-500/20',
};

export function MistakeFeedback({
  selectedTypes,
  onTypesChange,
  notes,
  onNotesChange,
  markedForRevision,
  onRevisionToggle,
  className,
}: MistakeFeedbackProps) {
  const handleTypeToggle = (type: MistakeType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className={cn('space-y-4 rounded-lg border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Question Feedback</h4>
        <Button
          variant={markedForRevision ? 'default' : 'outline'}
          size="sm"
          onClick={onRevisionToggle}
          className={cn(
            'gap-2',
            markedForRevision && 'bg-review text-review-foreground hover:bg-review/90'
          )}
        >
          <Bookmark className="h-4 w-4" />
          {markedForRevision ? 'Marked for Revision' : 'Mark for Revision'}
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Mistake Type (Select all that apply)
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {mistakeTypes.map((type) => (
            <div
              key={type}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-all duration-200 hover:bg-accent',
                selectedTypes.includes(type) ? typeColors[type] : 'border-border'
              )}
              onClick={() => handleTypeToggle(type)}
            >
              <Checkbox
                id={`mistake-${type}`}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => handleTypeToggle(type)}
              />
              <Label
                htmlFor={`mistake-${type}`}
                className="text-sm cursor-pointer flex-1"
              >
                {getMistakeTypeLabel(type)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs text-muted-foreground uppercase tracking-wider">
          Personal Notes
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add your notes about this question..."
          className="min-h-[80px] resize-none"
        />
      </div>
    </div>
  );
}
