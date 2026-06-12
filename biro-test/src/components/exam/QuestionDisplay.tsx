import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Question } from '@/types/exam';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSubjectColor } from '@/lib/exam-utils';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { ImageIcon, ZoomIn } from 'lucide-react';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onAnswerSelect: (answer: string) => void;
  showCorrectAnswer?: boolean;
  className?: string;
  pdfPageImages?: { pageNumber: number; imageDataUrl: string }[];
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  showCorrectAnswer = false,
  className,
  pdfPageImages = [],
}: QuestionDisplayProps) {
  const subjectColor = getSubjectColor(question.subject);
  const [showDiagram, setShowDiagram] = useState(false);

  // Detect if this is a numerical/integer type question (no valid options)
  const hasValidOptions = Object.values(question.options).some(v => v && v.trim() !== '');
  const isNumerical = question.type === 'Numerical' || !hasValidOptions;

  const getOptionClass = (option: string) => {
    if (!showCorrectAnswer) {
      if (question.type === 'MSQ') {
        const selected = selectedAnswer ? selectedAnswer.split(',') : [];
        return selected.includes(option) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50';
      }
      return selectedAnswer === option ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50';
    }
    
    if (question.type === 'MSQ') {
      const correct = question.correctAnswer ? question.correctAnswer.split(',') : [];
      const selected = selectedAnswer ? selectedAnswer.split(',') : [];
      if (correct.includes(option)) return 'border-correct bg-correct/10';
      if (selected.includes(option) && !correct.includes(option)) return 'border-incorrect bg-incorrect/10';
      return 'border-border opacity-60';
    }

    if (option === question.correctAnswer) return 'border-correct bg-correct/10';
    if (selectedAnswer === option && option !== question.correctAnswer) return 'border-incorrect bg-incorrect/10';
    return 'border-border opacity-60';
  };

  const handleMsqToggle = (option: string) => {
    if (showCorrectAnswer) return;
    const current = selectedAnswer ? selectedAnswer.split(',') : [];
    let updated;
    if (current.includes(option)) {
      updated = current.filter(o => o !== option);
    } else {
      updated = [...current, option].sort();
    }
    onAnswerSelect(updated.join(','));
  };

  const questionPageImage = question.pdfPageNumber 
    ? pdfPageImages.find(p => p.pageNumber === question.pdfPageNumber)
    : null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            {questionNumber}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Question {questionNumber} of {totalQuestions}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={`badge-${subjectColor}`}>{question.subject}</Badge>
              <Badge variant="outline" className="text-xs">{question.chapter}</Badge>
              <Badge variant="secondary" className="text-xs">{isNumerical ? 'Numerical' : question.type}</Badge>
              {question.hasDiagram && (
                <Badge variant="outline" className="text-xs bg-review/10 text-review border-review">
                  <ImageIcon className="h-3 w-3 mr-1" /> Has Diagram
                </Badge>
              )}
            </div>
          </div>
        </div>
        {(question.hasDiagram || question.croppedImageUrl || questionPageImage) && (
          <Dialog open={showDiagram} onOpenChange={setShowDiagram}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ZoomIn className="h-4 w-4" /> View Original
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Question {questionNumber} - Original PDF</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {question.croppedImageUrl ? (
                  <img src={question.croppedImageUrl} alt={`Question ${questionNumber}`} className="w-full rounded-lg border border-border" />
                ) : questionPageImage ? (
                  <img src={questionPageImage.imageDataUrl} alt={`PDF Page ${question.pdfPageNumber}`} className="w-full rounded-lg border border-border" />
                ) : (
                  <div className="p-8 text-center text-muted-foreground">Original PDF page image not available</div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Question Text */}
      <div className="rounded-lg bg-card border border-border p-6">
        <div className="text-lg leading-relaxed whitespace-pre-wrap">
          <LatexRenderer content={question.question} />
        </div>
        {/* Show diagram directly below question prominently */}
        {question.croppedImageUrl ? (
          <img src={question.croppedImageUrl} alt="Question diagram" className="mt-6 max-w-full rounded-lg object-contain border border-border mx-auto max-h-[400px]" />
        ) : question.imageUrl ? (
          <img src={question.imageUrl} alt="Question diagram" className="mt-6 max-w-full rounded-lg object-contain mx-auto max-h-[400px]" />
        ) : question.hasDiagram && questionPageImage ? (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-3 font-medium">📷 Reference Diagram (Extracted from PDF Page {question.pdfPageNumber}):</p>
            <img src={questionPageImage.imageDataUrl} alt={`Page ${question.pdfPageNumber}`} className="max-w-full rounded object-contain mx-auto border border-border/50 max-h-[600px] shadow-sm" />
          </div>
        ) : null}
      </div>

      {/* Numerical Input or MCQ Options */}
      {isNumerical ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Type your numerical answer:</p>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Enter your answer (e.g., 42, 3.14, -7)"
            value={selectedAnswer || ''}
            onChange={e => onAnswerSelect(e.target.value)}
            className="text-lg font-mono max-w-xs"
            disabled={showCorrectAnswer}
          />
          {showCorrectAnswer && question.correctAnswer && (
            <div className="flex items-center gap-2">
              <Badge className="bg-correct text-correct-foreground">Correct: {question.correctAnswer}</Badge>
              {selectedAnswer && selectedAnswer !== question.correctAnswer && (
                <Badge className="bg-incorrect text-incorrect-foreground">Your Answer: {selectedAnswer}</Badge>
              )}
            </div>
          )}
        </div>
      ) : question.type === 'MSQ' ? (
        <div className="space-y-3">
          {(['A', 'B', 'C', 'D'] as const).map((option) => {
            const isSelected = selectedAnswer?.split(',').includes(option);
            const isCorrect = question.correctAnswer?.split(',').includes(option);
            return (
              <Label key={option} htmlFor={`option-${option}`}
                onClick={() => handleMsqToggle(option)}
                className={cn('flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all duration-200', getOptionClass(option))}>
                <div className={cn("mt-1 w-4 h-4 rounded-sm border", isSelected ? "bg-primary border-primary" : "border-primary")}>
                  {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full text-primary-foreground"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-primary mr-2">({option})</span>
                  <LatexRenderer content={question.options[option]} className="whitespace-pre-wrap" />
                </div>
                {showCorrectAnswer && isCorrect && (
                  <Badge className="bg-correct text-correct-foreground">Correct</Badge>
                )}
                {showCorrectAnswer && isSelected && !isCorrect && (
                  <Badge className="bg-incorrect text-incorrect-foreground">Your Answer</Badge>
                )}
              </Label>
            );
          })}
        </div>
      ) : (
        <RadioGroup value={selectedAnswer || ''} onValueChange={onAnswerSelect} className="space-y-3" disabled={showCorrectAnswer}>
          {(['A', 'B', 'C', 'D'] as const).map((option) => (
            <Label key={option} htmlFor={`option-${option}`}
              className={cn('flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all duration-200', getOptionClass(option))}>
              <RadioGroupItem value={option} id={`option-${option}`} className="mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-primary mr-2">({option})</span>
                <LatexRenderer content={question.options[option]} className="whitespace-pre-wrap" />
              </div>
              {showCorrectAnswer && option === question.correctAnswer && (
                <Badge className="bg-correct text-correct-foreground">Correct</Badge>
              )}
              {showCorrectAnswer && selectedAnswer === option && option !== question.correctAnswer && (
                <Badge className="bg-incorrect text-incorrect-foreground">Your Answer</Badge>
              )}
            </Label>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}
