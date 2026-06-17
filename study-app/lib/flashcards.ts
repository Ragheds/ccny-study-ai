import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";

export type FlashcardDraft = {
  front: string;
  back: string;
};

export type Flashcard = FlashcardDraft & {
  id: string;
};

export type FlashcardSet = {
  id: string;
  courseCode: string;
  courseName: string;
  courseSection: string;
  majorCode: string;
  majorName: string;
  school: string;
  sourcePrompt: string;
  cards: Flashcard[];
  createdAt: number;
  updatedAt: number;
};

export type FlashcardStore = {
  version: 1;
  setsByCourse: Record<string, FlashcardSet>;
};

export const FLASHCARD_TARGET_COUNT = 20;

export const EMPTY_FLASHCARD_STORE: FlashcardStore = {
  version: 1,
  setsByCourse: {},
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanCardText(value: string): string {
  return value
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();
}

export function parseFlashcardsFromText(raw: string): FlashcardDraft[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const cards: FlashcardDraft[] = [];
  const pattern =
    /(?:^|\n)\s*(?:\d+[\).\s-]*)?\*{0,2}FRONT\*{0,2}:\s*([\s\S]*?)\n\s*(?:\d+[\).\s-]*)?\*{0,2}BACK\*{0,2}:\s*([\s\S]*?)(?=\n\s*(?:-{3,}|\d+[\).\s-]*\*{0,2}FRONT\*{0,2}:|\*{0,2}FRONT\*{0,2}:)|$)/gi;

  for (const match of normalized.matchAll(pattern)) {
    const front = cleanCardText(match[1]);
    const back = cleanCardText(match[2]);

    if (front && back) {
      cards.push({ front, back });
    }
  }

  return cards.slice(0, FLASHCARD_TARGET_COUNT);
}

export function createFlashcardSet(
  course: SavedCourse,
  major: SavedMajor,
  drafts: FlashcardDraft[],
  sourcePrompt: string
): FlashcardSet {
  const timestamp = Date.now();

  return {
    id: createId("flashcard_set"),
    courseCode: course.code,
    courseName: course.name,
    courseSection: course.section,
    majorCode: major.code,
    majorName: major.name,
    school: major.school,
    sourcePrompt,
    cards: drafts.slice(0, FLASHCARD_TARGET_COUNT).map((draft, index) => ({
      id: `${course.code.replace(/\s+/g, "_")}_${timestamp}_${index + 1}`,
      front: draft.front,
      back: draft.back,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function upsertFlashcardSet(
  store: FlashcardStore,
  flashcardSet: FlashcardSet
): FlashcardStore {
  return {
    version: 1,
    setsByCourse: {
      ...store.setsByCourse,
      [flashcardSet.courseCode]: flashcardSet,
    },
  };
}

export function formatFlashcardDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
