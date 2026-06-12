import React, { useState } from 'react';
import { QuestionResult, Subject, Question } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search, Check, X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/exam-utils';

interface CompleteAuditTableProps {
  questionResults: QuestionResult[];
  questions: Question[];
  onViewQuestion: (qr: QuestionResult) => void;
}

type AttemptQuality = 'Perfect' | 'Overtime' | 'Wasted' | 'Confused' | '-';

function classifyAttemptQuality(q: QuestionResult, idealTime: number = 180): AttemptQuality {
  if (q.isCorrect) {
    return q.timeSpent <= idealTime ? 'Perfect' : 'Overtime';
  }
  if (q.isAttempted && !q.isCorrect) {
    return q.timeSpent < idealTime * 0.25 ? 'Wasted' : 'Overtime';
  }
  if (!q.isAttempted && q.timeSpent > idealTime * 0.5) {
    return 'Confused';
  }
  return '-';
}

const qualityColors: Record<AttemptQuality, string> = {
  Perfect: 'bg-correct/10 text-correct border-correct/20',
  Overtime: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Wasted: 'bg-incorrect/10 text-incorrect border-incorrect/20',
  Confused: 'bg-review/10 text-review border-review/20',
  '-': 'bg-muted/50 text-muted-foreground border-border',
};

const subjectColors: Record<Subject, string> = {
  Physics: 'text-[hsl(199,89%,48%)]',
  Chemistry: 'text-[hsl(142,76%,36%)]',
  Maths: 'text-[hsl(280,65%,60%)]',
};

function formatTimeHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getIdealTime(level: string): number {
  switch (level?.toLowerCase()) {
    case 'easy':
    case 'simple': return 120;
    case 'tough':
    case 'difficult':
    case 'hard': return 210;
    default: return 180;
  }
}

export function CompleteAuditTable({ questionResults, questions, onViewQuestion }: CompleteAuditTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState<Subject | 'All'>('All');

  const enrichedResults = questionResults.map(qr => {
    const question = questions.find(q => q.id === qr.questionId);
    const idealTime = getIdealTime(question?.level || '');
    const quality = classifyAttemptQuality(qr, idealTime);
    return {
      ...qr,
      question,
      difficulty: question?.level || 'Moderate',
      allottedTime: idealTime,
      quality,
    };
  });

  const filtered = enrichedResults
    .filter(qr => filterSubject === 'All' || qr.subject === filterSubject)
    .filter(qr => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        qr.chapter.toLowerCase().includes(term) ||
        String(qr.questionNumber).includes(term) ||
        qr.difficulty.toLowerCase().includes(term)
      );
    });

  const getRowBg = (qr: typeof enrichedResults[0]) => {
    if (qr.isCorrect) return 'bg-correct/5';
    if (qr.isAttempted) return 'bg-incorrect/5';
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Analysis</CardTitle>
        <CardDescription>
          Detailed question-by-question breakdown with difficulty, time, and behavioral tags
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by chapter, Q.No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filterSubject} onValueChange={v => setFilterSubject(v as Subject | 'All')}>
            <TabsList>
              <TabsTrigger value="All">All</TabsTrigger>
              <TabsTrigger value="Physics">Physics</TabsTrigger>
              <TabsTrigger value="Chemistry">Chemistry</TabsTrigger>
              <TabsTrigger value="Maths">Maths</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-center py-3 px-2 font-medium w-12">Q.No</th>
                <th className="text-left py-3 px-2 font-medium">Subject</th>
                <th className="text-left py-3 px-2 font-medium">Chapter</th>
                <th className="text-center py-3 px-2 font-medium">Difficulty</th>
                <th className="text-center py-3 px-2 font-medium">Allotted</th>
                <th className="text-center py-3 px-2 font-medium">Spent</th>
                <th className="text-center py-3 px-2 font-medium">Attempted</th>
                <th className="text-center py-3 px-2 font-medium">Answer</th>
                <th className="text-center py-3 px-2 font-medium">Overview</th>
                <th className="text-center py-3 px-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(qr => (
                <tr key={qr.questionId} className={cn('border-b border-border/30 hover:bg-muted/20 transition-colors', getRowBg(qr))}>
                  <td className="py-2 px-2 text-center font-semibold">{qr.questionNumber}</td>
                  <td className="py-2 px-2">
                    <span className={cn('font-medium text-xs', subjectColors[qr.subject])}>
                      {qr.subject}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-xs max-w-[120px] truncate" title={qr.chapter}>
                    {qr.chapter}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <Badge variant="outline" className={cn('text-xs',
                      qr.difficulty.toLowerCase() === 'easy' ? 'border-correct/30 text-correct' :
                      qr.difficulty.toLowerCase() === 'tough' || qr.difficulty.toLowerCase() === 'difficult' ? 'border-incorrect/30 text-incorrect' :
                      'border-review/30 text-review'
                    )}>
                      {qr.difficulty}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-center text-xs text-muted-foreground">
                    {formatTimeHMS(qr.allottedTime)}
                  </td>
                  <td className="py-2 px-2 text-center text-xs font-medium">
                    {formatTimeHMS(qr.timeSpent)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {qr.isAttempted ? (
                      <span className="text-correct text-xs font-medium">Yes</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {qr.isCorrect ? (
                      <Check className="h-4 w-4 text-correct mx-auto" />
                    ) : qr.isAttempted ? (
                      <X className="h-4 w-4 text-incorrect mx-auto" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {qr.quality !== '-' ? (
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0.5', qualityColors[qr.quality])}>
                        {qr.quality}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewQuestion(qr)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No questions match your filters</p>
        )}
      </CardContent>
    </Card>
  );
}
