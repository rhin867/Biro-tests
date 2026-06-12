import React from 'react';
import { cn } from '@/lib/utils';
import { QuestionResult, Subject } from '@/types/exam';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, MinusCircle, Eye, RefreshCw } from 'lucide-react';

interface QuestionWiseTableProps {
  questionResults: QuestionResult[];
  onViewQuestion: (questionResult: QuestionResult) => void;
  onReattempt?: (questionResult: QuestionResult) => void;
  showReattempt?: boolean;
}

const subjectColors: Record<Subject, string> = {
  Physics: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Chemistry: 'bg-green-500/20 text-green-400 border-green-500/30',
  Maths: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function QuestionWiseTable({
  questionResults,
  onViewQuestion,
  onReattempt,
  showReattempt = true,
}: QuestionWiseTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-16 text-center">Q. No.</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Section</TableHead>
            <TableHead className="text-center">Marks</TableHead>
            <TableHead className="text-center">Result</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questionResults.map((qr, index) => (
            <TableRow 
              key={qr.questionId}
              className={cn(
                qr.isCorrect 
                  ? 'bg-correct/5 hover:bg-correct/10' 
                  : qr.isAttempted 
                    ? 'bg-incorrect/5 hover:bg-incorrect/10' 
                    : 'hover:bg-muted/50'
              )}
            >
              <TableCell className="text-center font-medium">
                {qr.questionNumber}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('text-xs', subjectColors[qr.subject])}>
                  {qr.subject}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {qr.chapter}
              </TableCell>
              <TableCell className={cn(
                'text-center font-semibold',
                qr.marks > 0 ? 'text-correct' : qr.marks < 0 ? 'text-incorrect' : 'text-muted-foreground'
              )}>
                {qr.marks > 0 ? `+${qr.marks}` : qr.marks}
              </TableCell>
              <TableCell className="text-center">
                {qr.isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-correct">
                    <CheckCircle2 className="h-4 w-4" />
                    Correct
                  </span>
                ) : qr.isAttempted ? (
                  <span className="inline-flex items-center gap-1 text-incorrect">
                    <XCircle className="h-4 w-4" />
                    Incorrect
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MinusCircle className="h-4 w-4" />
                    Skipped
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  MCQ
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onViewQuestion(qr)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {showReattempt && !qr.isCorrect && onReattempt && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary"
                      onClick={() => onReattempt(qr)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
