// Local storage utilities for persistent exam data

import { Test, TestAttempt, TestResult, MistakeBookEntry, WeeklyPlan, ExamStore, AnswerKey } from '@/types/exam';

const STORAGE_KEYS = {
  TESTS: 'jee_cbt_tests',
  ATTEMPTS: 'jee_cbt_attempts',
  RESULTS: 'jee_cbt_results',
  MISTAKE_BOOK: 'jee_cbt_mistake_book',
  WEEKLY_PLANS: 'jee_cbt_weekly_plans',
  CURRENT_ATTEMPT: 'jee_cbt_current_attempt',
  SHARE_CODES: 'jee_cbt_share_codes',
} as const;

const PDF_IMAGE_DB = 'aspirantai_pdf_assets_v1';
const PDF_IMAGE_STORE = 'page_images';

// Generic storage helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error);
  }
}

// Tests
export function getTests(): Test[] {
  return getItem<Test[]>(STORAGE_KEYS.TESTS, []);
}

export function saveTest(test: Test): void {
  const tests = getTests();
  const existingIndex = tests.findIndex(t => t.id === test.id);
  if (existingIndex >= 0) {
    tests[existingIndex] = test;
  } else {
    tests.push(test);
  }
  setItem(STORAGE_KEYS.TESTS, tests);
}

export function updateTestAnswerKey(testId: string, answerKey: AnswerKey): void {
  const tests = getTests();
  const testIndex = tests.findIndex(t => t.id === testId);
  if (testIndex >= 0) {
    tests[testIndex].answerKey = answerKey;
    tests[testIndex].hasAnswerKey = Object.keys(answerKey).length > 0;
    
    // Also apply to questions
    tests[testIndex].questions = tests[testIndex].questions.map(q => ({
      ...q,
      correctAnswer: answerKey[String(q.questionNumber)] || answerKey[q.id] || q.correctAnswer,
    }));
    
    setItem(STORAGE_KEYS.TESTS, tests);
  }
}

export function generateShareCode(testId: string): string {
  const code = `TEST-${testId.slice(0, 8).toUpperCase()}`;
  const shareCodes = getItem<Record<string, string>>(STORAGE_KEYS.SHARE_CODES, {});
  shareCodes[code] = testId;
  setItem(STORAGE_KEYS.SHARE_CODES, shareCodes);
  
  // Update test with share code
  const tests = getTests();
  const testIndex = tests.findIndex(t => t.id === testId);
  if (testIndex >= 0) {
    tests[testIndex].shareCode = code;
    setItem(STORAGE_KEYS.TESTS, tests);
  }
  
  return code;
}

export function getTestByShareCode(shareCode: string): Test | null {
  const shareCodes = getItem<Record<string, string>>(STORAGE_KEYS.SHARE_CODES, {});
  const testId = shareCodes[shareCode];
  return testId ? getTestById(testId) : null;
}

export function deleteTest(testId: string): void {
  const tests = getTests().filter(t => t.id !== testId);
  setItem(STORAGE_KEYS.TESTS, tests);
}

export function getTestById(testId: string): Test | null {
  return getTests().find(t => t.id === testId) || null;
}

// Test Attempts
export function getAttempts(): TestAttempt[] {
  return getItem<TestAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
}

export function saveAttempt(attempt: TestAttempt): void {
  const attempts = getAttempts();
  const existingIndex = attempts.findIndex(a => a.id === attempt.id);
  if (existingIndex >= 0) {
    attempts[existingIndex] = attempt;
  } else {
    attempts.push(attempt);
  }
  setItem(STORAGE_KEYS.ATTEMPTS, attempts);
}

export function getCurrentAttempt(): TestAttempt | null {
  return getItem<TestAttempt | null>(STORAGE_KEYS.CURRENT_ATTEMPT, null);
}

export function setCurrentAttempt(attempt: TestAttempt | null): void {
  setItem(STORAGE_KEYS.CURRENT_ATTEMPT, attempt);
}

export function clearCurrentAttempt(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_ATTEMPT);
}

// Test Results
export function getResults(): TestResult[] {
  return getItem<TestResult[]>(STORAGE_KEYS.RESULTS, []);
}

