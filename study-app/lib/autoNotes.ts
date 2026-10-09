export type AutoNote = {
  id: string;
  sourceId: string;
  source: "chat" | "lesson";
  text: string;
  pinned: boolean;
  createdAt: number;
};
export type CourseNotes = {
  text: string;
  summary: string;
  updatedAt: number;
  autoNotes?: AutoNote[];
};
export type AutoNotesStore = Record<string, CourseNotes>;
export function captureTaughtNote(
  store: AutoNotesStore,
  courseCode: string,
  sourceId: string,
  text: string,
  source: AutoNote["source"] = "chat",
  now = Date.now(),
): AutoNotesStore {
  if (!text.trim() || text.length < 40) return store;
  const current = store[courseCode] ?? { text: "", summary: "", updatedAt: 0 };
  const notes = current.autoNotes ?? [];
  if (notes.some((note) => note.sourceId === sourceId)) return store;
  const note: AutoNote = {
    id: sourceId,
    sourceId,
    source,
    text: text.slice(0, 5000),
    pinned: false,
    createdAt: now,
  };
  const pinned = notes.filter((item) => item.pinned);
  const unpinned = notes.filter((item) => !item.pinned);
  return {
    ...store,
    [courseCode]: {
      ...current,
      updatedAt: now,
      autoNotes: [...pinned, ...unpinned.slice(-19), note],
    },
  };
}
