import React, { useState } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getMistakeBook,
  removeFromMistakeBook,
  updateMistakeBookEntry,
  addToMistakeBook,
  generateId,
} from '@/lib/storage';
import { getMistakeTypeLabel } from '@/lib/exam-utils';
import { Subject, MistakeType, MistakeBookEntry, Question } from '@/types/exam';
import { BookOpen, Trash2, CheckCircle, Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export default function MistakeBook() {
  const [entries, setEntries] = useState(getMistakeBook());
  const [filterSubject, setFilterSubject] = useState<Subject | 'All'>('All');
  const [filterMistakeType, setFilterMistakeType] = useState<MistakeType | 'All'>('All');
  const [showMastered, setShowMastered] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // New question form state
  const [newQuestion, setNewQuestion] = useState({
    subject: 'Physics' as Subject,
    chapter: '',
    question: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: '',
    selectedAnswer: '',
    mistakeTypes: [] as MistakeType[],
    notes: '',
  });

  const filteredEntries = entries.filter((e) => {
    if (filterSubject !== 'All' && e.question.subject !== filterSubject) return false;
    if (filterMistakeType !== 'All' && !e.mistakeTypes.includes(filterMistakeType)) return false;
    if (!showMastered && e.mastered) return false;
    return true;
  });

  const handleRemove = (id: string) => {
    removeFromMistakeBook(id);
    setEntries(getMistakeBook());
    toast.success('Removed from Mistake Book');
  };

  const handleMarkMastered = (id: string) => {
    updateMistakeBookEntry(id, { mastered: true });
    setEntries(getMistakeBook());
    toast.success('Marked as mastered!');
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      toast.error('Please enter the question text');
      return;
    }

    const question: Question = {
      id: generateId(),
      questionNumber: entries.length + 1,
      subject: newQuestion.subject,
      chapter: newQuestion.chapter || 'General',
      question: newQuestion.question,
      options: newQuestion.options,
      correctAnswer: newQuestion.correctAnswer || null,
      type: 'MCQ',
      level: 'JEE',
    };

    const entry: MistakeBookEntry = {
      id: generateId(),
      questionId: question.id,
      testId: 'manual-entry',
      testName: 'Manual Entry',
      addedAt: new Date().toISOString(),
      question,
      selectedAnswer: newQuestion.selectedAnswer || null,
      correctAnswer: newQuestion.correctAnswer || null,
      mistakeTypes: newQuestion.mistakeTypes,
      notes: newQuestion.notes,
      reattemptCount: 0,
      mastered: false,
    };

    addToMistakeBook(entry);
    setEntries(getMistakeBook());
    setIsAddDialogOpen(false);
    setNewQuestion({
      subject: 'Physics',
      chapter: '',
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: '',
      selectedAnswer: '',
      mistakeTypes: [],
      notes: '',
    });
    toast.success('Question added to Mistake Book');
  };

  const toggleMistakeType = (type: MistakeType) => {
    setNewQuestion((prev) => ({
      ...prev,
      mistakeTypes: prev.mistakeTypes.includes(type)
        ? prev.mistakeTypes.filter((t) => t !== type)
        : [...prev.mistakeTypes, type],
    }));
  };

  return (
    <MainLayout>
      <PageHeader title="Mistake Book" description={`${entries.length} questions for revision`}>
        <div className="flex flex-wrap gap-2">
          <Select
            value={filterSubject}
            onValueChange={(v) => setFilterSubject(v as Subject | 'All')}
          >
            <SelectTrigger className="w-28 md:w-32">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Subjects</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="Maths">Maths</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterMistakeType}
            onValueChange={(v) => setFilterMistakeType(v as MistakeType | 'All')}
          >
            <SelectTrigger className="w-28 md:w-40">
              <SelectValue placeholder="Mistake Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              {mistakeTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getMistakeTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Question</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Question to Mistake Book</DialogTitle>
                <DialogDescription>
                  Manually add a question you want to track and revise
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select
                      value={newQuestion.subject}
                      onValueChange={(v) =>
                        setNewQuestion((prev) => ({ ...prev, subject: v as Subject }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Maths">Maths</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Chapter</Label>
                    <Input
                      value={newQuestion.chapter}
                      onChange={(e) =>
                        setNewQuestion((prev) => ({ ...prev, chapter: e.target.value }))
                      }
                      placeholder="e.g., Mechanics"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={newQuestion.question}
                    onChange={(e) =>
                      setNewQuestion((prev) => ({ ...prev, question: e.target.value }))
                    }
                    placeholder="Enter the question text..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div key={opt} className="space-y-1">
                      <Label className="text-xs">Option {opt}</Label>
                      <Input
                        value={newQuestion.options[opt]}
                        onChange={(e) =>
                          setNewQuestion((prev) => ({
                            ...prev,
                            options: { ...prev.options, [opt]: e.target.value },
                          }))
                        }
                        placeholder={`Option ${opt}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Select
                      value={newQuestion.correctAnswer}
                      onValueChange={(v) =>
                        setNewQuestion((prev) => ({ ...prev, correctAnswer: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Your Answer</Label>
                    <Select
                      value={newQuestion.selectedAnswer}
                      onValueChange={(v) =>
                        setNewQuestion((prev) => ({ ...prev, selectedAnswer: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mistake Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {mistakeTypes.map((type) => (
                      <Badge
                        key={type}
                        variant={newQuestion.mistakeTypes.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleMistakeType(type)}
                      >
                        {getMistakeTypeLabel(type)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newQuestion.notes}
                    onChange={(e) =>
                      setNewQuestion((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Add your notes about this mistake..."
                    className="min-h-[60px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddQuestion}>Add to Mistake Book</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {filteredEntries.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Mistakes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Wrong questions will appear here for revision, or add them manually
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question Manually
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Card
              key={entry.id}
              className={cn(entry.mastered && 'opacity-60 border-correct/50')}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`badge-${entry.question.subject.toLowerCase()}`}
                    >
                      {entry.question.subject}
                    </Badge>
                    <span className="text-xs md:text-sm text-muted-foreground">
                      {entry.question.chapter}
                    </span>
                    {entry.mastered && <Badge className="bg-correct">Mastered</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {!entry.mastered && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkMastered(entry.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-correct" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(entry.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm mb-3 line-clamp-3">{entry.question.question}</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex flex-wrap gap-1">
                    {entry.mistakeTypes.map((mt) => (
                      <Badge key={mt} variant="secondary" className="text-xs">
                        {getMistakeTypeLabel(mt)}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">From: {entry.testName}</span>
                </div>
                {entry.notes && (
                  <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                    {entry.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
