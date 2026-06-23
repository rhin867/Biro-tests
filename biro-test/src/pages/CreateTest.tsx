
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, RefreshCw, Settings2, Crop, Eye, Trash2, Edit2, Key, Type, ImageIcon } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PDFCropTool } from '@/components/exam/PDFCropTool';
import { useAuth } from '@/hooks/useAuth';
import { TestCreationGate } from '@/components/auth/TestCreationGate';
import {
  extractTextFromPDF,
  renderPDFPagesToImages,
  autoCropQuestions,
  PDFPageImage
} from '@/lib/pdf-cropper';
import { generateId, saveTest, saveTestPdfPageImages } from '@/lib/storage';
import { Question, Subject, QuestionType } from '@/types/exam';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Conversion modes
type ConversionMode = 'auto_crop' | 'manual_crop';

function CreateTestInner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<'upload' | 'configure' | 'processing' | 'review'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionMode, setConversionMode] = useState<ConversionMode>('auto_crop');
  
  // Test configuration
  const [testConfig, setTestConfig] = useState({
    title: '',
    duration: 180,
    totalMarks: 300,
    examType: 'JEE Main' as 'JEE Main' | 'JEE Advanced' | 'NEET',
    visibility: 'public' as 'public' | 'private',
    autoNegativeMarking: true
  });

  // PDF processing state
  const [pdfPageImages, setPdfPageImages] = useState<PDFPageImage[]>([]);
  const [showCropTool, setShowCropTool] = useState(false);
  const [showPageViewer, setShowPageViewer] = useState(false);
  
  // Final extracted questions
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  
  // Editing state in Review step
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Recrop specific question states
  const [recropQuestion, setRecropQuestion] = useState<Question | null>(null);
  const [recropRegion, setRecropRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isRecropDrawing, setIsRecropDrawing] = useState(false);
  const [recropStart, setRecropStart] = useState<{ x: number; y: number } | null>(null);
  const [detectedAnswerKey, setDetectedAnswerKey] = useState<Record<string, string>>({});

  const recropWrapperRef = useRef<HTMLDivElement>(null);
  const recropImgRef = useRef<HTMLImageElement>(null);

  const autoDetectAnswers = (text: string): Record<string, string> => {
    const answers: Record<string, string> = {};
    const patterns = [
      /(?:Question|Q)?\s*(\d+)\s*[-.:)\]\s]+\(?\s*([A-D])\s*\)?/gi,
      /(\d+)\s*[-.:)\]\s]+\(?\s*([A-D])\s*\)?/gi
    ];

    const lines = text.split('\n');
    let answerKeySection = '';
    let foundSection = false;

    for (const line of lines) {
      if (/Answer\s*Key|Key\s*Sheet|Answers/i.test(line)) {
        foundSection = true;
      }
      if (foundSection) {
        answerKeySection += ' ' + line;
      }
    }

    const sourceText = foundSection ? answerKeySection : text;
    
    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(sourceText)) !== null) {
        const qNum = match[1];
        const ans = match[2].toUpperCase();
        if (!answers[qNum]) {
          answers[qNum] = ans;
        }
      }
      if (Object.keys(answers).length >= 5) break;
    }

    return answers;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Please upload a valid PDF file');
      return;
    }
    setFile(selectedFile);
    setTestConfig(prev => ({ ...prev, title: selectedFile.name.replace('.pdf', '') }));
    setStep('configure');

    try {
      setIsProcessing(true);
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pages = await renderPDFPagesToImages(arrayBuffer);
      setPdfPageImages(pages);

      // Extract text to auto-detect answer keys
      const text = await extractTextFromPDF(arrayBuffer);
      const answers = autoDetectAnswers(text);
      if (Object.keys(answers).length > 0) {
        setDetectedAnswerKey(answers);
        toast.success(`Auto-detected ${Object.keys(answers).length} answers in this PDF! They will be automatically attached.`);
      }

      setIsProcessing(false);
      toast.success(`PDF loaded successfully (${pages.length} pages)`);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to parse PDF. Please try another file.');
      setIsProcessing(false);
      setStep('upload');
      setFile(null);
    }
  };

  const startExtraction = async () => {
    if (!file) return;
    
    if (conversionMode === 'manual_crop') {
      // Open manual crop tool immediately
      setShowCropTool(true);
      return;
    }

    // Auto Crop mode (Pixel-based)
    setIsProcessing(true);
    setStep('processing');
    
    try {
      toast.info('Auto-cropping questions from PDF using pixel analysis...');
      const arrayBuffer = await file.arrayBuffer();
      // Uses the new whitespace detection algorithm
      const crops = await autoCropQuestions(arrayBuffer, 3);
      
      const newQuestions: Question[] = crops.map((crop, i) => {
        const qNum = i + 1;
        const ans = detectedAnswerKey[String(qNum)] || null;
        return {
          id: generateId(),
          questionNumber: qNum,
          subject: 'Physics',
          chapter: 'General',
          question: '',
          options: { A: '', B: '', C: '', D: '' },
          correctAnswer: ans,
          type: 'MCQ',
          level: 'Medium',
          imageUrl: crop.imageDataUrl,
          croppedImageUrl: crop.imageDataUrl,
          hasDiagram: true,
          pdfPageNumber: crop.pageNumber
        };
      });
      
      setExtractedQuestions(newQuestions);
      setStep('review');
      toast.success(`Auto-cropped ${crops.length} questions successfully!`);
    } catch (error) {
      console.error('Auto-crop error:', error);
      toast.error('Auto-cropping failed.');
      setStep('configure');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTest = async () => {
    if (extractedQuestions.length === 0) {
      toast.error('Cannot create an empty test');
      return;
    }

    const testId = generateId();
    
    const defaultNegative = testConfig.autoNegativeMarking ? 
      (testConfig.examType === 'JEE Main' ? 1 : 
       testConfig.examType === 'NEET' ? 1 : 2) : 0;
       
    const defaultPositive = testConfig.examType === 'JEE Main' || testConfig.examType === 'NEET' ? 4 : 3;

    const finalQuestions = extractedQuestions.map(q => ({
      ...q,
      positiveMarks: q.positiveMarks || defaultPositive,
      negativeMarks: q.negativeMarks || defaultNegative
    }));

    const newTest = {
      id: testId,
      name: testConfig.title || 'Untitled Test',
      duration: testConfig.duration,
      totalMarks: testConfig.totalMarks,
      examType: testConfig.examType,
      visibility: testConfig.visibility,
      status: 'published' as const,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || 'anonymous',
      questions: finalQuestions,
    };

    saveTest(newTest as any);
    // Save PDF pages to IndexedDB for viewing during test
    if (pdfPageImages && pdfPageImages.length > 0) {
       await saveTestPdfPageImages(testId, pdfPageImages);
    }

    toast.success('Test created successfully!');
    const shareableLink = `${window.location.origin}/test/${testId}`;
    navigator.clipboard.writeText(shareableLink);
    toast.success(`Shareable link copied to clipboard!`);
    
    navigate('/admin/dashboard');
  };

  // Review step editing handlers
  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setExtractedQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    setExtractedQuestions(prev => prev.filter(q => q.id !== id));
  };


  const handleTextExtraction = async (text: string) => {
    setIsProcessing(true);
    try {
      // 1. Try pure regex parsing
      // Assume simple format: "Q1. What is X? A) Y B) Z"
      const questions = [];
      const blocks = text.split(/(?=Q?\d+[.)])/gi).filter(b => b.trim().length > 10);
      
      if (blocks.length > 0) {
        let qNum = 1;
        for (const block of blocks) {
          const qMatch = block.split(/(?=A[\.\)]\s|B[\.\)]\s|C[\.\)]\s|D[\.\)]\s)/i);
          const qText = qMatch[0].replace(/^Q?\d+[\.\)]\s*/i, '').trim();
          
          let a='', b='', c='', d='';
          for (let i=1; i<qMatch.length; i++) {
            const opt = qMatch[i].trim();
            if (/^A[\.\)]/i.test(opt)) a = opt.substring(2).trim();
            if (/^B[\.\)]/i.test(opt)) b = opt.substring(2).trim();
            if (/^C[\.\)]/i.test(opt)) c = opt.substring(2).trim();
            if (/^D[\.\)]/i.test(opt)) d = opt.substring(2).trim();
          }
          
          questions.push({
            id: generateId(),
            questionNumber: qNum++,
            subject: 'Physics',
            chapter: 'General',
            question: qText,
            options: { A: a, B: b, C: c, D: d },
            correctAnswer: null,
            type: 'MCQ',
            level: 'Medium',
            hasDiagram: false
          });
        }
        
        setExtractedQuestions(questions as any);
        setStep('review');
        toast.success(`Successfully extracted ${questions.length} questions from text!`);
      } else {
        // Try JSON parsing
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const mapped = parsed.map((p, i) => ({
              id: generateId(),
              questionNumber: i + 1,
              subject: p.subject || 'Physics',
              chapter: p.chapter || 'General',
              question: p.question || p.text || '',
              options: p.options || { A: '', B: '', C: '', D: '' },
              correctAnswer: p.correctAnswer || p.answer || null,
              type: p.type || 'MCQ',
              level: p.level || 'Medium',
              hasDiagram: !!p.imageUrl,
              imageUrl: p.imageUrl || null
            }));
            setExtractedQuestions(mapped as any);
            setStep('review');
            toast.success(`Successfully loaded ${mapped.length} questions from JSON!`);
          } else {
             toast.error('JSON must be an array of questions');
          }
        } catch (e) {
          toast.error('Could not detect question format. Please check the text format.');
        }
      }
    } catch (e: any) {
      toast.error('Extraction failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2 flex items-center gap-2">
            <Upload className="h-8 w-8 text-primary" /> Create New Test
          </h1>
          <p className="text-muted-foreground">Upload a PDF to automatically extract or manually crop questions</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-8 max-w-3xl mx-auto">
        {['Upload', 'Configure', 'Review'].map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                (step === 'upload' && i === 0) || (step === 'configure' && i === 1) || (step === 'review' && i === 2)
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : i < (step === 'review' ? 2 : step === 'configure' ? 1 : 0)
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {i < (step === 'review' ? 2 : step === 'configure' ? 1 : 0) ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-xs mt-2 font-medium">{s}</span>
            </div>
            {i < 2 && (
              <div className={`flex-1 h-1 mx-4 rounded-full ${
                i < (step === 'review' ? 2 : step === 'configure' ? 1 : 0) ? 'bg-primary/50' : 'bg-border'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <Tabs defaultValue="pdf" className="max-w-2xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pdf" className="gap-2"><FileText className="h-4 w-4" /> PDF Upload</TabsTrigger>
            <TabsTrigger value="text" className="gap-2"><Type className="h-4 w-4" /> Paste Text / JSON</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pdf">
            <Card className="border-dashed border-2 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center p-12">
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Upload Test PDF</h2>
                <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
                  Upload your exam paper PDF. Works with both scanned and digital PDFs. No AI limits required!
                </p>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                  <Button size="lg" className="px-8" disabled={isProcessing}>
                    {isProcessing ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
                    {isProcessing ? 'Processing PDF...' : 'Select PDF File'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Paste Text or JSON</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Paste raw text (e.g., "1. Question... A) ... B) ...") or structured JSON. We'll extract the questions automatically.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="Paste your questions here..." 
                  className="min-h-[200px]"
                  id="rawTextInput"
                />
                <Button 
                  className="w-full" 
                  onClick={() => {
                    const text = (document.getElementById('rawTextInput') as HTMLTextAreaElement).value;
                    if (!text.trim()) { toast.error('Please enter some text'); return; }
                    handleTextExtraction(text);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Type className="h-4 w-4 mr-2" />}
                  Extract Questions from Text
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* STEP 2: CONFIGURE */}
      {step === 'configure' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" /> Test Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Test Title</Label>
                  <Input 
                    value={testConfig.title} 
                    onChange={e => setTestConfig({...testConfig, title: e.target.value})}
                    placeholder="e.g. JEE Advanced Mock Test 1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (Minutes)</Label>
                    <Input 
                      type="number" 
                      value={testConfig.duration} 
                      onChange={e => setTestConfig({...testConfig, duration: parseInt(e.target.value) || 180})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Type</Label>
                    <Select value={testConfig.examType} onValueChange={(val: any) => setTestConfig({...testConfig, examType: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JEE Main">JEE Main</SelectItem>
                        <SelectItem value="JEE Advanced">JEE Advanced</SelectItem>
                        <SelectItem value="NEET">NEET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Switch 
                    checked={testConfig.autoNegativeMarking} 
                    onCheckedChange={(c) => setTestConfig({...testConfig, autoNegativeMarking: c})}
                  />
                  <Label>Auto-calculate negative marking based on exam type</Label>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/50 shadow-md shadow-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crop className="h-5 w-5 text-primary" /> Extraction Mode
                </CardTitle>
                <CardDescription>
                  Choose how you want to convert the PDF into questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div 
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${conversionMode === 'auto_crop' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setConversionMode('auto_crop')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Auto-Crop (Recommended)</span>
                    {conversionMode === 'auto_crop' && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatically slices the PDF into questions using smart pixel whitespace detection. 
                    Works on scanned PDFs instantly without AI limits.
                  </p>
                </div>

                <div 
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${conversionMode === 'manual_crop' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setConversionMode('manual_crop')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Advanced Manual Crop</span>
                    {conversionMode === 'manual_crop' && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manually draw boxes around questions, set question types, subjects, and answers. 
                    Perfect for complex layouts.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={startExtraction} className="w-full glow-primary h-12 text-md font-semibold" disabled={isProcessing}>
                  {isProcessing ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : 'Start Conversion'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">File Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">{pdfPageImages.length} Pages</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setShowPageViewer(true)}>
                  <Eye className="h-4 w-4 mr-2" /> View PDF Pages
                </Button>
                <Button variant="ghost" className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setStep('upload'); setFile(null); }}>
                  Cancel & Remove File
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {step === 'review' && (
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-correct" /> Review Questions
            </h2>
            <div className="flex gap-2">
               <Button variant="outline" onClick={() => setShowCropTool(true)}>
                 <Crop className="h-4 w-4 mr-2" /> Open Manual Cropper
               </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extractedQuestions.map((q, index) => (
              <Card key={q.id} className={`overflow-hidden transition-all ${editingQuestionId === q.id ? 'ring-2 ring-primary shadow-md' : 'hover:border-primary/50'}`}>
                <CardHeader className="p-3 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{index + 1}</span>
                    <span className={`badge-${q.subject.toLowerCase()} px-1.5 py-0.5 rounded text-[10px] uppercase font-bold`}>{q.subject}</span>
                    <span className="text-[10px] bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded">{q.type}</span>
                  </div>
                  <div className="flex gap-1">
                    {q.pdfPageNumber && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" title="Re-crop Question" onClick={() => setRecropQuestion(q)}>
                        <Crop className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingQuestionId(editingQuestionId === q.id ? null : q.id)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeQuestion(q.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="bg-white rounded border flex flex-col items-center justify-center min-h-[120px] p-2 mb-3 relative group">
                    {q.croppedImageUrl ? (
                      <>
                        <img src={q.croppedImageUrl} className="max-h-48 object-contain" alt={`Q${index+1}`} />
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded">
                          <span className="text-white text-xs font-bold flex items-center gap-1"><Upload className="h-4 w-4"/> Change Image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = (ev) => updateQuestion(q.id, { croppedImageUrl: ev.target?.result as string, hasDiagram: true });
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }} />
                        </label>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-full w-full cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                        <ImageIcon className="h-6 w-6 mb-1" />
                        <span className="text-xs">Add Diagram</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (ev) => updateQuestion(q.id, { croppedImageUrl: ev.target?.result as string, hasDiagram: true });
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }} />
                      </label>
                    )}
                  </div>
                  
                  {editingQuestionId === q.id && (
                    <div className="space-y-3 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Subject</Label>
                          <Select value={q.subject} onValueChange={(v: Subject) => updateQuestion(q.id, { subject: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Physics">Physics</SelectItem>
                              <SelectItem value="Chemistry">Chemistry</SelectItem>
                              <SelectItem value="Maths">Maths</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Type</Label>
                          <Select value={q.type} onValueChange={(v: QuestionType) => updateQuestion(q.id, { type: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MCQ">MCQ (Single)</SelectItem>
                              <SelectItem value="MSQ">MSQ (Multiple)</SelectItem>
                              <SelectItem value="Numerical">Integer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Correct Answer (Optional)</Label>
                        <Input 
                          className="h-7 text-xs" 
                          placeholder={q.type === 'Numerical' ? 'e.g. 5' : 'e.g. A'}
                          value={q.correctAnswer || ''}
                          onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                        />
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => setEditingQuestionId(null)}>
                        Done Editing
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 justify-end mt-8 p-4 bg-card border rounded-lg shadow-sm">
            <Button variant="outline" onClick={() => setStep('configure')}>Back to Configure</Button>
            <Button onClick={handleCreateTest} className="glow-primary px-8">
              Finalize & Create Test ({extractedQuestions.length} Qs)
            </Button>
          </div>
        </div>
      )}

      {/* PDF Page Viewer Dialog */}
      <Dialog open={showPageViewer} onOpenChange={setShowPageViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Original PDF Document</DialogTitle></DialogHeader>
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

      {/* Recrop Dialog */}
      <Dialog open={!!recropQuestion} onOpenChange={() => { setRecropQuestion(null); setRecropRegion(null); }}>
        <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle>Recrop Question {recropQuestion?.questionNumber} (Page {recropQuestion?.pdfPageNumber})</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">Drag on the image to draw a new crop box for this question.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setRecropRegion(null)} disabled={!recropRegion}>
                  Reset
                </Button>
                <Button size="sm" onClick={() => {
                  if (!recropQuestion || !recropRegion || !recropImgRef.current) return;
                  const img = recropImgRef.current;
                  const pageImage = pdfPageImages.find(p => p.pageNumber === recropQuestion.pdfPageNumber);
                  if (!pageImage) return;

                  const displayW = img.clientWidth;
                  const displayH = img.clientHeight;
                  if (displayW === 0 || displayH === 0) return;

                  const scaleX = img.naturalWidth / displayW;
                  const scaleY = img.naturalHeight / displayH;

                  const srcX = Math.max(0, recropRegion.x * scaleX);
                  const srcY = Math.max(0, recropRegion.y * scaleY);
                  const srcW = Math.min(img.naturalWidth - srcX, recropRegion.width * scaleX);
                  const srcH = Math.min(img.naturalHeight - srcY, recropRegion.height * scaleY);

                  if (srcW < 5 || srcH < 5) return;

                  const canvas = document.createElement('canvas');
                  canvas.width = srcW;
                  canvas.height = srcH;
                  const ctx = canvas.getContext('2d')!;

                  const tempImg = new Image();
                  tempImg.crossOrigin = 'anonymous';
                  tempImg.onload = () => {
                    ctx.drawImage(tempImg, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
                    const croppedUrl = canvas.toDataURL('image/png');
                    updateQuestion(recropQuestion.id, { croppedImageUrl: croppedUrl, hasDiagram: true });
                    setRecropQuestion(null);
                    setRecropRegion(null);
                    toast.success(`Question ${recropQuestion.questionNumber} recropped successfully!`);
                  };
                  tempImg.src = pageImage.imageDataUrl;
                }} disabled={!recropRegion || recropRegion.width < 10 || recropRegion.height < 10}>
                  Apply Recrop
                </Button>
              </div>
            </div>

            {recropQuestion && (
              <div className="relative border rounded-lg overflow-auto flex-1 bg-muted/20 w-full" style={{ minHeight: '300px' }}>
                <div
                  ref={recropWrapperRef}
                  className="relative inline-block cursor-crosshair select-none m-auto"
                  style={{ touchAction: 'none' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const rect = recropWrapperRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setRecropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    setRecropRegion(null);
                    setIsRecropDrawing(true);
                  }}
                  onMouseMove={(e) => {
                    if (!isRecropDrawing || !recropStart) return;
                    e.preventDefault();
                    const rect = recropWrapperRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const curX = e.clientX - rect.left;
                    const curY = e.clientY - rect.top;
                    setRecropRegion({
                      x: Math.min(recropStart.x, curX),
                      y: Math.min(recropStart.y, curY),
                      width: Math.abs(curX - recropStart.x),
                      height: Math.abs(curY - recropStart.y),
                    });
                  }}
                  onMouseUp={() => setIsRecropDrawing(false)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const rect = recropWrapperRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const touch = e.touches[0];
                    setRecropStart({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
                    setRecropRegion(null);
                    setIsRecropDrawing(true);
                  }}
                  onTouchMove={(e) => {
                    if (!isRecropDrawing || !recropStart) return;
                    e.preventDefault();
                    const rect = recropWrapperRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const touch = e.touches[0];
                    const curX = touch.clientX - rect.left;
                    const curY = touch.clientY - rect.top;
                    setRecropRegion({
                      x: Math.min(recropStart.x, curX),
                      y: Math.min(recropStart.y, curY),
                      width: Math.abs(curX - recropStart.x),
                      height: Math.abs(curY - recropStart.y),
                    });
                  }}
                  onTouchEnd={() => setIsRecropDrawing(false)}
                >
                  <img
                    ref={recropImgRef}
                    src={pdfPageImages.find(p => p.pageNumber === recropQuestion.pdfPageNumber)?.imageDataUrl}
                    alt="Recrop page"
                    className="max-w-full pointer-events-none"
                    draggable={false}
                    style={{ display: 'block' }}
                  />
                  {recropRegion && recropRegion.width > 0 && recropRegion.height > 0 && (
                    <div
                      className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                      style={{
                        left: recropRegion.x,
                        top: recropRegion.y,
                        width: recropRegion.width,
                        height: recropRegion.height,
                        borderStyle: 'dashed',
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Manual Crop Tool */}
      <PDFCropTool
        open={showCropTool}
        onOpenChange={setShowCropTool}
        pages={pdfPageImages}
        onCroppedQuestions={async (crops) => {
          // If we came from manual crop mode or just opened it to add more
          const newQuestions = crops.map((crop, i) => {
            const qNum = extractedQuestions.length + i + 1;
            const ans = crop.correctAnswer || detectedAnswerKey[String(qNum)] || null;
            return {
              id: generateId(),
              questionNumber: qNum,
              subject: crop.subject || 'Physics',
              chapter: 'General',
              question: '',
              options: { A: '', B: '', C: '', D: '' },
              correctAnswer: ans,
              type: crop.type || 'MCQ',
              level: 'Medium',
              imageUrl: crop.dataUrl,
              croppedImageUrl: crop.dataUrl,
              hasDiagram: true,
              pdfPageNumber: crop.pageNumber
            };
          });
          
          if (conversionMode === 'manual_crop' && extractedQuestions.length === 0) {
            setExtractedQuestions(newQuestions as any);
            setStep('review');
            toast.success(`Generated ${crops.length} manual questions!`);
          } else {
             // Append to existing
             setExtractedQuestions(prev => [...prev, ...(newQuestions as any)]);
             toast.success(`Added ${crops.length} more questions!`);
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

