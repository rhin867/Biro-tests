import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Test, AnswerKey } from '@/types/exam';
import { CheckCircle, Upload, AlertCircle, FileText, Loader2, Image } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fileToBase64 } from '@/lib/pdf-cropper';
import { getUserApiKey } from '@/pages/Settings';

interface AnswerKeyInputProps {
  test: Test;
  onAnswerKeySubmit: (answerKey: AnswerKey) => void;
  existingKey?: AnswerKey;
}

export function AnswerKeyInput({ test, onAnswerKeySubmit, existingKey }: AnswerKeyInputProps) {
  const [answerKey, setAnswerKey] = useState<AnswerKey>(existingKey || {});
  const [bulkInput, setBulkInput] = useState('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const handleSingleAnswerChange = (questionNum: string, answer: string) => {
    const validAnswer = answer.toUpperCase().replace(/[^A-D]/g, '');
    setAnswerKey((prev) => ({
      ...prev,
      [questionNum]: validAnswer,
    }));
  };

  const handleBulkParse = () => {
    const cleaned = bulkInput.trim().toUpperCase();
    
    if (/^[ABCD]+$/.test(cleaned)) {
      const newKey: AnswerKey = {};
      cleaned.split('').forEach((answer, index) => {
        if (test.questions[index]) {
          newKey[String(test.questions[index].questionNumber)] = answer;
        }
      });
      setAnswerKey(newKey);
      toast.success(`Parsed ${Object.keys(newKey).length} answers from sequence`);
      return;
    }

    const matches = cleaned.match(/(\d+)\s*[-.:)\]]\s*([ABCD])/g);
    if (matches) {
      const newKey: AnswerKey = {};
      matches.forEach((match) => {
        const parts = match.match(/(\d+)\s*[-.:)\]]\s*([ABCD])/);
        if (parts) {
          const qNum = parseInt(parts[1]);
          const answer = parts[2];
          const question = test.questions.find((q) => q.questionNumber === qNum);
          if (question) {
            newKey[String(question.questionNumber)] = answer;
          }
        }
      });
      setAnswerKey(newKey);
      toast.success(`Parsed ${Object.keys(newKey).length} answers`);
      return;
    }

    toast.error('Could not parse answer key. Try formats like "1-A, 2-B" or "ABCDABCD..."');
  };

  const handleAnswerKeyPdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    
    if (!isPdf && !isImage) {
      toast.error('Please upload a PDF or image file');
      return;
    }

    setIsProcessingPdf(true);
    toast.info('Extracting answer key from file...');

    try {
      const base64Data = await fileToBase64(file);
      const userApiKey = getUserApiKey();
      
      const { data, error } = await supabase.functions.invoke('extract-questions', {
        body: {
          pdfBase64: base64Data,
          mimeType: file.type,
          extractAnswerKeyOnly: true,
          totalQuestions: test.questions.length,
          ...(userApiKey ? { userApiKey } : {}),
        },
      });

      if (error) throw error;
      
      if (data.answerKey) {
        const newKey: AnswerKey = {};
        const answerKeyData = data.answerKey as Record<string, string>;
        
        Object.entries(answerKeyData).forEach(([qNumStr, answer]) => {
          const qNum = parseInt(qNumStr);
          const question = test.questions.find(q => q.questionNumber === qNum);
          if (question && typeof answer === 'string') {
            newKey[String(question.questionNumber)] = answer.toUpperCase();
          }
        });
        
        setAnswerKey(newKey);
        toast.success(`Extracted ${Object.keys(newKey).length} answers from file`);
      } else {
        toast.error('Could not extract answer key from file');
      }
    } catch (error) {
      console.error('Answer key extraction error:', error);
      toast.error('Failed to extract answer key. Try manual input instead.');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleSubmit = () => {
    const filledCount = Object.values(answerKey).filter((v) => v).length;
    if (filledCount === 0) {
      toast.error('Please enter at least one answer');
      return;
    }
    onAnswerKeySubmit(answerKey);
    toast.success(`Answer key saved with ${filledCount} answers`);
  };

  const filledCount = Object.values(answerKey).filter((v) => v).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Answer Key
        </CardTitle>
        <CardDescription>
          Enter the correct answers to enable analysis. Upload a PDF/image or type manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Answer Key PDF/Image */}
        <div className="space-y-2">
          <Label>Upload Answer Key (PDF or Image)</Label>
          <label
            htmlFor="answer-key-upload"
            className="flex items-center justify-center gap-3 h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all border-border hover:border-primary/50 hover:bg-accent"
          >
            {isProcessingPdf ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Extracting answers from file...</span>
              </div>
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload answer key</p>
                  <p className="text-xs text-muted-foreground">PDF or Image with answer key</p>
                </div>
              </>
            )}
            <input
              id="answer-key-upload"
              type="file"
              accept=".pdf,image/*"
              onChange={handleAnswerKeyPdfUpload}
              className="hidden"
              disabled={isProcessingPdf}
            />
          </label>
        </div>

        {/* Bulk Input */}
        <div className="space-y-2">
          <Label>Bulk Input</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 1-A, 2-B, 3-C or ABCDABCD..."
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleBulkParse} variant="secondary">
              Parse
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: "1-A, 2-B, 3-C" | "1.A 2.B" | "ABCDABCD..."
          </p>
        </div>

        {/* Individual Answers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Individual Answers</Label>
            <Badge variant="outline">
              {filledCount}/{test.questions.length} filled
            </Badge>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-2">
            {test.questions.map((q) => (
              <div key={q.id} className="relative">
                <Input
                  className="h-10 w-10 text-center uppercase font-medium p-0"
                  maxLength={1}
                  value={answerKey[String(q.questionNumber)] || answerKey[q.id] || ''}
                  onChange={(e) => handleSingleAnswerChange(String(q.questionNumber), e.target.value)}
                  placeholder={String(q.questionNumber)}
                />
                <span className="absolute -top-2 -left-1 text-[10px] text-muted-foreground bg-background px-1">
                  {q.questionNumber}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Analysis will be available after submitting answer key</span>
          </div>
          <Button onClick={handleSubmit} className="gap-2">
            <Upload className="h-4 w-4" />
            Save Answer Key
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
