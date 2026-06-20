import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { saveTest, generateId, saveTestPdfPageImages } from '@/lib/storage';
import { Test, Question, Subject } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { renderPDFPagesToImages, fileToBase64, PDFPageImage, autoCropQuestions } from '@/lib/pdf-cropper';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { PDFCropTool } from '@/components/exam/PDFCropTool';
import { Upload, FileText, Loader2, Sparkles, AlertCircle, CheckCircle, Image, ZoomIn, Crop, RefreshCw, Share2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestCreationGate } from '@/components/exam/TestCreationGate';

import { fetchQuotaInfo, logTestCreation, QuotaInfo } from '@/lib/app-settings';

function CreateTestInner() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [testName, setTestName] = useState('');
  const [duration, setDuration] = useState(180);
  const [positiveMarking, setPositiveMarking] = useState(4);
  const [negativeMarking, setNegativeMarking] = useState(1);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [conversionMode, setConversionMode] = useState<'ai_full' | 'manual_crop' | 'auto_slice' | 'ai_hybrid'>('ai_full');
  const [step, setStep] = useState<'upload' | 'configure' | 'review'>('upload');
  const [extractionStats, setExtractionStats] = useState<{
    totalExtracted: number;
    subjectCounts: Record<string, number>;
    examTitle?: string;
  } | null>(null);
  const [pdfPageImages, setPdfPageImages] = useState<PDFPageImage[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showPageViewer, setShowPageViewer] = useState(false);
  const [showCropTool, setShowCropTool] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [extractionTime, setExtractionTime] = useState(0);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  React.useEffect(() => { fetchQuotaInfo().then(setQuota); }, []);



  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsProcessing(true);
    toast.info('Processing PDF...');
    setPdfFile(file);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `[Page ${i}]\n${pageText}\n\n`;
      }

      setPdfText(fullText);
      setTestName(file.name.replace('.pdf', ''));

      toast.info('Rendering pages for preview & cropping...');
      const pageImages = await renderPDFPagesToImages(arrayBuffer, 1.5);
      setPdfPageImages(pageImages);

      toast.success(`PDF processed: ${pdf.numPages} pages`);
      setStep('configure');
    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error('Failed to process PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  
  const extractQuestions = useCallback(async () => {
    setIsProcessing(true);
    setExtractionFailed(false);
    const startTime = Date.now();

    try {
      if (conversionMode === 'manual_crop' || conversionMode === 'ai_hybrid') {
        setShowCropTool(true);
        setIsProcessing(false);
        return;
      }

      if (conversionMode === 'auto_slice') {
        if (!pdfFile) throw new Error("No PDF file");
        const arrayBuffer = await pdfFile.arrayBuffer();
        const autoCrops = await autoCropQuestions(arrayBuffer, 3, 2);
        const newQuestions = autoCrops.map((crop, i) => ({
          id: generateId(),
          questionNumber: i + 1,
          subject: 'Physics',
          chapter: 'General',
          question: '',
          options: { A: '', B: '', C: '', D: '' },
          correctAnswer: null,
          type: 'MCQ',
          level: 'Medium',
          imageUrl: crop.imageDataUrl,
          croppedImageUrl: crop.imageDataUrl,
          hasDiagram: true
        }));
        setExtractedQuestions(newQuestions as any);
        setStep('review');
        setIsProcessing(false);
        return;
      }

      // AI Full Extraction
      const latestQuota = await fetchQuotaInfo();
      setQuota(latestQuota);
      if (latestQuota.exceeded) {
        toast.error(`Quota reached: ${latestQuota.dailyUsed}/${latestQuota.dailyLimit} today`);
        setIsProcessing(false);
        return;
      }

      toast.info('Extracting questions with AI (20-40 seconds)...');
      let requestBody: any = { pdfText };
      if (pdfFile) {
        const base64Data = await fileToBase64(pdfFile);
        requestBody.pdfBase64 = base64Data;
      }

      let data: any = null;
      let lastErr: any = null;

      for (let retry = 0; retry < 2; retry++) {
        if (retry > 0) {
          toast.info(`Retrying extraction (attempt ${retry + 1})...`);
          await new Promise(r => setTimeout(r, 2000));
        }

        const response = await fetch('https://rhin867-biro-tests-api.hf.space/extract-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        if (result.error) {
          if (result.retryable) {
            lastErr = new Error(result.error);
            continue;
          }
          throw new Error(result.error);
        }
        data = result;
        break;
      }

      if (!data) throw lastErr || new Error('Extraction failed');

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setExtractionTime(elapsed);

      const questions = (data.questions || []).map((q: any, index: number) => {
        const options = Array.isArray(q.options)
          ? { A: q.options[0] || '', B: q.options[1] || '', C: q.options[2] || '', D: q.options[3] || '' }
          : { A: q.options?.A || '', B: q.options?.B || '', C: q.options?.C || '', D: q.options?.D || '' };
        return {
          id: generateId(),
          questionNumber: Number(q.questionNumber || index + 1),
          subject: ['Physics', 'Chemistry', 'Maths'].includes(q.subject) ? q.subject : 'Physics',
          chapter: q.chapter || 'General',
          question: q.question || '',
          options,
          correctAnswer: q.correctAnswer || null,
          type: 'MCQ',
          level: 'Medium'
        };
      });

      setExtractedQuestions(questions);
      setStep('review');

      toast.success(`Extracted ${questions.length} questions in ${elapsed}s`);
    } catch (error: any) {
      console.error('Extraction error:', error);
      setExtractionFailed(true);
      toast.error(error.message || 'Extraction failed. Click Retry or use Crop Tool.');
    } finally {
      setIsProcessing(false);
    }
  }, [pdfText, pdfFile]);

  const handleCreateTest = async () => {
    if (extractedQuestions.length === 0) {
      toast.error('No questions to create test');
      return;
    }

    // Server-side quota check
    try {
      const quota = await fetchQuotaInfo();
      if (quota.exceeded) {
        toast.error(
          `Quota reached: ${quota.dailyUsed}/${quota.dailyLimit} today, ${quota.monthlyUsed}/${quota.monthlyLimit} this month. Try again later.`
        );
        return;
      }

      const subjects: Subject[] = [...new Set(extractedQuestions.map((q) => q.subject))];
      const hasAnswerKey = extractedQuestions.some(q => q.correctAnswer);

      const testId = generateId();
      const test: Test = {
        id: testId,
        name: testName || 'Untitled Test',
        description: `Created from PDF with ${extractedQuestions.length} questions`,
        createdAt: new Date().toISOString(),
        duration,
        questions: extractedQuestions,
        subjects,
        totalMarks: extractedQuestions.length * positiveMarking,
        positiveMarking,
        negativeMarking,
        hasAnswerKey,
        // Do NOT embed PDF page images in the test — they blow past the 5 MB localStorage limit
        // and silently break saveTest, making the test never appear in My Tests.
        pdfPageImages: undefined,
      };

      try {
        saveTest(test);
        await saveTestPdfPageImages(test.id, pdfPageImages);
      } catch (e) {
        console.error('saveTest failed', e);
        toast.error('Could not save test locally (storage full). Try clearing old tests.');
        return;
      }

      // Quota already logged during extraction
      toast.success('Test saved successfully!');
      navigate(`/tests`);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save test: ' + (e.message || 'unknown'));
    }
  };

  const diagramQuestionCount = extractedQuestions.filter(q => q.hasDiagram).length;

  return (
    <MainLayout>
      <PageHeader
        title="Create Test"
        description="Upload a PDF to create a CBT test — no API key needed"
      />

      {/* Progress Steps */}
      <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8 overflow-x-auto pb-2">
        {['upload', 'configure', 'review'].map((s, i) => (
          <div key={s} className="flex items-center flex-shrink-0">
            <div className={cn(
              'flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full text-xs md:text-sm font-medium transition-all',
              step === s ? 'bg-primary text-primary-foreground' :
              i < ['upload', 'configure', 'review'].indexOf(step) ? 'bg-correct text-correct-foreground' :
              'bg-muted text-muted-foreground'
            )}>
              {i + 1}
            </div>
            <span className={cn('ml-1.5 md:ml-2 text-xs md:text-sm', step === s ? 'font-medium' : 'text-muted-foreground')}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 2 && <div className="w-6 md:w-12 h-0.5 bg-border mx-2 md:mx-4" />}
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Upload className="h-5 w-5 text-primary" />
                Upload PDF
              </CardTitle>
              <CardDescription>Upload a JEE-style question paper PDF</CardDescription>
            </CardHeader>
            <CardContent>
              <label htmlFor="pdf-upload" className={cn(
                'flex flex-col items-center justify-center h-40 md:h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all',
                isProcessing ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent'
              )}>
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 md:h-10 w-8 md:w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Processing PDF...</p>
                  </div>
                ) : (
                  <>
                    <FileText className="h-8 md:h-10 w-8 md:w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Click to upload PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">Any JEE/NEET question paper</p>
                  </>
                )}
                <input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={isProcessing} />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <FileText className="h-5 w-5 text-physics" />
                Manual Input
              </CardTitle>
              <CardDescription>Paste question text directly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your questions here..."
                value={pdfText}
                onChange={(e) => setPdfText(e.target.value)}
                className="min-h-[120px] md:min-h-[150px]"
              />
              <Button onClick={() => { if (pdfText.trim()) setStep('configure'); else toast.error('Enter text first'); }}
                variant="outline" className="w-full" disabled={!pdfText.trim()}>
                Use This Text
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configure Step */}
      {step === 'configure' && (
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Configure Test</CardTitle>
            <CardDescription>Set test parameters before AI extraction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testName">Test Name</Label>
              <Input id="testName" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g., JEE Main 2024 Paper 1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} max={300} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Correct (+)</Label>
                <Input type="number" value={positiveMarking} onChange={(e) => setPositiveMarking(Number(e.target.value))} min={1} max={10} />
              </div>
              <div className="space-y-2">
                <Label>Wrong (-)</Label>
                <Input type="number" value={negativeMarking} onChange={(e) => setNegativeMarking(Number(e.target.value))} min={0} max={10} />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm">AI will extract questions with LaTeX math, detect diagrams & subjects automatically</p>
            </div>

            {/* PDF Page Preview */}
            {pdfPageImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">PDF Preview ({pdfPageImages.length} pages)</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowPageViewer(true)}>
                    <ZoomIn className="h-4 w-4 mr-1" /> View Pages
                  </Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pdfPageImages.slice(0, 4).map((page) => (
                    <img key={page.pageNumber} src={page.imageDataUrl} alt={`Page ${page.pageNumber}`}
                      className="h-20 w-auto rounded border border-border cursor-pointer hover:ring-2 hover:ring-primary"
                      onClick={() => setShowPageViewer(true)} />
                  ))}
                  {pdfPageImages.length > 4 && (
                    <div className="h-20 w-16 flex items-center justify-center rounded border border-border bg-muted cursor-pointer hover:bg-accent"
                      onClick={() => setShowPageViewer(true)}>
                      <span className="text-xs text-muted-foreground">+{pdfPageImages.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Retry on failure */}
            {extractionFailed && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive flex-1">Extraction failed. Try again or use manual crop.</p>
                <Button variant="outline" size="sm" onClick={extractQuestions} disabled={isProcessing} className="gap-1">
                  <RefreshCw className="h-3 w-3" /> Retry
                </Button>
              </div>
            )}

            {pdfPageImages.length > 0 && (
              <Button variant="outline" onClick={() => setShowCropTool(true)} className="gap-2 w-full">
                <Crop className="h-4 w-4" /> Open Manual Crop Tool
              </Button>
            )}

            
            <div className="space-y-4 mb-6">
              <Label>Conversion Mode (Quota Saver)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${conversionMode === 'manual_crop' ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent'}`}
                  onClick={() => setConversionMode('manual_crop')}
                >
                  <p className="font-semibold text-sm">Mode 1: Manual Crop</p>
                  <p className="text-xs text-muted-foreground">Free & Infinite. Crop images manually.</p>
                </div>
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${conversionMode === 'auto_slice' ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent'}`}
                  onClick={() => setConversionMode('auto_slice')}
                >
                  <p className="font-semibold text-sm">Mode 2: Auto Slicer</p>
                  <p className="text-xs text-muted-foreground">Free & Infinite. Auto-cuts PDF into sections.</p>
                </div>
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${conversionMode === 'ai_full' ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent'}`}
                  onClick={() => setConversionMode('ai_full')}
                >
                  <p className="font-semibold text-sm">Mode 3: Full AI Extraction</p>
                  <p className="text-xs text-muted-foreground">Uses Quota. AI extracts text & LaTeX.</p>
                </div>
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${conversionMode === 'ai_hybrid' ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent'}`}
                  onClick={() => setConversionMode('ai_hybrid')}
                >
                  <p className="font-semibold text-sm">Mode 4: AI + Manual Hybrid</p>
                  <p className="text-xs text-muted-foreground">Uses Quota per crop. Crop then extract text.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={extractQuestions} disabled={isProcessing} className="flex-1">
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Extract Questions</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <div className="space-y-4 md:space-y-6">
          {quota && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
              quota.exceeded
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : quota.dailyRemaining <= 1
                  ? 'bg-review/10 border-review/30'
                  : 'bg-primary/10 border-primary/20'
            )}>
              <AlertCircle className="h-4 w-4" />
              <span>
                Test creation quota — Today: {quota.dailyUsed}/{quota.dailyLimit} ·
                This month: {quota.monthlyUsed}/{quota.monthlyLimit}
                {quota.exceeded && ' · LIMIT REACHED'}
              </span>
            </div>
          )}
          {extractionStats && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-correct/10 border border-correct/20">
                <CheckCircle className="h-4 w-4 text-correct" />
                <span className="text-sm font-medium">{extractionStats.totalExtracted} Questions in {extractionTime}s</span>
              </div>
              {diagramQuestionCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-review/10 border border-review/20">
                  <Image className="h-4 w-4 text-review" />
                  <span className="text-sm font-medium">{diagramQuestionCount} with Diagrams</span>
                </div>
              )}
              {Object.entries(extractionStats.subjectCounts).map(([subject, count]) => (
                <div key={subject} className={cn('px-3 py-2 rounded-lg text-sm', `badge-${subject.toLowerCase()}`)}>
                  {subject}: {count as number}
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Review Extracted Questions</CardTitle>
              <CardDescription>{extractedQuestions.length} questions • Verify before creating test</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4 max-h-[350px] md:max-h-[400px] overflow-y-auto pr-2">
                {extractedQuestions.map((q, index) => (
                  <div key={q.id} className="p-3 md:p-4 rounded-lg border border-border bg-card/50">
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-xs font-medium text-primary">{index + 1}</span>
                        <span className={`badge-${q.subject.toLowerCase()} px-2 py-0.5 rounded text-xs`}>{q.subject}</span>
                        <span className="text-xs text-muted-foreground">{q.chapter}</span>
                        {q.hasDiagram && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-review/10 text-review border border-review/20">
                            <Image className="h-3 w-3" /> Diagram
                          </span>
                        )}
                      </div>
                      {q.correctAnswer && <span className="text-xs text-muted-foreground italic">✓ Answer: {q.correctAnswer}</span>}
                    </div>
                      <div className="text-sm mb-2 line-clamp-3">
                        <LatexRenderer content={q.question} />
                      </div>
                      <div className="mt-2 mb-2">
                        {q.croppedImageUrl ? (
                          <img src={q.croppedImageUrl} className="max-h-32 object-contain rounded border border-border" />
                        ) : q.hasDiagram && q.pdfPageNumber && pdfPageImages.find(p => p.pageNumber === q.pdfPageNumber) ? (
                          <div className="p-2 rounded bg-muted/50 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Uncropped diagram from Page {q.pdfPageNumber}:</p>
                            <img src={pdfPageImages.find(p => p.pageNumber === q.pdfPageNumber)!.imageDataUrl} className="max-h-24 object-contain rounded opacity-80" />
                          </div>
                        ) : null}
                      </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {Object.entries(q.options).map(([key, value]) => (
                        <div key={key} className="p-1.5 rounded">
                          ({key}) {value ? <LatexRenderer content={value} /> : <span className="italic">Empty</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {extractedQuestions.some(q => q.correctAnswer) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-correct/10 border border-correct/20">
              <CheckCircle className="h-5 w-5 text-correct flex-shrink-0" />
              <p className="text-sm text-correct">✅ Answer key detected from PDF!</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('configure')}>Back</Button>
            <Button onClick={handleCreateTest} className="flex-1 glow-primary">
              Create Test ({extractedQuestions.length} Questions)
            </Button>
          </div>
        </div>
      )}

      {/* PDF Page Viewer Dialog */}
      <Dialog open={showPageViewer} onOpenChange={setShowPageViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>PDF Pages</DialogTitle></DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4">
              {pdfPageImages.map((page) => (
                <div key={page.pageNumber} className="space-y-2">
                  <p className="text-sm font-medium">Page {page.pageNumber}</p>
                  <img src={page.imageDataUrl} alt={`Page ${page.pageNumber}`} className="w-full rounded-lg border border-border" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Manual Crop Tool */}
      <PDFCropTool
        open={showCropTool}
        onOpenChange={setShowCropTool}
        pages={pdfPageImages}
        onCroppedQuestions={async (crops) => {
          if (conversionMode === 'manual_crop') {
            const newQuestions = crops.map((crop, i) => ({
              id: generateId(),
              questionNumber: i + 1,
              subject: 'Physics',
              chapter: 'General',
              question: '',
              options: { A: '', B: '', C: '', D: '' },
              correctAnswer: null,
              type: 'MCQ',
              level: 'Medium',
              imageUrl: crop.dataUrl,
              croppedImageUrl: crop.dataUrl,
              hasDiagram: true
            }));
            setExtractedQuestions(newQuestions as any);
            setStep('review');
            toast.success(`${crops.length} questions created manually!`);
          } else if (conversionMode === 'ai_hybrid') {
            setIsProcessing(true);
            toast.info('Extracting text from crops using AI...');
            try {
              const newQuestions = [];
              for (let i = 0; i < crops.length; i++) {
                 const crop = crops[i];
                 const res = await fetch('https://rhin867-biro-tests-api.hf.space/extract-crop', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ imageBase64: crop.dataUrl })
                 });
                 const data = await res.json();
                 if (data.question) {
                    const q = data.question;
                    newQuestions.push({
                      id: generateId(),
                      questionNumber: i + 1,
                      subject: 'Physics',
                      chapter: 'General',
                      question: q.question || '',
                      options: {
                        A: q.options?.[0] || '', B: q.options?.[1] || '',
                        C: q.options?.[2] || '', D: q.options?.[3] || ''
                      },
                      correctAnswer: q.correctAnswer || null,
                      type: 'MCQ',
                      level: 'Medium',
                      croppedImageUrl: crop.dataUrl,
                      hasDiagram: true
                    });
                 }
              }
              setExtractedQuestions(newQuestions as any);
              setStep('review');
              toast.success(`${newQuestions.length} questions extracted via Hybrid AI!`);
            } catch (err) {
               toast.error('Hybrid AI extraction failed');
            } finally {
               setIsProcessing(false);
            }
          } else {
            const targets = extractedQuestions
              .map((q, index) => ({ q, index }))
              .filter(({ q }) => q.hasDiagram || q.pdfPageNumber)
              .sort((a, b) => (a.q.pdfPageNumber || 999) - (b.q.pdfPageNumber || 999) || a.q.questionNumber - b.q.questionNumber);
            setExtractedQuestions(prev => prev.map((q) => {
              const targetIndex = targets.findIndex(t => t.q.id === q.id);
              const crop = targetIndex >= 0 ? crops[targetIndex] : undefined;
              return crop ? { ...q, croppedImageUrl: crop.dataUrl, hasDiagram: true, pdfPageNumber: crop.pageNumber } : q;
            }));
            toast.success(`${crops.length} regions cropped and attached to diagram questions.`);
          }
        }}
      />
    </MainLayout>
  );
}

export default function CreateTest() {
  return (
    <TestCreationGate>
      <CreateTestInner />
    </TestCreationGate>
  );
}
