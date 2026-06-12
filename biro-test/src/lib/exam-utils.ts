// Exam calculation and analysis utilities

import {
  Test,
  TestAttempt,
  TestResult,
  QuestionResult,
  SubjectResult,
  ChapterResult,
  Subject,
  MistakeAnalysis,
  MistakeType,
  MistakeBookEntry,
  Question,
} from '@/types/exam';
import { generateId } from './storage';

export function calculateTestResult(test: Test, attempt: TestAttempt): TestResult {
  const questionResults: QuestionResult[] = [];
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalSkipped = 0;
  let totalScore = 0;
  let totalTimeTaken = 0;

  const subjectWise: Record<Subject, SubjectResult> = {
    Physics: createEmptySubjectResult(),
    Chemistry: createEmptySubjectResult(),
    Maths: createEmptySubjectResult(),
  };

  const chapterWise: Record<string, ChapterResult> = {};

  test.questions.forEach((question) => {
    const attemptData = attempt.attempts[question.id];
    const isAttempted = !!attemptData?.selectedAnswer?.trim();
    const isCorrect = isAttempted && isAnswerCorrect(question, attemptData.selectedAnswer);
    const timeSpent = attemptData?.timeSpent || 0;

    let marks = 0;
    if (isAttempted) {
      if (isCorrect) {
        marks = test.positiveMarking;
        totalCorrect++;
      } else if (question.type === 'MSQ') {
        marks = 0;
        totalIncorrect++;
      } else {
        marks = -test.negativeMarking;
        totalIncorrect++;
      }
    } else {
      totalSkipped++;
    }

    totalScore += marks;
    totalTimeTaken += timeSpent;

    // Question result
    const qResult: QuestionResult = {
      questionId: question.id,
      questionNumber: question.questionNumber,
      subject: question.subject,
      chapter: question.chapter,
      selectedAnswer: attemptData?.selectedAnswer || null,
      correctAnswer: question.correctAnswer,
      isCorrect,
      isAttempted,
      timeSpent,
      marks,
      mistakeTypes: attemptData?.mistakeTypes || [],
      notes: attemptData?.notes || '',
      markedForRevision: attemptData?.markedForRevision || false,
    };
    questionResults.push(qResult);

    // Subject-wise aggregation
    const subject = question.subject;
    subjectWise[subject].total++;
    subjectWise[subject].timeTaken += timeSpent;
    subjectWise[subject].maxScore += test.positiveMarking;
    if (isAttempted) {
      subjectWise[subject].attempted++;
      if (isCorrect) {
        subjectWise[subject].correct++;
        subjectWise[subject].score += marks;
      } else {
        subjectWise[subject].incorrect++;
        subjectWise[subject].score += marks;
      }
    } else {
      subjectWise[subject].skipped++;
    }

    // Chapter-wise aggregation
    const chapterKey = `${subject}-${question.chapter}`;
    if (!chapterWise[chapterKey]) {
      chapterWise[chapterKey] = {
        subject,
        chapter: question.chapter,
        total: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        accuracy: 0,
        timeTaken: 0,
        questionIds: [],
      };
    }
    chapterWise[chapterKey].total++;
    chapterWise[chapterKey].timeTaken += timeSpent;
    chapterWise[chapterKey].questionIds.push(question.id);
    if (isCorrect) {
      chapterWise[chapterKey].correct++;
    } else if (isAttempted) {
      chapterWise[chapterKey].incorrect++;
    } else {
      chapterWise[chapterKey].skipped++;
    }
  });

  // Calculate accuracies
  Object.values(subjectWise).forEach(sr => {
    sr.accuracy = sr.attempted > 0 ? (sr.correct / sr.attempted) * 100 : 0;
  });

  Object.values(chapterWise).forEach(cr => {
    const attempted = cr.correct + cr.incorrect;
    cr.accuracy = attempted > 0 ? (cr.correct / attempted) * 100 : 0;
  });

  const totalAttempted = totalCorrect + totalIncorrect;

  return {
    attemptId: attempt.id,
    testId: test.id,
    testName: test.name,
    completedAt: new Date().toISOString(),
    totalQuestions: test.questions.length,
    attempted: totalAttempted,
    correct: totalCorrect,
    incorrect: totalIncorrect,
    skipped: totalSkipped,
    score: totalScore,
    maxScore: test.questions.length * test.positiveMarking,
    accuracy: totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0,
    timeTaken: totalTimeTaken,
    subjectWise,
    chapterWise,
    questionResults,
  };
}

function isAnswerCorrect(question: Question, selectedAnswer: string): boolean {
  if (!question.correctAnswer) return false;
  const normalize = (value: string) => value.toUpperCase().replace(/\s+/g, '');
  if (question.type === 'MSQ') {
    const toSet = (value: string) => new Set(value.toUpperCase().replace(/[^A-D]/g, '').split('').filter(Boolean));
    const selected = toSet(selectedAnswer);
    const correct = toSet(question.correctAnswer);
    return selected.size === correct.size && [...selected].every((v) => correct.has(v));
  }
  if (question.type === 'Numerical') {
    const a = Number(selectedAnswer);
    const b = Number(question.correctAnswer);
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) < 1e-6;
  }
  return normalize(selectedAnswer) === normalize(question.correctAnswer);
}

