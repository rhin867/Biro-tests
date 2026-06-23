import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/exam/StatCard';
import { MultiProgressBar } from '@/components/exam/ProgressBar';
import { SubjectTabs } from '@/components/exam/SubjectTabs';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { AnswerKeyInput } from '@/components/exam/AnswerKeyInput';
import { AttemptHistory } from '@/components/exam/AttemptHistory';
import { QuestionWiseTable } from '@/components/analysis/QuestionWiseTable';
import { ChapterWiseBreakdown } from '@/components/analysis/ChapterWiseBreakdown';
import { TestJourneyChart } from '@/components/analysis/TestJourneyChart';
import { MistakePatternDonut } from '@/components/analysis/MistakePatternDonut';
import { PerformanceComparison } from '@/components/analysis/PerformanceComparison';
import { TimeAnalysis } from '@/components/analysis/TimeAnalysis';
import { QuestionJourney } from '@/components/analysis/QuestionJourney';
import { SubjectMovement } from '@/components/analysis/SubjectMovement';
import { ScorePotential } from '@/components/analysis/ScorePotential';
import { AttemptAnalysis } from '@/components/analysis/AttemptAnalysis';
import { AdvancedAnalysis } from '@/components/analysis/AdvancedAnalysis';
import { DifficultyAnalysis } from '@/components/analysis/DifficultyAnalysis';
import { MissedConcepts } from '@/components/analysis/MissedConcepts';
import { PainfulQuestions } from '@/components/analysis/PainfulQuestions';
import { CompleteAuditTable } from '@/components/analysis/CompleteAuditTable';
import { TestLearnings } from '@/components/analysis/TestLearnings';
import { Leaderboard } from '@/components/analysis/Leaderboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  getResultById,
  getTestById,
  getResultsByTestId,
  addToMistakeBook,
  updateTestAnswerKey,
  saveResult,
} from '@/lib/storage';
import {
  calculateMistakeAnalysis,
  calculateTestResult,
  formatTime,
  createMistakeBookEntry,
} from '@/lib/exam-utils';
import { Subject, TestResult, QuestionResult, MistakeType, AnswerKey } from '@/types/exam';
import {
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  BookOpen,
  RefreshCw,
  Sparkles,
  Key,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function TestAnalysis() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'All'>('All');
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionResult | null>(null);
  const [showAnswerKeyDialog, setShowAnswerKeyDialog] = useState(false);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);

  const result = useMemo(() => attemptId ? getResultById(attemptId) : null, [attemptId]);
  const test = useMemo(() => result ? getTestById(result.testId) : null, [result]);
  const allAttempts = useMemo(() => result ? getResultsByTestId(result.testId) : [], [result]);
  const mistakeAnalysis = useMemo(() => result ? calculateMistakeAnalysis([result]) : null, [result]);

  const hasAnswerKey = test?.hasAnswerKey || test?.questions.some(q => q.correctAnswer);

  if (!result || !test) {
    return (
      <MainLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Analysis not found</p>
        </div>
      </MainLayout>
    );
  }

  const handleAnswerKeySubmit = (answerKey: AnswerKey) => {
    updateTestAnswerKey(test.id, answerKey);
    
    const updatedTest = getTestById(test.id);
    if (updatedTest) {
      const attempts = JSON.parse(localStorage.getItem('jee_cbt_attempts') || '[]');
      const attempt = attempts.find((a: any) => a.id === result.attemptId);
      
      if (attempt) {
        const newResult = calculateTestResult(updatedTest, attempt);
        newResult.attemptNumber = result.attemptNumber;
        newResult.hasAnswerKey = true;
        saveResult(newResult);
      }
    }
    
    setShowAnswerKeyDialog(false);
    toast.success('Answer key saved! Refreshing analysis...');
    window.location.reload();
  };

  const handleAddToMistakeBook = (questionResult: QuestionResult) => {
    const question = test.questions.find(q => q.id === questionResult.questionId);
    if (!question) return;

    const entry = createMistakeBookEntry(
      question,
      result.testId,
      result.testName,
      questionResult.selectedAnswer,
      questionResult.mistakeTypes,
      questionResult.notes
    );
    addToMistakeBook(entry);
    toast.success('Added to Mistake Book');
  };

  const handleGeneratePractice = async () => {
    const wrongQuestions = result.questionResults
      .filter(qr => !qr.isCorrect && qr.isAttempted)
      .map(qr => {
        const q = test.questions.find(tq => tq.id === qr.questionId);
        return q ? { question: q.question, correctAnswer: q.correctAnswer, chapter: q.chapter } : null;
      })
      .filter(Boolean)
      .slice(0, 5);

    if (wrongQuestions.length === 0) {
      toast.info('No wrong questions to generate practice from');
      return;
    }

    setIsGeneratingPractice(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-practice-questions', {
        body: {
          wrongQuestions,
          subject: result.questionResults.find(qr => !qr.isCorrect)?.subject || 'Physics',
          chapter: wrongQuestions[0]?.chapter || 'General',
        },
      });

      if (error) throw error;
      toast.success(`Generated ${data.questions?.length || 0} practice questions!`);
    } catch (error) {
      console.error('Failed to generate practice questions:', error);
      toast.error('Failed to generate practice questions');
    } finally {
      setIsGeneratingPractice(false);
    }
  };

  // Subject-wise data for charts
  const subjectData = [
    {
      name: 'Physics',
      correct: result.subjectWise.Physics.correct,
      incorrect: result.subjectWise.Physics.incorrect,
      skipped: result.subjectWise.Physics.skipped,
      accuracy: Math.round(result.subjectWise.Physics.accuracy),
      color: 'hsl(199, 89%, 48%)',
    },
    {
      name: 'Chemistry',
      correct: result.subjectWise.Chemistry.correct,
      incorrect: result.subjectWise.Chemistry.incorrect,
      skipped: result.subjectWise.Chemistry.skipped,
      accuracy: Math.round(result.subjectWise.Chemistry.accuracy),
      color: 'hsl(142, 76%, 36%)',
    },
    {
      name: 'Maths',
      correct: result.subjectWise.Maths.correct,
      incorrect: result.subjectWise.Maths.incorrect,
      skipped: result.subjectWise.Maths.skipped,
      accuracy: Math.round(result.subjectWise.Maths.accuracy),
      color: 'hsl(280, 65%, 60%)',
    },
  ].filter(s => result.subjectWise[s.name as Subject].total > 0);

  const mistakesByType = mistakeAnalysis?.byType || {
    concept: 0, formula: 0, calculation: 0, 'time-management': 0,
    guessing: 0, 'forgot-concept': 0, misread: 0, 'correct-slow': 0, 'perfectly-known': 0,
  };

  const filteredQuestions = selectedSubject === 'All'
    ? result.questionResults
    : result.questionResults.filter(q => q.subject === selectedSubject);

  // If no answer key, show prompt
  if (!hasAnswerKey) {
    return (
      <MainLayout>
        <PageHeader
          title="Test Submitted"
          description={`${result.testName} • ${new Date(result.completedAt).toLocaleDateString()}`}
        >
          <Link to={`/exam/${result.testId}`}>
            <Button variant="outline">Retake Test</Button>
          </Link>
        </PageHeader>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-yellow-500" />
                Answer Key Required
              </CardTitle>
              <CardDescription>
                To view detailed analysis and marks, please add the answer key for this test.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{result.attempted}</p>
                  <p className="text-sm text-muted-foreground">Attempted</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{formatTime(result.timeTaken)}</p>
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <AnswerKeyInput test={test} onAnswerKeySubmit={handleAnswerKeySubmit} />
          <AttemptHistory testId={test.id} results={allAttempts} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Detailed Test Analysis"
        description={`${result.testName} • Attempt #${result.attemptNumber || 1} • ${new Date(result.completedAt).toLocaleDateString()}`}
      >
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              const el = document.getElementById('analysis-content');
              if (el) {
                import('html2canvas').then(({ default: html2canvas }) => {
                  html2canvas(el, { backgroundColor: '#1a1f2e', scale: 1 }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `${result.testName}-analysis.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                    toast.success('Analysis downloaded!');
                  });
                });
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={() => setShowAnswerKeyDialog(true)}>
            <Key className="h-4 w-4 mr-2" />
            Edit Answers
          </Button>
          <Button
            variant="outline"
            onClick={handleGeneratePractice}
            disabled={isGeneratingPractice}
          >
            {isGeneratingPractice ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Practice
          </Button>
          <Link to={`/exam/${result.testId}`}>
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retake
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Score" value={`${result.score}/${result.maxScore}`} icon={Target} variant="primary" />
        <StatCard title="Accuracy" value={`${result.accuracy.toFixed(1)}%`} icon={TrendingUp} variant={result.accuracy >= 60 ? 'correct' : 'incorrect'} />
        <StatCard title="Correct" value={result.correct} icon={CheckCircle2} variant="correct" subtitle={`+${result.correct * test.positiveMarking}`} />
        <StatCard title="Incorrect" value={result.incorrect} icon={XCircle} variant="incorrect" subtitle={`-${result.incorrect * test.negativeMarking}`} />
        <StatCard title="Skipped" value={result.skipped} icon={MinusCircle} variant="skipped" />
        <StatCard title="Time" value={formatTime(result.timeTaken)} icon={Clock} />
      </div>

      {/* Global Leaderboard */}
      <div className="mb-8">
        <Leaderboard testId={result.testId} />
      </div>


      {/* Progress Overview */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle>Overall Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiProgressBar
            segments={[
              { value: result.correct, variant: 'correct', label: 'Correct' },
              { value: result.incorrect, variant: 'incorrect', label: 'Incorrect' },
              { value: result.skipped, variant: 'skipped', label: 'Skipped' },
            ]}
            total={result.totalQuestions}
            size="lg"
          />
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-correct" />
              <span className="text-sm">Correct ({result.correct})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-incorrect" />
              <span className="text-sm">Incorrect ({result.incorrect})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-skipped" />
              <span className="text-sm">Skipped ({result.skipped})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Analysis - Scrollable tabs like Mathongo/PW */}
      <div id="analysis-content">
      <Tabs defaultValue="overview" className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="overview">Performance</TabsTrigger>
            <TabsTrigger value="score-potential">Score Potential</TabsTrigger>
            <TabsTrigger value="attempt-analysis">Attempt Analysis</TabsTrigger>
            <TabsTrigger value="time-analysis">Time Analysis</TabsTrigger>
            <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
            <TabsTrigger value="subject-movement">Subject Movement</TabsTrigger>
            <TabsTrigger value="question-journey">Question Journey</TabsTrigger>
            <TabsTrigger value="painful">Painful Qs</TabsTrigger>
            <TabsTrigger value="missed-concepts">Missed Concepts</TabsTrigger>
            <TabsTrigger value="questions">Qs by Qs Analysis</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Analysis</TabsTrigger>
            <TabsTrigger value="complete-analysis">Complete Analysis</TabsTrigger>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
            <TabsTrigger value="learnings">Learnings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subject-wise Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={subjectData}>
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="accuracy" name="Accuracy %" radius={[4, 4, 0, 0]}>
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={subjectData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar name="Accuracy" dataKey="accuracy" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjectData.map((subject) => (
              <Card key={subject.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                    {subject.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium">
                        {result.subjectWise[subject.name as Subject].score}/{result.subjectWise[subject.name as Subject].maxScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-medium">{subject.accuracy}%</span>
                    </div>
                    <MultiProgressBar
                      segments={[
                        { value: subject.correct, variant: 'correct' },
                        { value: subject.incorrect, variant: 'incorrect' },
                        { value: subject.skipped, variant: 'skipped' },
                      ]}
                      total={result.subjectWise[subject.name as Subject].total}
                      size="sm"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-correct">{subject.correct} correct</span>
                      <span className="text-incorrect">{subject.incorrect} wrong</span>
                      <span>{subject.skipped} skipped</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PerformanceComparison result={result} />
        </TabsContent>

        {/* Advanced Analysis Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedAnalysis questionResults={result.questionResults} subjectWise={result.subjectWise} />
        </TabsContent>

        {/* Score Potential Tab */}
        <TabsContent value="score-potential" className="space-y-6">
          <ScorePotential
            result={result}
            positiveMarking={test.positiveMarking}
            negativeMarking={test.negativeMarking}
          />
        </TabsContent>

        {/* Attempt Analysis Tab */}
        <TabsContent value="attempt-analysis" className="space-y-6">
          <AttemptAnalysis questionResults={result.questionResults} />
        </TabsContent>

        {/* Time Analysis Tab */}
        <TabsContent value="time-analysis" className="space-y-6">
          <TimeAnalysis
            questionResults={result.questionResults}
            totalDuration={test.duration}
          />
        </TabsContent>

        {/* Difficulty Tab */}
        <TabsContent value="difficulty" className="space-y-6">
          <DifficultyAnalysis
            questionResults={result.questionResults}
            questions={test.questions.map(q => ({ id: q.id, level: q.level }))}
          />
        </TabsContent>

        {/* Subject Movement Tab */}
        <TabsContent value="subject-movement" className="space-y-6">
          <SubjectMovement questionResults={result.questionResults} />
        </TabsContent>

        {/* Question Journey Tab */}
        <TabsContent value="question-journey" className="space-y-6">
          <QuestionJourney
            questionResults={result.questionResults}
            totalDuration={test.duration}
          />
        </TabsContent>

        {/* Painful Questions Tab */}
        <TabsContent value="painful" className="space-y-6">
          <PainfulQuestions
            questionResults={result.questionResults}
            onQuestionClick={(qr) => setSelectedQuestion(qr)}
          />
        </TabsContent>

        {/* Missed Concepts Tab */}
        <TabsContent value="missed-concepts" className="space-y-6">
          <MissedConcepts questionResults={result.questionResults} />
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          <div className="flex items-center justify-between">
            <SubjectTabs
              subjects={['All' as any, ...test.subjects]}
              activeSubject={selectedSubject as Subject}
              onSubjectChange={(s) => setSelectedSubject(s as Subject | 'All')}
              subjectCounts={{
                Physics: { total: result.subjectWise.Physics.total, answered: result.subjectWise.Physics.correct },
                Chemistry: { total: result.subjectWise.Chemistry.total, answered: result.subjectWise.Chemistry.correct },
                Maths: { total: result.subjectWise.Maths.total, answered: result.subjectWise.Maths.correct },
              }}
            />
          </div>
          <QuestionWiseTable
            questionResults={filteredQuestions}
            onViewQuestion={(qr) => setSelectedQuestion(qr)}
            onReattempt={(qr) => handleAddToMistakeBook(qr)}
          />
        </TabsContent>

        {/* Complete Analysis Tab */}
        <TabsContent value="complete-analysis" className="space-y-6">
          <CompleteAuditTable
            questionResults={result.questionResults}
            questions={test.questions}
            onViewQuestion={(qr) => setSelectedQuestion(qr)}
          />
        </TabsContent>

        {/* Chapters Tab */}
        <TabsContent value="chapters" className="space-y-6">
          <ChapterWiseBreakdown
            chapterData={result.chapterWise}
            questionResults={result.questionResults}
            onQuestionClick={(qr) => setSelectedQuestion(qr)}
          />
        </TabsContent>

        {/* Mistakes Tab */}
        <TabsContent value="mistakes" className="space-y-6">
          <MistakePatternDonut mistakesByType={mistakesByType} totalMistakes={result.incorrect} />
          <Card>
            <CardHeader>
              <CardTitle>Wrong Questions</CardTitle>
              <CardDescription>Click to view details and add to Mistake Book</CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionWiseTable
                questionResults={result.questionResults.filter(qr => !qr.isCorrect)}
                onViewQuestion={(qr) => setSelectedQuestion(qr)}
                onReattempt={handleAddToMistakeBook}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learnings Tab */}
        <TabsContent value="learnings" className="space-y-6">
          <TestLearnings attemptId={result.attemptId} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <AttemptHistory testId={test.id} results={allAttempts} />
        </TabsContent>
      </Tabs>
      </div>

      {/* Question Detail Dialog */}
      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question {selectedQuestion?.questionNumber}</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <QuestionDisplay
                question={test.questions.find(q => q.id === selectedQuestion.questionId)!}
                questionNumber={selectedQuestion.questionNumber}
                totalQuestions={test.questions.length}
                selectedAnswer={selectedQuestion.selectedAnswer}
                onAnswerSelect={() => {}}
                showCorrectAnswer
                pdfPageImages={test.pdfPageImages}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleAddToMistakeBook(selectedQuestion);
                    setSelectedQuestion(null);
                  }}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Add to Mistake Book
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Answer Key Dialog */}
      <Dialog open={showAnswerKeyDialog} onOpenChange={setShowAnswerKeyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Answer Key</DialogTitle>
          </DialogHeader>
          <AnswerKeyInput
            test={test}
            existingKey={test.answerKey}
            onAnswerKeySubmit={handleAnswerKeySubmit}
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
