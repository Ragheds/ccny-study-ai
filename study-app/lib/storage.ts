// Centralized storage utility
// Future-ready: swap localStorage calls here to migrate to a database

export const KEYS = {
  MAJOR: "ccny_major",
  COURSES: "ccny_courses",
  CHAT_HISTORY: "ccny_chat_history",
  NOTES: "ccny_notes",
  QUIZ_RESULTS: "ccny_quiz_results",
  FLASHCARDS: "ccny_flashcards",
  PROGRESS: "ccny_progress",
};

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage save error:", e);
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (e) {
    console.error("Storage load error:", e);
    return fallback;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error("Storage remove error:", e);
  }
}