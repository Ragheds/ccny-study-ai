import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";

export type QuizQuestionResult = {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  userAnswer: string;
};

export type QuizAttempt = {
  id: string;
  title: string;
  topic: string;
  courseCode: string;
  courseName: string;
  courseSection: string;
  majorCode: string;
  majorName: string;
  school: string;
  questions: QuizQuestionResult[];
  correctCount: number;
  totalQuestions: number;
  createdAt: number;
};

export type QuizStore = {
  version: 1;
  attemptsById: Record<string, QuizAttempt>;
  attemptIdsByCourse: Record<string, string[]>;
};

export type QuizAttemptGroup = {
  label: "Today" | "Yesterday" | "Last Week" | "Older";
  attempts: QuizAttempt[];
};

export const EMPTY_QUIZ_STORE: QuizStore = {
  version: 1,
  attemptsById: {},
  attemptIdsByCourse: {},
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneStore(store: QuizStore): QuizStore {
  return {
    version: 1,
    attemptsById: { ...store.attemptsById },
    attemptIdsByCourse: Object.fromEntries(
      Object.entries(store.attemptIdsByCourse).map(([courseCode, ids]) => [courseCode, [...ids]])
    ),
  };
}

export function normalizeQuizStore(store: Partial<QuizStore> | undefined | null): QuizStore {
  if (store?.version === 1 && store.attemptsById && store.attemptIdsByCourse) {
    return cloneStore(store as QuizStore);
  }
  return cloneStore(EMPTY_QUIZ_STORE);
}

export function createQuizAttempt(
  course: SavedCourse,
  major: SavedMajor,
  topic: string,
  questions: QuizQuestionResult[]
): QuizAttempt {
  const correctCount = questions.filter(
    (q) => q.userAnswer.toUpperCase() === q.correctAnswer.toUpperCase()
  ).length;

  return {
    id: createId("quiz_attempt"),
    title: topic.trim() || `${course.code} review`,
    topic: topic.trim(),
    courseCode: course.code,
    courseName: course.name,
    courseSection: course.section,
    majorCode: major.code,
    majorName: major.name,
    school: major.school,
    questions,
    correctCount,
    totalQuestions: questions.length,
    createdAt: Date.now(),
  };
}

export function addQuizAttempt(store: QuizStore, attempt: QuizAttempt): QuizStore {
  const next = cloneStore(normalizeQuizStore(store));
  const ids = next.attemptIdsByCourse[attempt.courseCode] ?? [];

  next.attemptsById[attempt.id] = attempt;
  next.attemptIdsByCourse[attempt.courseCode] = [attempt.id, ...ids.filter((id) => id !== attempt.id)];

  return next;
}

export function deleteQuizAttempt(store: QuizStore, attemptId: string): QuizStore {
  const attempt = store.attemptsById[attemptId];
  if (!attempt) return store;

  const next = cloneStore(store);
  delete next.attemptsById[attemptId];
  next.attemptIdsByCourse[attempt.courseCode] = (next.attemptIdsByCourse[attempt.courseCode] ?? []).filter(
    (id) => id !== attemptId
  );

  return next;
}

export function getCourseQuizAttempts(store: QuizStore, courseCode: string): QuizAttempt[] {
  return (store.attemptIdsByCourse[courseCode] ?? [])
    .map((id) => store.attemptsById[id])
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function groupQuizAttemptsByDate(attempts: QuizAttempt[]): QuizAttemptGroup[] {
  const now = Date.now();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastWeek = today - 7 * 24 * 60 * 60 * 1000;

  const groups: QuizAttemptGroup[] = [
    { label: "Today", attempts: [] },
    { label: "Yesterday", attempts: [] },
    { label: "Last Week", attempts: [] },
    { label: "Older", attempts: [] },
  ];

  for (const attempt of attempts) {
    if (attempt.createdAt >= today) groups[0].attempts.push(attempt);
    else if (attempt.createdAt >= yesterday) groups[1].attempts.push(attempt);
    else if (attempt.createdAt >= lastWeek) groups[2].attempts.push(attempt);
    else groups[3].attempts.push(attempt);
  }

  return groups.filter((group) => group.attempts.length > 0);
}

export function formatQuizDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}