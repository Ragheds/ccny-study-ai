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
  title: string;
  courseCode: string;
  courseName: string;
  courseSection: string;
  majorCode: string;
  majorName: string;
  school: string;
  sourcePrompt: string;
  focus: string;
  materialName?: string;
  materialIncluded: boolean;
  cards: Flashcard[];
  createdAt: number;
  updatedAt: number;
};

export type FlashcardStore = {
  version: 2;
  activeSetByCourse: Record<string, string | undefined>;
  setsById: Record<string, FlashcardSet>;
  setIdsByCourse: Record<string, string[]>;
};

type LegacyFlashcardStore = {
  version?: number;
  setsByCourse?: Record<string, FlashcardSet>;
  activeSetByCourse?: Record<string, string | undefined>;
  setsById?: Record<string, FlashcardSet>;
  setIdsByCourse?: Record<string, string[]>;
};

export type FlashcardSetGroup = {
  label: "Today" | "Yesterday" | "Last Week" | "Older";
  sets: FlashcardSet[];
};

export const FLASHCARD_TARGET_COUNT = 20;

export const EMPTY_FLASHCARD_STORE: FlashcardStore = {
  version: 2,
  activeSetByCourse: {},
  setsById: {},
  setIdsByCourse: {},
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
  sourcePrompt: string,
  options: {
    focus?: string;
    materialName?: string;
    materialIncluded?: boolean;
  } = {}
): FlashcardSet {
  const timestamp = Date.now();
  const focus = options.focus?.trim() ?? "";
  const title = focus || (options.materialIncluded ? "Uploaded material review" : "Course review");

  return {
    id: createId("flashcard_set"),
    title,
    courseCode: course.code,
    courseName: course.name,
    courseSection: course.section,
    majorCode: major.code,
    majorName: major.name,
    school: major.school,
    sourcePrompt,
    focus,
    materialName: options.materialName,
    materialIncluded: options.materialIncluded ?? false,
    cards: drafts.slice(0, FLASHCARD_TARGET_COUNT).map((draft, index) => ({
      id: `${course.code.replace(/\s+/g, "_")}_${timestamp}_${index + 1}`,
      front: draft.front,
      back: draft.back,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function cloneStore(store: FlashcardStore): FlashcardStore {
  return {
    version: 2,
    activeSetByCourse: { ...store.activeSetByCourse },
    setsById: { ...store.setsById },
    setIdsByCourse: Object.fromEntries(
      Object.entries(store.setIdsByCourse).map(([courseCode, ids]) => [
        courseCode,
        [...ids],
      ])
    ),
  };
}

export function normalizeFlashcardStore(store: LegacyFlashcardStore): FlashcardStore {
  if (store.version === 2 && store.setsById && store.setIdsByCourse) {
    return {
      version: 2,
      activeSetByCourse: { ...(store.activeSetByCourse ?? {}) },
      setsById: { ...store.setsById },
      setIdsByCourse: Object.fromEntries(
        Object.entries(store.setIdsByCourse).map(([courseCode, ids]) => [
          courseCode,
          [...ids],
        ])
      ),
    };
  }

  const next = cloneStore(EMPTY_FLASHCARD_STORE);
  const legacySets = store.setsByCourse ?? {};

  for (const set of Object.values(legacySets)) {
    next.setsById[set.id] = {
      ...set,
      title: set.title ?? "Course review",
      focus: set.focus ?? "",
      materialIncluded: set.materialIncluded ?? false,
    };
    next.setIdsByCourse[set.courseCode] = [set.id];
    next.activeSetByCourse[set.courseCode] = set.id;
  }

  return next;
}

export function addFlashcardSet(
  store: FlashcardStore,
  flashcardSet: FlashcardSet
): FlashcardStore {
  const next = cloneStore(normalizeFlashcardStore(store));
  const ids = next.setIdsByCourse[flashcardSet.courseCode] ?? [];

  next.setsById[flashcardSet.id] = flashcardSet;
  next.setIdsByCourse[flashcardSet.courseCode] = [
    flashcardSet.id,
    ...ids.filter((id) => id !== flashcardSet.id),
  ];
  next.activeSetByCourse[flashcardSet.courseCode] = flashcardSet.id;

  return next;
}

export function selectFlashcardSet(
  store: FlashcardStore,
  courseCode: string,
  setId: string
): FlashcardStore {
  if (!store.setsById[setId]) return store;

  return {
    ...cloneStore(store),
    activeSetByCourse: {
      ...store.activeSetByCourse,
      [courseCode]: setId,
    },
  };
}

export function clearActiveFlashcardSet(
  store: FlashcardStore,
  courseCode: string
): FlashcardStore {
  const next = cloneStore(store);
  delete next.activeSetByCourse[courseCode];
  return next;
}

export function renameFlashcardSet(
  store: FlashcardStore,
  setId: string,
  title: string
): FlashcardStore {
  const flashcardSet = store.setsById[setId];
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (!flashcardSet || !cleaned) return store;

  const next = cloneStore(store);
  next.setsById[setId] = {
    ...flashcardSet,
    title: cleaned,
    updatedAt: Date.now(),
  };

  return next;
}

export function deleteFlashcardSet(store: FlashcardStore, setId: string): FlashcardStore {
  const flashcardSet = store.setsById[setId];
  if (!flashcardSet) return store;

  const next = cloneStore(store);
  delete next.setsById[setId];
  next.setIdsByCourse[flashcardSet.courseCode] = (
    next.setIdsByCourse[flashcardSet.courseCode] ?? []
  ).filter((id) => id !== setId);

  if (next.activeSetByCourse[flashcardSet.courseCode] === setId) {
    next.activeSetByCourse[flashcardSet.courseCode] =
      next.setIdsByCourse[flashcardSet.courseCode]?.[0];
  }

  return next;
}

export function getCourseFlashcardSets(
  store: FlashcardStore,
  courseCode: string
): FlashcardSet[] {
  return (store.setIdsByCourse[courseCode] ?? [])
    .map((id) => store.setsById[id])
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getActiveFlashcardSet(
  store: FlashcardStore,
  courseCode: string
): FlashcardSet | undefined {
  const activeId = store.activeSetByCourse[courseCode];
  return activeId ? store.setsById[activeId] : getCourseFlashcardSets(store, courseCode)[0];
}

export function groupFlashcardSetsByDate(sets: FlashcardSet[]): FlashcardSetGroup[] {
  const now = Date.now();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastWeek = today - 7 * 24 * 60 * 60 * 1000;

  const groups: FlashcardSetGroup[] = [
    { label: "Today", sets: [] },
    { label: "Yesterday", sets: [] },
    { label: "Last Week", sets: [] },
    { label: "Older", sets: [] },
  ];

  for (const set of sets) {
    if (set.updatedAt >= today) {
      groups[0].sets.push(set);
    } else if (set.updatedAt >= yesterday) {
      groups[1].sets.push(set);
    } else if (set.updatedAt >= lastWeek) {
      groups[2].sets.push(set);
    } else {
      groups[3].sets.push(set);
    }
  }

  return groups.filter((group) => group.sets.length > 0);
}

export function formatFlashcardDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