function createEmptySubjectResult(): SubjectResult {
  return {
    total: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    score: 0,
    maxScore: 0,
    accuracy: 0,
    timeTaken: 0,
  };
}

export function calculateMistakeAnalysis(results: TestResult[]): MistakeAnalysis {
  const analysis: MistakeAnalysis = {
    totalMistakes: 0,
    byType: {} as Record<MistakeType, number>,
    bySubject: {
      Physics: {} as Record<MistakeType, number>,
      Chemistry: {} as Record<MistakeType, number>,
      Maths: {} as Record<MistakeType, number>,
    },
    byChapter: {},
    weakConcepts: [],
    weakFormulas: [],
    carelessnessRate: 0,
    timePressureRate: 0,
  };

  const mistakeTypes: MistakeType[] = [
    'concept', 'formula', 'calculation', 'time-management',
    'guessing', 'forgot-concept', 'misread', 'correct-slow', 'perfectly-known'
  ];

  // Initialize counters
  mistakeTypes.forEach(type => {
    analysis.byType[type] = 0;
    (['Physics', 'Chemistry', 'Maths'] as Subject[]).forEach(subject => {
      analysis.bySubject[subject][type] = 0;
    });
  });

  let totalIncorrect = 0;
  let carelessErrors = 0;
  let timePressureErrors = 0;

  results.forEach(result => {
    result.questionResults.forEach(qr => {
      if (!qr.isCorrect && qr.isAttempted) {
        totalIncorrect++;
        
        qr.mistakeTypes.forEach(mt => {
          analysis.totalMistakes++;
          analysis.byType[mt] = (analysis.byType[mt] || 0) + 1;
          analysis.bySubject[qr.subject][mt] = (analysis.bySubject[qr.subject][mt] || 0) + 1;
          
          const chapterKey = `${qr.subject}-${qr.chapter}`;
          if (!analysis.byChapter[chapterKey]) {
            analysis.byChapter[chapterKey] = {} as Record<MistakeType, number>;
          }
          analysis.byChapter[chapterKey][mt] = (analysis.byChapter[chapterKey][mt] || 0) + 1;

          // Categorize
          if (mt === 'calculation' || mt === 'misread') {
            carelessErrors++;
          }
          if (mt === 'time-management') {
            timePressureErrors++;
          }
          if (mt === 'concept' || mt === 'forgot-concept') {
            if (!analysis.weakConcepts.includes(qr.chapter)) {
              analysis.weakConcepts.push(qr.chapter);
            }
          }
          if (mt === 'formula') {
            if (!analysis.weakFormulas.includes(qr.chapter)) {
              analysis.weakFormulas.push(qr.chapter);
            }
          }
        });
      }
    });
  });

  analysis.carelessnessRate = totalIncorrect > 0 ? (carelessErrors / totalIncorrect) * 100 : 0;
  analysis.timePressureRate = totalIncorrect > 0 ? (timePressureErrors / totalIncorrect) * 100 : 0;

  return analysis;
}

export function createMistakeBookEntry(
  question: Question,
  testId: string,
  testName: string,
  selectedAnswer: string | null,
  mistakeTypes: MistakeType[],
  notes: string
): MistakeBookEntry {
  return {
    id: generateId(),
    questionId: question.id,
    testId,
    testName,
    addedAt: new Date().toISOString(),
    question,
    selectedAnswer,
    correctAnswer: question.correctAnswer,
    mistakeTypes,
    notes,
    reattemptCount: 0,
    mastered: false,
  };
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function getSubjectColor(subject: Subject): string {
  switch (subject) {
    case 'Physics': return 'physics';
    case 'Chemistry': return 'chemistry';
    case 'Maths': return 'maths';
  }
}

export function getMistakeTypeLabel(type: MistakeType): string {
  const labels: Record<MistakeType, string> = {
    'concept': 'Concept Mistake',
    'formula': 'Formula Not Remembered',
    'calculation': 'Calculation / Silly Mistake',
    'time-management': 'Time Management Issue',
    'guessing': 'Guessing',
    'forgot-concept': 'Forgot Concept',
    'misread': 'Question Misread',
    'correct-slow': 'Correct but Slow',
    'perfectly-known': 'Perfectly Known',
  };
  return labels[type];
}

export function getMistakeTypeColor(type: MistakeType): string {
  const colors: Record<MistakeType, string> = {
    'concept': '#ef4444',
    'formula': '#f97316',
    'calculation': '#eab308',
    'time-management': '#3b82f6',
    'guessing': '#8b5cf6',
    'forgot-concept': '#ec4899',
    'misread': '#14b8a6',
    'correct-slow': '#22c55e',
    'perfectly-known': '#06b6d4',
  };
  return colors[type];
}
