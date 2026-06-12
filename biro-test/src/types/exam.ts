// Core exam types for the JEE CBT Analysis System

export type Subject = 'Physics' | 'Chemistry' | 'Maths';

export type QuestionType = 'MCQ' | 'Numerical' | 'MSQ';

export type QuestionStatus = 
  | 'unattempted' 
  | 'answered' 
  | 'marked-review' 
  | 'answered-marked' 
  | 'skipped';

export type MistakeType = 
  | 'concept'
  | 'formula'
  | 'calculation'
  | 'time-management'
  | 'guessing'
  | 'forgot-concept'
  | 'misread'
  | 'correct-slow'
  | 'perfectly-known';

export interface Question {
  id: string;
  questionNumber: number;
  subject: Subject;
  chapter: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string | null;
  type: QuestionType;
  level: string;
  imageUrl?: string;
  hasDiagram?: boolean;
  pdfPageNumber?: number;
  croppedImageUrl?: string;
}

export interface AnswerKey {
  [questionId: string]: string;
}

export interface QuestionAttempt {
  questionId: string;
  selectedAnswer: string | null;
  timeSpent: number; // in seconds
  status: QuestionStatus;
  mistakeTypes: MistakeType[];
  notes: string;
  markedForRevision: boolean;
  visitCount: number;
  firstVisitTime: number;
  lastVisitTime: number;
}

export interface Test {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  duration: number; // in minutes
  questions: Question[];
  subjects: Subject[];
  totalMarks: number;
  positiveMarking: number;
  negativeMarking: number;
  answerKey?: AnswerKey;
  hasAnswerKey?: boolean;
  shareCode?: string;
  createdBy?: string;
  pdfPageImages?: { pageNumber: number; imageDataUrl: string }[];
}

export interface TestAttempt {
  id: string;
  testId: string;
  startedAt: string;
  completedAt?: string;
  timeRemaining: number; // in seconds
  attempts: Record<string, QuestionAttempt>;
  currentQuestionIndex: number;
  currentSubject: Subject;
  isSubmitted: boolean;
  attemptNumber?: number;
  userId?: string;
}

export interface TestResult {
  attemptId: string;
  testId: string;
  testName: string;
  completedAt: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  maxScore: number;
  accuracy: number;
  timeTaken: number;
  subjectWise: Record<Subject, SubjectResult>;
  chapterWise: Record<string, ChapterResult>;
  questionResults: QuestionResult[];
  attemptNumber?: number;
  hasAnswerKey?: boolean;
}

export interface SubjectResult {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  maxScore: number;
  accuracy: number;
  timeTaken: number;
}

export interface ChapterResult {
  subject: Subject;
  chapter: string;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  timeTaken: number;
  questionIds: string[];
}

export interface QuestionResult {
  questionId: string;
  questionNumber: number;
  subject: Subject;
  chapter: string;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  isAttempted: boolean;
  timeSpent: number;
  marks: number;
  mistakeTypes: MistakeType[];
  notes: string;
  markedForRevision: boolean;
  question?: Question;
}

export interface MistakeAnalysis {
  totalMistakes: number;
  byType: Record<MistakeType, number>;
  bySubject: Record<Subject, Record<MistakeType, number>>;
  byChapter: Record<string, Record<MistakeType, number>>;
  weakConcepts: string[];
  weakFormulas: string[];
  carelessnessRate: number;
  timePressureRate: number;
}

export interface PerformanceTrend {
  testId: string;
  testName: string;
  date: string;
  score: number;
  accuracy: number;
  timeTaken: number;
  attemptNumber: number;
}

export interface WeeklyPlan {
  id: string;
  generatedAt: string;
  weekStartDate: string;
  weekEndDate: string;
  dailyTargets: DailyTarget[];
  chapterPriority: ChapterPriority[];
  formulaRevisionList: FormulaItem[];
  practiceTheoryRatio: number;
}

export interface DailyTarget {
  day: string;
  date: string;
  tasks: PlanTask[];
  estimatedHours: number;
  focus: Subject[];
}

export interface PlanTask {
  id: string;
  type: 'revision' | 'practice' | 'test' | 'formula';
  subject: Subject;
  chapter: string;
  description: string;
  duration: number;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface ChapterPriority {
  subject: Subject;
  chapter: string;
  priority: 'high' | 'medium' | 'low';
  weaknessScore: number;
  recommendedHours: number;
}

export interface FormulaItem {
  subject: Subject;
  chapter: string;
  formula: string;
  needsRevision: boolean;
}

export interface MistakeBookEntry {
  id: string;
  questionId: string;
  testId: string;
  testName: string;
  addedAt: string;
  question: Question;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  mistakeTypes: MistakeType[];
  notes: string;
  reattemptCount: number;
  lastReattemptAt?: string;
  mastered: boolean;
}

export interface PracticeQuestion {
  id: string;
  question: Question;
  generatedAt: string;
  basedOnQuestionId: string;
  chapter: string;
  subject: Subject;
}

// Storage state
export interface ExamStore {
  tests: Test[];
  attempts: TestAttempt[];
  results: TestResult[];
  mistakeBook: MistakeBookEntry[];
  weeklyPlans: WeeklyPlan[];
  currentAttempt: TestAttempt | null;
  practiceQuestions?: PracticeQuestion[];
}
