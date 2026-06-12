import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { SubjectTabs } from '@/components/exam/SubjectTabs';
import { MistakeFeedback } from '@/components/exam/MistakeFeedback';
import { NTAModeToggle } from '@/components/exam/NTAModeToggle';
import { NTAQuestionPalette } from '@/components/exam/NTAQuestionPalette';
import { useNTAMode } from '@/contexts/NTAModeContext';
import {
  getTestById,
  getCurrentAttempt,
  setCurrentAttempt,
  saveAttempt,
  saveResult,
  clearCurrentAttempt,
  generateId,
  getAttempts,
  loadTestPdfPageImages,
} from '@/lib/storage';
import { calculateTestResult } from '@/lib/exam-utils';
import { Test, TestAttempt, QuestionAttempt, QuestionStatus, Subject, MistakeType } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDisplayName, getCurrentUserKey } from '@/lib/app-settings';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  X,
  AlertTriangle,
  Grid3X3,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function ExamInterface() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSubject, setCurrentSubject] = useState<Subject>('Physics');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const { isNTAMode } = useNTAMode();
  const attemptRef = useRef<TestAttempt | null>(null);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  // Initialize test and attempt
  useEffect(() => {
    if (!testId) {
      navigate('/tests');
      return;
    }

    const loadedTest = getTestById(testId);
    if (!loadedTest) {
      toast.error('Test not found');
      navigate('/tests');
      return;
    }

    setTest(loadedTest);
    loadTestPdfPageImages(testId).then((pages) => {
      if (pages.length) setTest((current) => current?.id === testId ? { ...current, pdfPageImages: pages } : current);
    }).catch(() => {});

    // Check for existing attempt
    const existingAttempt = getCurrentAttempt();
    if (existingAttempt && existingAttempt.testId === testId && !existingAttempt.isSubmitted) {
      setAttempt(existingAttempt);
      setCurrentQuestionIndex(existingAttempt.currentQuestionIndex);
      setCurrentSubject(existingAttempt.currentSubject);
    } else {
      // Calculate attempt number
      const previousAttempts = getAttempts().filter(a => a.testId === testId && a.isSubmitted);
      const attemptNumber = previousAttempts.length + 1;

      // Create new attempt
      const newAttempt: TestAttempt = {
        id: generateId(),
        testId,
        startedAt: new Date().toISOString(),
        timeRemaining: loadedTest.duration * 60,
        attempts: {},
        currentQuestionIndex: 0,
        currentSubject: loadedTest.subjects[0] || 'Physics',
        isSubmitted: false,
        attemptNumber,
      };
      setAttempt(newAttempt);
      setCurrentAttempt(newAttempt);
    }
  }, [testId, navigate]);

  // Auto-save attempt periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (attemptRef.current && !attemptRef.current.isSubmitted) {
        setCurrentAttempt(attemptRef.current);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Current question
  const currentQuestion = test?.questions[currentQuestionIndex];
  const currentAttemptData = currentQuestion ? attempt?.attempts[currentQuestion.id] : null;

  // Get question subjects mapping
  const questionSubjects = useMemo(() => {
    if (!test) return {};
    const mapping: Record<number, Subject> = {};
    test.questions.forEach((q, index) => {
      mapping[index + 1] = q.subject;
    });
    return mapping;
  }, [test]);

  // Get question status for palette
  const getQuestionStatuses = useCallback((): Record<number, QuestionStatus> => {
    if (!test || !attempt) return {};

    const statuses: Record<number, QuestionStatus> = {};
    test.questions.forEach((q, index) => {
      const attemptData = attempt.attempts[q.id];
      if (!attemptData) {
        statuses[index + 1] = 'unattempted';
      } else if (attemptData.selectedAnswer && attemptData.status === 'marked-review') {
        statuses[index + 1] = 'answered-marked';
      } else if (attemptData.status === 'marked-review') {
        statuses[index + 1] = 'marked-review';
      } else if (attemptData.selectedAnswer) {
        statuses[index + 1] = 'answered';
      } else {
        statuses[index + 1] = 'skipped';
      }
    });
    return statuses;
  }, [test, attempt]);

  // Subject counts
  const getSubjectCounts = useCallback((): Record<Subject, { total: number; answered: number }> => {
    if (!test || !attempt) return {
      Physics: { total: 0, answered: 0 },
      Chemistry: { total: 0, answered: 0 },
      Maths: { total: 0, answered: 0 },
    };

    const counts: Record<Subject, { total: number; answered: number }> = {
      Physics: { total: 0, answered: 0 },
      Chemistry: { total: 0, answered: 0 },
      Maths: { total: 0, answered: 0 },
    };

    test.questions.forEach((q) => {
      counts[q.subject].total++;
      const attemptData = attempt.attempts[q.id];
      if (attemptData?.selectedAnswer) {
        counts[q.subject].answered++;
      }
    });

    return counts;
  }, [test, attempt]);

  // Update attempt data for current question
  const updateAttemptData = useCallback((updates: Partial<QuestionAttempt>) => {
    if (!currentQuestion || !attempt) return;

    const existingData = attempt.attempts[currentQuestion.id] || {
      questionId: currentQuestion.id,
      selectedAnswer: null,
      timeSpent: 0,
      status: 'unattempted' as QuestionStatus,
      mistakeTypes: [],
      notes: '',
      markedForRevision: false,
      visitCount: 0,
      firstVisitTime: Date.now(),
      lastVisitTime: Date.now(),
    };

    const updatedAttempt: TestAttempt = {
      ...attempt,
      attempts: {
        ...attempt.attempts,
        [currentQuestion.id]: {
          ...existingData,
          ...updates,
          lastVisitTime: Date.now(),
        },
      },
      currentQuestionIndex,
      currentSubject,
    };

    setAttempt(updatedAttempt);
    setCurrentAttempt(updatedAttempt);
  }, [currentQuestion, attempt, currentQuestionIndex, currentSubject]);

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    updateAttemptData({
      selectedAnswer: answer,
      status: currentAttemptData?.status === 'marked-review' ? 'answered-marked' : 'answered',
    });
  };

  // Handle mark for review
  const handleMarkForReview = () => {
    const currentStatus = currentAttemptData?.status;
    const hasAnswer = currentAttemptData?.selectedAnswer;
    
    let newStatus: QuestionStatus;
    if (currentStatus === 'marked-review' || currentStatus === 'answered-marked') {
      newStatus = hasAnswer ? 'answered' : 'skipped';
    } else {
      newStatus = hasAnswer ? 'answered-marked' : 'marked-review';
    }

    updateAttemptData({ status: newStatus });
    toast.info(
      newStatus === 'marked-review' || newStatus === 'answered-marked'
        ? 'Marked for review'
        : 'Unmarked from review'
    );
  };

  // Handle clear response
  const handleClearResponse = () => {
    updateAttemptData({
      selectedAnswer: null,
      status: currentAttemptData?.status === 'answered-marked' ? 'marked-review' : 'unattempted',
    });
  };

  // Navigate to question
  const goToQuestion = (questionNumber: number) => {
    const newIndex = questionNumber - 1;
    if (newIndex >= 0 && newIndex < (test?.questions.length || 0)) {
      setCurrentQuestionIndex(newIndex);
      const question = test?.questions[newIndex];
      if (question) {
        setCurrentSubject(question.subject);
      }
      setShowMobilePalette(false);
    }
  };

  // Navigate by subject
  const handleSubjectChange = (subject: Subject) => {
    if (!test) return;
    setCurrentSubject(subject);
    const firstQuestionOfSubject = test.questions.findIndex(q => q.subject === subject);
    if (firstQuestionOfSubject >= 0) {
      setCurrentQuestionIndex(firstQuestionOfSubject);
    }
  };

  // Next/Previous navigation
  const goToNext = () => {
    if (currentQuestionIndex < (test?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextQuestion = test?.questions[currentQuestionIndex + 1];
      if (nextQuestion) setCurrentSubject(nextQuestion.subject);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevQuestion = test?.questions[currentQuestionIndex - 1];
      if (prevQuestion) setCurrentSubject(prevQuestion.subject);
    }
  };

  // Handle time up
  const handleTimeUp = () => {
    toast.warning('Time is up! Submitting test...');
    handleSubmitTest();
  };

  // Handle timer tick
  const handleTimerTick = useCallback((remaining: number) => {
    if (attemptRef.current) {
      const updated = { ...attemptRef.current, timeRemaining: remaining };
      setAttempt(updated);
      attemptRef.current = updated;
    }
  }, []);

  // Submit test
  const handleSubmitTest = () => {
    if (!test || !attempt) return;

    // Check if test has answer key
    if (!test.hasAnswerKey && !test.answerKey) {
      toast.info('Test submitted! Add answer key to view detailed analysis.');
    }

    const result = calculateTestResult(test, attempt);
    result.attemptNumber = attempt.attemptNumber;
    result.hasAnswerKey = test.hasAnswerKey;
    
    const finalAttempt: TestAttempt = {
      ...attempt,
      completedAt: new Date().toISOString(),
      isSubmitted: true,
    };

    saveAttempt(finalAttempt);
    saveResult(result);
    clearCurrentAttempt();

    // Submit to global leaderboard (best-effort, non-blocking)
    if (test.hasAnswerKey) {
      (supabase as any).from('test_leaderboard').insert({
        test_id: test.id,
        user_key: getCurrentUserKey(),
        display_name: getCurrentDisplayName(),
        score: result.score,
        max_score: result.maxScore,
        accuracy: result.accuracy,
        time_taken: result.timeTaken,
      }).then(() => {}, () => {});
    }

    toast.success('Test submitted successfully!');
    navigate(`/analysis/${result.attemptId}`);
  };

  // Handle feedback updates
  const handleMistakeTypesChange = (types: MistakeType[]) => {
    updateAttemptData({ mistakeTypes: types });
  };

  const handleNotesChange = (notes: string) => {
    updateAttemptData({ notes });
  };

  const handleRevisionToggle = () => {
    updateAttemptData({ markedForRevision: !currentAttemptData?.markedForRevision });
  };

  if (!test || !attempt || !currentQuestion) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading test...</p>
      </div>
    );
  }

  const questionStatuses = getQuestionStatuses();
  const subjectCounts = getSubjectCounts();
  const answeredCount = Object.values(attempt.attempts).filter(a => a.selectedAnswer).length;
  const markedCount = Object.values(attempt.attempts).filter(
    a => a.status === 'marked-review' || a.status === 'answered-marked'
  ).length;

  return (
    <div className={cn(
      "flex h-screen flex-col",
      isNTAMode ? "bg-white" : "bg-background"
    )}>
      {/* Header */}
      <header className={cn(
        "flex h-14 items-center justify-between border-b px-4",
        isNTAMode ? "bg-blue-800 text-white border-blue-900" : "border-border bg-card"
      )}>
        <div className="flex items-center gap-4">
          <h1 className={cn(
            "font-bold text-lg truncate max-w-[200px]",
            isNTAMode && "text-white"
          )}>{test.name}</h1>
          {attempt.attemptNumber && (
            <span className={cn(
              "text-xs px-2 py-1 rounded",
              isNTAMode ? "bg-blue-700" : "bg-muted"
            )}>
              Attempt #{attempt.attemptNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <NTAModeToggle showLabel={false} />
          <ExamTimer
            initialTime={attempt.timeRemaining}
            onTimeUp={handleTimeUp}
            onTick={handleTimerTick}
          />
          <Button
            variant={isNTAMode ? "secondary" : "destructive"}
            onClick={() => setShowSubmitDialog(true)}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Submit
          </Button>
        </div>
      </header>

      {/* Subject Tabs */}
      <div className={cn(
        "border-b px-4 py-2",
        isNTAMode ? "bg-gray-100 border-gray-300" : "border-border bg-card"
      )}>
        <SubjectTabs
          subjects={test.subjects}
          activeSubject={currentSubject}
          onSubjectChange={handleSubjectChange}
          subjectCounts={subjectCounts}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
        <div className={cn(
          "flex-1 overflow-y-auto p-4 lg:p-6",
          isNTAMode && "bg-white"
        )}>
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={test.questions.length}
            selectedAnswer={currentAttemptData?.selectedAnswer || null}
            onAnswerSelect={handleAnswerSelect}
            showCorrectAnswer={false}
            pdfPageImages={test.pdfPageImages}
          />

          {/* Feedback Section (Collapsible) */}
          {showFeedback && (
            <div className="mt-6 animate-fade-in">
              <MistakeFeedback
                selectedTypes={currentAttemptData?.mistakeTypes || []}
                onTypesChange={handleMistakeTypesChange}
                notes={currentAttemptData?.notes || ''}
                onNotesChange={handleNotesChange}
                markedForRevision={currentAttemptData?.markedForRevision || false}
                onRevisionToggle={handleRevisionToggle}
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 mb-20 lg:mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleMarkForReview}
                size="sm"
                className={cn(
                  'gap-2',
                  (currentAttemptData?.status === 'marked-review' ||
                    currentAttemptData?.status === 'answered-marked') &&
                    'bg-review/20 border-review text-review hover:bg-review/30'
                )}
              >
                <Flag className="h-4 w-4" />
                Mark
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearResponse}
                disabled={!currentAttemptData?.selectedAnswer}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFeedback(!showFeedback)}
              >
                {showFeedback ? 'Hide' : 'Feedback'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                size="sm"
                onClick={goToNext}
                disabled={currentQuestionIndex === test.questions.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar - Always visible on desktop */}
        <aside className={cn(
          "hidden lg:flex w-64 border-l flex-col",
          isNTAMode ? "bg-gray-50 border-gray-300" : "border-border bg-card"
        )}>
          <NTAQuestionPalette
            totalQuestions={test.questions.length}
            currentQuestion={currentQuestionIndex + 1}
            questionStatuses={questionStatuses}
            questionSubjects={questionSubjects}
            onQuestionClick={goToQuestion}
            currentSubject={currentSubject}
          />
        </aside>
      </div>

      {/* Mobile Question Palette FAB */}
      <Sheet open={showMobilePalette} onOpenChange={setShowMobilePalette}>
        <SheetTrigger asChild className="lg:hidden fixed bottom-4 right-4 z-50">
          <Button size="lg" className="rounded-full h-14 w-14 shadow-lg">
            <Grid3X3 className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0">
          <NTAQuestionPalette
            totalQuestions={test.questions.length}
            currentQuestion={currentQuestionIndex + 1}
            questionStatuses={questionStatuses}
            questionSubjects={questionSubjects}
            onQuestionClick={goToQuestion}
            currentSubject={currentSubject}
          />
        </SheetContent>
      </Sheet>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-review" />
              Submit Test?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to submit? This action cannot be undone.</p>
              <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-correct">{answeredCount}</p>
                  <p className="text-xs text-muted-foreground">Answered</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-review">{markedCount}</p>
                  <p className="text-xs text-muted-foreground">Marked</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{test.questions.length - answeredCount}</p>
                  <p className="text-xs text-muted-foreground">Unanswered</p>
                </div>
              </div>
              {!test.hasAnswerKey && (
                <p className="text-sm text-muted-foreground bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                  ⚠️ No answer key set. You can add it after submission to view analysis.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitTest} className="bg-primary">
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
