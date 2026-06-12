import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PenLine, Plus, X, Check, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestLearningsProps {
  attemptId: string;
  maxLearnings?: number;
}

const LEARNINGS_KEY = 'jee_cbt_learnings';

function getLearnings(attemptId: string): string[] {
  try {
    const all = JSON.parse(localStorage.getItem(LEARNINGS_KEY) || '{}');
    return all[attemptId] || [];
  } catch { return []; }
}

function saveLearnings(attemptId: string, learnings: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem(LEARNINGS_KEY) || '{}');
    all[attemptId] = learnings;
    localStorage.setItem(LEARNINGS_KEY, JSON.stringify(all));
  } catch {}
}

export function TestLearnings({ attemptId, maxLearnings = 10 }: TestLearningsProps) {
  const [learnings, setLearnings] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    setLearnings(getLearnings(attemptId));
  }, [attemptId]);

  const save = (updated: string[]) => {
    setLearnings(updated);
    saveLearnings(attemptId, updated);
  };

  const handleAdd = () => {
    if (!newValue.trim()) return;
    const updated = [...learnings, newValue.trim()];
    save(updated);
    setNewValue('');
    setIsAdding(false);
  };

  const handleEdit = (index: number) => {
    if (!editValue.trim()) return;
    const updated = [...learnings];
    updated[index] = editValue.trim();
    save(updated);
    setEditingIndex(null);
    setEditValue('');
  };

  const handleDelete = (index: number) => {
    save(learnings.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-review" />
          Note Down Your Learnings
        </CardTitle>
        <CardDescription>
          Add up to {maxLearnings} things you learned from this test
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {learnings.map((learning, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border group">
            <span className="text-sm font-bold text-primary mt-0.5">{i + 1}.</span>
            {editingIndex === i ? (
              <div className="flex-1 flex gap-2">
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEdit(i)}
                  autoFocus
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(i)}>
                  <Check className="h-4 w-4 text-correct" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingIndex(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <p className="flex-1 text-sm">{learning}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { setEditingIndex(i); setEditValue(learning); }}>
                    <PenLine className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-incorrect"
                    onClick={() => handleDelete(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Empty slots */}
        {learnings.length < maxLearnings && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 w-full p-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Click to add your learnings
          </button>
        )}

        {isAdding && (
          <div className="flex gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Input
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="What did you learn from this test?"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
              className="flex-1"
            />
            <Button size="sm" onClick={handleAdd} disabled={!newValue.trim()}>
              <Check className="h-4 w-4 mr-1" /> Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewValue(''); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {learnings.length === 0 && !isAdding && (
          <p className="text-center text-muted-foreground text-sm py-4">
            No learnings noted yet. Reflect on your test performance!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
