// Centralized storage utility
// Future-ready: swap localStorage calls here to migrate to a database

export const KEYS = {
  MAJOR: "ccny_major",
  COURSES: "ccny_courses",
  CHAT_HISTORY: "ccny_chat_history",
  CHAT_WORKSPACE: "ccny_chat_workspace_v1",
  NOTES: "ccny_notes",
  QUIZ_RESULTS: "ccny_quiz_results",
  FLASHCARDS: "ccny_flashcards",
  PROGRESS: "ccny_progress",
};

export const STORAGE_CHANGE_EVENT = "ccny-storage-change";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifyStorageChange(key: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    if (!canUseStorage()) return;
    localStorage.setItem(key, JSON.stringify(value));
    notifyStorageChange(key);
  } catch (e) {
    console.error("Storage save error:", e);
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (!canUseStorage()) return fallback;
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (e) {
    console.error("Storage load error:", e);
    return fallback;
  }
}

export function removeFromStorage(key: string): void {
  try {
    if (!canUseStorage()) return;
    localStorage.removeItem(key);
    notifyStorageChange(key);
  } catch (e) {
    console.error("Storage remove error:", e);
  }
}

export function readStorageRaw(key: string): string | null {
  try {
    if (!canUseStorage()) return null;
    return localStorage.getItem(key);
  } catch (e) {
    console.error("Storage raw read error:", e);
    return null;
  }
}