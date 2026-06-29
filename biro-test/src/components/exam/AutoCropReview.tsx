import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  autoCropPDF,
  mergeImagesVertical,
  CropResult,
} from '@/lib/pdf-cropper';
import { PDFCropTool } from '@/components/exam/PDFCropTool';
import { Question, Subject, QuestionType } from '@/types/exam';import { generateId } from '@/lib/storage';
import {
  Crop,
  Loader2,
  Trash2,
  GitMerge,
  CheckCircle,
  Plus,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PDFPageImage } from '@/lib/pdf-cropper';

// ─────────────────────────────────────────────────────────────────────────────

interface ReviewItem extends CropResult {
  subject: Subject;
  qtype: QuestionType;
}


interface AutoCropReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfFile: File;
  pdfPages: PDFPageImage[];        // pre-rendered page images (for manual tool)
  onComplete: (questions: Question[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Maths'];
const QTYPES: QuestionType[] = ['MCQ', 'Numerical', 'MSQ'];

const SUBJECT_COLOR: Record<Subject, string> = {
  Physics: 'bg-blue-100 text-blue-800 border-blue-300',
  Chemistry: 'bg-green-100 text-green-800 border-green-300',
  Maths: 'bg-purple-100 text-purple-800 border-purple-300',
};

// ─────────────────────────────────────────────────────────────────────────────

export function AutoCropReview({
  open,
  onOpenChange,
  pdfFile,
  pdfPages,
  onComplete,
}: AutoCropReviewProps) {
  const [phase, setPhase] = useState<'options' | 'running' | 'review'>('options');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [bulkSubject, setBulkSubject] = useState<Subject>('Physics');
  const cancelRef = useRef(false);

  // ── Auto-crop ──────────────────────────────────────────────────────────────

  const runAutoCrop = useCallback(async () => {
    setPhase('running');
    setProgress(0);
    setProgressMsg('Starting…');
    cancelRef.current = false;

    try {
      const crops = await autoCropPDF(pdfFile, (pct, msg) => {
        setProgress(pct);
        setProgressMsg(msg);
      });

      if (cancelRef.current) return;

      // Default subject assignment: divide evenly by thirds (Physics / Chemistry / Maths)
      // User can reassign in review
      const total = crops.length;
      const third = Math.ceil(total / 3);

      const reviewed: ReviewItem[] = crops.map((c, i) => ({
        ...c,
        subject: i < third ? 'Physics' : i < third * 2 ? 'Chemistry' : 'Maths',
        qtype: 'MCQ',
      }));

      setItems(reviewed);
      setPhase('review');

      if (reviewed.length === 0) {
        toast.warning('No questions detected. Try Manual Crop instead.');
        setPhase('options');
      } else {
        toast.success(`${reviewed.length} questions detected — review below`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Auto-crop failed. Try Manual Crop.');
      setPhase('options');
    }
  }, [pdfFile]);

  // ── Item mutations ─────────────────────────────────────────────────────────

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<ReviewItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const mergeWithNext = useCallback(async (index: number) => {
    if (index >= items.length - 1) return;
    const top = items[index];
    const bot = items[index + 1];
    const merged = await mergeImagesVertical(top.imageDataUrl, bot.imageDataUrl);
    setItems(prev => {
      const next = [...prev];
      next.splice(index, 2, { ...top, imageDataUrl: merged });
      return next;
    });
  }, [items]);

  const setBulkSubjectAll = useCallback(() => {
    setItems(prev => prev.map(item => ({ ...item, subject: bulkSubject })));
    toast.success(`All questions set to ${bulkSubject}`);
  }, [bulkSubject]);

  // ── Accept manual crops ────────────────────────────────────────────────────

  const handleManualCrops = useCallback((manualCrops: { dataUrl: string; pageNumber: number; index: number }[]) => {
    const newItems: ReviewItem[] = manualCrops.map((c, i) => ({
      id: `manual-${Date.now()}-${i}`,
      questionIndex: items.length + i,
      pageNumber: c.pageNumber,
      imageDataUrl: c.dataUrl,
      subject: 'Physics',
      qtype: 'MCQ',
    }));
    setItems(prev => [...prev, ...newItems]);
    toast.success(`${newItems.length} manual crops added`);
  }, [items.length]);

  // ── Finish ─────────────────────────────────────────────────────────────────

  const handleDone = useCallback(() => {
    if (items.length === 0) {
      toast.error('No questions to create');
      return;
    }
    const questions: Question[] = items.map((item, i) => ({
      id: generateId(),
      questionNumber: i + 1,
      subject: item.subject,
      chapter: 'General',
      question: '',          // image-crop mode — no text
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: null,
      type: item.qtype as QuestionType,
      level: 'JEE',
      croppedImageUrl: item.imageDataUrl,
      hasDiagram: true,
      pdfPageNumber: item.pageNumber,
    } as Question));

    onComplete(questions);
    onOpenChange(false);
  }, [items, onComplete, onOpenChange]);

  // ── Reset on close ─────────────────────────────────────────────────────────

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      cancelRef.current = true;
      setPhase('options');
      setItems([]);
      setProgress(0);
    }
    onOpenChange(v);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[98vw] w-full sm:max-w-4xl max-h-[96vh] p-3 sm:p-5 flex flex-col gap-0">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Crop className="h-5 w-5 text-primary shrink-0" />
              {phase === 'options' && 'Image Crop Mode — Choose Method'}
              {phase === 'running' && 'Auto-Cropping…'}
              {phase === 'review' && `Review Crops (${items.length} questions)`}
            </DialogTitle>
          </DialogHeader>

          {/* ── Phase: Options ──────────────────────────────────────────────── */}
          {phase === 'options' && (
            <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Both methods store questions as <strong>images</strong> — zero AI credits, works on any PDF.
              </p>

              <button
                onClick={runAutoCrop}
                className="flex items-start gap-3 p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 text-left transition-colors"
              >
                <Zap className="h-6 w-6 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-base">Auto Crop</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically detects question boundaries using pixel analysis.
                    Works on scanned &amp; digital PDFs. ~70-90% accurate — you review
                    and fix after.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowManual(true)}
                className="flex items-start gap-3 p-4 rounded-xl border border-border hover:bg-accent text-left transition-colors"
              >
                <Crop className="h-6 w-6 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-base">Manual Crop</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Draw boxes around each question yourself. 100% accurate. Takes
                    10-15 min for a 75-question paper.
                  </p>
                </div>
              </button>

              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}

          {/* ── Phase: Running ──────────────────────────────────────────────── */}
          {phase === 'running' && (
            <div className="flex flex-col items-center gap-6 py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="w-full max-w-sm space-y-2">
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">{progressMsg}</p>
                <p className="text-xs text-center text-muted-foreground">{progress}%</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { cancelRef.current = true; setPhase('options'); }}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* ── Phase: Review ───────────────────────────────────────────────── */}
          {phase === 'review' && (
            <div className="flex flex-col gap-3 min-h-0 flex-1">
              {/* Bulk controls */}
              <div className="flex flex-wrap gap-2 items-center bg-muted/40 rounded-lg p-2">
                <span className="text-xs font-medium text-muted-foreground">Set all as:</span>
                <div className="flex gap-1">
                  {SUBJECTS.map(s => (
                    <button
                      key={s}
                      onClick={() => setBulkSubject(s)}
                      className={cn(
                        'px-2 py-1 rounded text-xs border font-medium transition-colors',
                        bulkSubject === s ? SUBJECT_COLOR[s] : 'bg-background border-border text-foreground hover:bg-accent'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={setBulkSubjectAll}>
                  Apply to All
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowManual(true)}
                  >
                    <Plus className="h-3 w-3" /> Add Manual
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground px-1">
                Tip: Delete unwanted crops (instructions, blank pages). Tap subject/type to change per question.
              </p>

              {/* Crop grid */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex flex-col">
                      {/* Card */}
                      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                        {/* Image */}
                        <div className="relative bg-white">
                          <img
                            src={item.imageDataUrl}
                            alt={`Q${idx + 1}`}
                            className="w-full object-contain max-h-36"
                          />
                          {/* Q number badge */}
                          <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Q{idx + 1} · P{item.pageNumber}
                          </span>
                          {/* Delete */}
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded p-1 opacity-80 hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Controls */}
                        <div className="p-1.5 flex flex-col gap-1">
                          {/* Subject */}
                          <div className="flex gap-1">
                            {SUBJECTS.map(s => (
                              <button
                                key={s}
                                onClick={() => updateItem(item.id, { subject: s })}
                                className={cn(
                                  'flex-1 text-[10px] py-0.5 rounded border font-medium transition-colors',
                                  item.subject === s ? SUBJECT_COLOR[s] : 'bg-muted border-transparent text-muted-foreground'
                                )}
                              >
                                {s === 'Physics' ? 'Phy' : s === 'Chemistry' ? 'Che' : 'Mat'}
                              </button>
                            ))}
                          </div>
                          {/* Type */}
                          <div className="flex gap-1">
                            {QTYPES.map(t => (
                              <button
                                key={t}
                                onClick={() => updateItem(item.id, { qtype: t })}
                                className={cn(
                                  'flex-1 text-[10px] py-0.5 rounded border font-medium transition-colors',
                                  item.qtype === t
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-muted border-transparent text-muted-foreground'
                                )}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Merge-with-next */}
                      {idx < items.length - 1 && (
                        <button
                          onClick={() => mergeWithNext(idx)}
                          className="mx-auto mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-dashed rounded px-2 py-0.5 transition-colors"
                          title="Merge this crop with the next one (if question spans 2 crops)"
                        >
                          <GitMerge className="h-3 w-3" /> merge ↓
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" className="gap-1" onClick={() => setPhase('options')}>
                  ← Back
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={items.length === 0}
                  onClick={handleDone}
                >
                  <CheckCircle className="h-4 w-4" />
                  Create Test ({items.length} Questions)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual crop tool (reuses existing PDFCropTool) */}
      <PDFCropTool
        open={showManual}
        onOpenChange={setShowManual}
        pages={pdfPages}
        onCroppedQuestions={(crops) => {
          handleManualCrops(crops);
          if (phase === 'options') setPhase('review');
        }}
      />
    </>
  );
}