export function saveResult(result: TestResult): void {
  const results = getResults();
  const existingIndex = results.findIndex(r => r.attemptId === result.attemptId);
  if (existingIndex >= 0) {
    results[existingIndex] = result;
  } else {
    results.push(result);
  }
  setItem(STORAGE_KEYS.RESULTS, results);
}

export function getResultById(attemptId: string): TestResult | null {
  return getResults().find(r => r.attemptId === attemptId) || null;
}

export function getResultsByTestId(testId: string): TestResult[] {
  return getResults().filter(r => r.testId === testId);
}

// Mistake Book
export function getMistakeBook(): MistakeBookEntry[] {
  return getItem<MistakeBookEntry[]>(STORAGE_KEYS.MISTAKE_BOOK, []);
}

export function addToMistakeBook(entry: MistakeBookEntry): void {
  const book = getMistakeBook();
  const existingIndex = book.findIndex(e => e.questionId === entry.questionId);
  if (existingIndex >= 0) {
    // Update existing entry
    book[existingIndex] = {
      ...book[existingIndex],
      ...entry,
      reattemptCount: book[existingIndex].reattemptCount,
    };
  } else {
    book.push(entry);
  }
  setItem(STORAGE_KEYS.MISTAKE_BOOK, book);
}

export function updateMistakeBookEntry(id: string, updates: Partial<MistakeBookEntry>): void {
  const book = getMistakeBook();
  const index = book.findIndex(e => e.id === id);
  if (index >= 0) {
    book[index] = { ...book[index], ...updates };
    setItem(STORAGE_KEYS.MISTAKE_BOOK, book);
  }
}

export function removeFromMistakeBook(id: string): void {
  const book = getMistakeBook().filter(e => e.id !== id);
  setItem(STORAGE_KEYS.MISTAKE_BOOK, book);
}

// Weekly Plans
export function getWeeklyPlans(): WeeklyPlan[] {
  return getItem<WeeklyPlan[]>(STORAGE_KEYS.WEEKLY_PLANS, []);
}

export function saveWeeklyPlan(plan: WeeklyPlan): void {
  const plans = getWeeklyPlans();
  plans.unshift(plan); // Add to beginning
  // Keep only last 10 plans
  setItem(STORAGE_KEYS.WEEKLY_PLANS, plans.slice(0, 10));
}

export function getCurrentWeeklyPlan(): WeeklyPlan | null {
  const plans = getWeeklyPlans();
  if (plans.length === 0) return null;
  
  const now = new Date();
  const currentPlan = plans.find(p => {
    const start = new Date(p.weekStartDate);
    const end = new Date(p.weekEndDate);
    return now >= start && now <= end;
  });
  
  return currentPlan || plans[0];
}

// Full store export/import
export function exportStore(): ExamStore {
  return {
    tests: getTests(),
    attempts: getAttempts(),
    results: getResults(),
    mistakeBook: getMistakeBook(),
    weeklyPlans: getWeeklyPlans(),
    currentAttempt: getCurrentAttempt(),
  };
}

export function importStore(store: ExamStore): void {
  setItem(STORAGE_KEYS.TESTS, store.tests || []);
  setItem(STORAGE_KEYS.ATTEMPTS, store.attempts || []);
  setItem(STORAGE_KEYS.RESULTS, store.results || []);
  setItem(STORAGE_KEYS.MISTAKE_BOOK, store.mistakeBook || []);
  setItem(STORAGE_KEYS.WEEKLY_PLANS, store.weeklyPlans || []);
  if (store.currentAttempt) {
    setCurrentAttempt(store.currentAttempt);
  }
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function openPdfImageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PDF_IMAGE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(PDF_IMAGE_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTestPdfPageImages(testId: string, pages: NonNullable<Test['pdfPageImages']>): Promise<void> {
  if (!pages.length || typeof indexedDB === 'undefined') return;
  const db = await openPdfImageDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PDF_IMAGE_STORE, 'readwrite');
    tx.objectStore(PDF_IMAGE_STORE).put(pages, testId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadTestPdfPageImages(testId: string): Promise<NonNullable<Test['pdfPageImages']>> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openPdfImageDb();
  const pages = await new Promise<NonNullable<Test['pdfPageImages']>>((resolve, reject) => {
    const request = db.transaction(PDF_IMAGE_STORE, 'readonly').objectStore(PDF_IMAGE_STORE).get(testId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return pages;
}
