// Centralized storage utility
// Future-ready: swap localStorage calls here to migrate to a database

export const KEYS = {
  ACCOUNT: "ccny_account",
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
const ACCOUNT_SCOPE_PREFIX = "ccny_account_scope_v1";
const LEGACY_STORAGE_OWNER_KEY = "ccny_legacy_storage_owner_v1";

const ACCOUNT_SCOPED_KEYS = new Set<string>([
  KEYS.MAJOR,
  KEYS.COURSES,
  KEYS.CHAT_HISTORY,
  KEYS.CHAT_WORKSPACE,
  KEYS.NOTES,
  KEYS.QUIZ_RESULTS,
  KEYS.FLASHCARDS,
  KEYS.PROGRESS,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifyStorageChange(key: string, storageKey = key): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key, storageKey } }));
}

function readRawLocalStorage(key: string): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(key);
}

function getActiveAccountId(): string | null {
  try {
    const raw = readRawLocalStorage(KEYS.ACCOUNT);
    if (!raw) return null;
    const account = JSON.parse(raw) as unknown;
    if (!isRecord(account)) return null;
    return typeof account.id === "string" && account.id.trim() ? account.id : null;
  } catch (e) {
    console.error("Account scope read error:", e);
    return null;
  }
}

function getStorageKeyForAccount(key: string, accountId: string): string {
  return `${ACCOUNT_SCOPE_PREFIX}:user:${encodeURIComponent(accountId)}:${key}`;
}

function getGuestStorageKey(key: string): string {
  return `${ACCOUNT_SCOPE_PREFIX}:guest:${key}`;
}

function getLegacyStorageOwner(): string | null {
  try {
    const raw = readRawLocalStorage(LEGACY_STORAGE_OWNER_KEY);
    if (!raw) return null;
    const owner = JSON.parse(raw) as unknown;
    if (!isRecord(owner)) return null;
    return typeof owner.accountId === "string" ? owner.accountId : null;
  } catch (e) {
    console.error("Legacy storage owner read error:", e);
    return null;
  }
}

function claimLegacyStorage(accountId: string): boolean {
  const owner = getLegacyStorageOwner();
  if (owner) return owner === accountId;

  localStorage.setItem(
    LEGACY_STORAGE_OWNER_KEY,
    JSON.stringify({ accountId, claimedAt: Date.now() })
  );
  return true;
}

export function isAccountScopedStorageKey(key: string): boolean {
  return ACCOUNT_SCOPED_KEYS.has(key);
}

export function getEffectiveStorageKey(key: string): string {
  if (!isAccountScopedStorageKey(key)) return key;

  const accountId = getActiveAccountId();
  return accountId ? getStorageKeyForAccount(key, accountId) : getGuestStorageKey(key);
}

export function migrateLegacyStorageToAccount(accountId: string): void {
  try {
    if (!canUseStorage() || !accountId || !claimLegacyStorage(accountId)) return;

    for (const key of ACCOUNT_SCOPED_KEYS) {
      const legacyRaw = localStorage.getItem(key);
      if (legacyRaw === null) continue;

      const scopedKey = getStorageKeyForAccount(key, accountId);
      if (localStorage.getItem(scopedKey) !== null) continue;

      localStorage.setItem(scopedKey, legacyRaw);
      notifyStorageChange(key, scopedKey);
    }
  } catch (e) {
    console.error("Legacy storage migration error:", e);
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    if (!canUseStorage()) return;
    const storageKey = getEffectiveStorageKey(key);
    localStorage.setItem(storageKey, JSON.stringify(value));
    notifyStorageChange(key, storageKey);
  } catch (e) {
    console.error("Storage save error:", e);
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (!canUseStorage()) return fallback;
    const item = localStorage.getItem(getEffectiveStorageKey(key));
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (e) {
    console.error("Storage load error:", e);
    return fallback;
  }
}

export function removeFromStorage(key: string): void {
  try {
    if (!canUseStorage()) return;
    const storageKey = getEffectiveStorageKey(key);
    localStorage.removeItem(storageKey);
    notifyStorageChange(key, storageKey);
  } catch (e) {
    console.error("Storage remove error:", e);
  }
}

export function readStorageRaw(key: string): string | null {
  try {
    if (!canUseStorage()) return null;
    return localStorage.getItem(getEffectiveStorageKey(key));
  } catch (e) {
    console.error("Storage raw read error:", e);
    return null;
  }
}
