// Centralized storage utility
// Future-ready: swap localStorage calls here to migrate to a database

export const KEYS = {
  ACCOUNT: "ccny_account",
  PROFILE: "ccny_profile",
  MAJOR: "ccny_major",
  COURSES: "ccny_courses",
  CHAT_HISTORY: "ccny_chat_history",
  CHAT_WORKSPACE: "ccny_chat_workspace_v1",
  NOTES: "ccny_notes",
  NOTES_V2: "ccny_notes_v2",          // per-course notes store
  UPLOAD_DRAFT: "ccny_upload_draft",  // persisted upload text
  QUIZ_RESULTS: "ccny_quiz_results",
  FLASHCARDS: "ccny_flashcards",
  PROGRESS: "ccny_progress",
  STUDY_MODE: "ccny_study_mode",
  STUDY_MODE_DISMISSED: "ccny_study_mode_dismissed",
};

export const STORAGE_CHANGE_EVENT = "ccny-storage-change";
const ACCOUNT_SCOPE_PREFIX = "ccny_account_scope_v1";
const LEGACY_STORAGE_OWNER_KEY = "ccny_legacy_storage_owner_v1";
const UPDATED_AT_SUFFIX = ":updated_at";

export const ACCOUNT_SCOPED_STORAGE_KEYS = [
  KEYS.PROFILE,
  KEYS.MAJOR,
  KEYS.COURSES,
  KEYS.CHAT_HISTORY,
  KEYS.CHAT_WORKSPACE,
  KEYS.NOTES,
  KEYS.NOTES_V2,
  KEYS.UPLOAD_DRAFT,
  KEYS.QUIZ_RESULTS,
  KEYS.FLASHCARDS,
  KEYS.PROGRESS,
  KEYS.STUDY_MODE,
  KEYS.STUDY_MODE_DISMISSED,
] as const;

const ACCOUNT_SCOPED_KEYS = new Set<string>(ACCOUNT_SCOPED_STORAGE_KEYS);

export type AccountScopedStorageKey = (typeof ACCOUNT_SCOPED_STORAGE_KEYS)[number];
export type AccountScopedStorageSnapshot = Partial<Record<AccountScopedStorageKey, unknown>>;

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

export function getActiveAccountId(): string | null {
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

export function loadAccountScopedStorageSnapshot(): AccountScopedStorageSnapshot {
  const snapshot: AccountScopedStorageSnapshot = {};

  try {
    if (!canUseStorage()) return snapshot;

    for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
      const raw = localStorage.getItem(getEffectiveStorageKey(key));
      if (raw === null) continue;

      try {
        snapshot[key] = JSON.parse(raw) as unknown;
      } catch (e) {
        console.error(`Storage snapshot parse error for ${key}:`, e);
      }
    }
  } catch (e) {
    console.error("Storage snapshot read error:", e);
  }

  return snapshot;
}

export function hasAccountScopedStorageData(): boolean {
  try {
    if (!canUseStorage()) return false;

    return ACCOUNT_SCOPED_STORAGE_KEYS.some(
      (key) => localStorage.getItem(getEffectiveStorageKey(key)) !== null
    );
  } catch (e) {
    console.error("Storage data check error:", e);
    return false;
  }
}

export function replaceAccountScopedStorageFromSnapshot(
  snapshot: AccountScopedStorageSnapshot
): void {
  try {
    if (!canUseStorage()) return;

    for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
      const storageKey = getEffectiveStorageKey(key);

      if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
        localStorage.setItem(storageKey, JSON.stringify(snapshot[key]));
      } else {
        localStorage.removeItem(storageKey);
      }

      notifyStorageChange(key, storageKey);
    }
  } catch (e) {
    console.error("Storage snapshot hydrate error:", e);
  }
}

// A server snapshot wins over old local data. Local edits made after that
// snapshot stay in place and are uploaded by the account bridge instead.
export function mergeAccountScopedStorageFromSnapshot(
  snapshot: AccountScopedStorageSnapshot,
  remoteUpdatedAt: number
): boolean {
  if (!canUseStorage()) return false;
  let hasNewerLocalData = false;
  for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
    const storageKey = getEffectiveStorageKey(key);
    const localUpdatedAt = Number(localStorage.getItem(`${storageKey}${UPDATED_AT_SUFFIX}`) ?? 0);
    const localRaw = localStorage.getItem(storageKey);
    const remoteValue = snapshot[key];
    // These profile fields are written directly to Supabase; the profile wins
    // over an older browser's whole-state cache on every sign-in.
    const profileOwned = key === KEYS.STUDY_MODE || key === KEYS.STUDY_MODE_DISMISSED;
    // Legacy browser data predates per-key timestamps. If the remote record
    // has no value for a key yet, preserve that data for the one-time import.
    if (!profileOwned && localRaw !== null && localUpdatedAt === 0 &&
        (remoteValue === undefined || remoteValue === null ||
          (typeof remoteValue === "object" && Object.keys(remoteValue).length === 0))) {
      hasNewerLocalData = true;
      continue;
    }
    if (!profileOwned && localUpdatedAt > remoteUpdatedAt) {
      hasNewerLocalData = true;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      localStorage.setItem(storageKey, JSON.stringify(snapshot[key]));
    } else {
      localStorage.removeItem(storageKey);
    }
    localStorage.setItem(`${storageKey}${UPDATED_AT_SUFFIX}`, String(remoteUpdatedAt));
    notifyStorageChange(key, storageKey);
  }
  return hasNewerLocalData;
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    if (!canUseStorage()) return;
    const storageKey = getEffectiveStorageKey(key);
    localStorage.setItem(storageKey, JSON.stringify(value));
    if (isAccountScopedStorageKey(key)) localStorage.setItem(`${storageKey}${UPDATED_AT_SUFFIX}`, String(Date.now()));
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
    if (isAccountScopedStorageKey(key)) localStorage.setItem(`${storageKey}${UPDATED_AT_SUFFIX}`, String(Date.now()));
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
