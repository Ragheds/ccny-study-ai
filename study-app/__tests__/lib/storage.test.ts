import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  KEYS,
  STORAGE_CHANGE_EVENT,
  isAccountScopedStorageKey,
  getEffectiveStorageKey,
  getActiveAccountId,
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  readStorageRaw,
  migrateLegacyStorageToAccount,
  loadAccountScopedStorageSnapshot,
  hasAccountScopedStorageData,
  replaceAccountScopedStorageFromSnapshot,
} from "@/lib/storage";

beforeEach(() => {
  localStorage.clear();
});

describe("KEYS", () => {
  it("has expected storage keys", () => {
    expect(KEYS.ACCOUNT).toBe("ccny_account");
    expect(KEYS.COURSES).toBe("ccny_courses");
    expect(KEYS.FLASHCARDS).toBe("ccny_flashcards");
    expect(KEYS.CHAT_WORKSPACE).toBe("ccny_chat_workspace_v1");
  });
});

describe("isAccountScopedStorageKey", () => {
  it("returns true for scoped keys", () => {
    expect(isAccountScopedStorageKey(KEYS.PROFILE)).toBe(true);
    expect(isAccountScopedStorageKey(KEYS.COURSES)).toBe(true);
    expect(isAccountScopedStorageKey(KEYS.FLASHCARDS)).toBe(true);
  });

  it("returns false for non-scoped keys", () => {
    expect(isAccountScopedStorageKey(KEYS.ACCOUNT)).toBe(false);
    expect(isAccountScopedStorageKey("random_key")).toBe(false);
  });
});

describe("getActiveAccountId", () => {
  it("returns account id when stored", () => {
    localStorage.setItem(KEYS.ACCOUNT, JSON.stringify({ id: "user-123" }));
    expect(getActiveAccountId()).toBe("user-123");
  });

  it("returns null when no account is stored", () => {
    expect(getActiveAccountId()).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    localStorage.setItem(KEYS.ACCOUNT, "not-json");
    expect(getActiveAccountId()).toBeNull();
  });

  it("returns null for non-object values", () => {
    localStorage.setItem(KEYS.ACCOUNT, JSON.stringify("string-value"));
    expect(getActiveAccountId()).toBeNull();
  });

  it("returns null for empty id", () => {
    localStorage.setItem(KEYS.ACCOUNT, JSON.stringify({ id: "  " }));
    expect(getActiveAccountId()).toBeNull();
  });

  it("returns null for non-string id", () => {
    localStorage.setItem(KEYS.ACCOUNT, JSON.stringify({ id: 123 }));
    expect(getActiveAccountId()).toBeNull();
  });
});

describe("getEffectiveStorageKey", () => {
  it("returns key as-is for non-scoped keys", () => {
    expect(getEffectiveStorageKey(KEYS.ACCOUNT)).toBe(KEYS.ACCOUNT);
  });

  it("returns account-scoped key when user is logged in", () => {
    localStorage.setItem(KEYS.ACCOUNT, JSON.stringify({ id: "user-abc" }));
    const key = getEffectiveStorageKey(KEYS.COURSES);
    expect(key).toContain("user-abc");
    expect(key).toContain(KEYS.COURSES);
  });

  it("returns guest-scoped key when no user is logged in", () => {
    const key = getEffectiveStorageKey(KEYS.COURSES);
    expect(key).toContain("guest");
    expect(key).toContain(KEYS.COURSES);
  });
});

describe("saveToStorage and loadFromStorage", () => {
  it("saves and loads a value", () => {
    saveToStorage(KEYS.ACCOUNT, { id: "test", name: "Test" });
    const loaded = loadFromStorage(KEYS.ACCOUNT, null);
    expect(loaded).toEqual({ id: "test", name: "Test" });
  });

  it("returns fallback when key does not exist", () => {
    const result = loadFromStorage("nonexistent_key_xyz", "default");
    expect(result).toBe("default");
  });

  it("returns fallback when stored value is invalid JSON", () => {
    localStorage.setItem(KEYS.ACCOUNT, "invalid-json{");
    expect(loadFromStorage(KEYS.ACCOUNT, "fallback")).toBe("fallback");
  });

  it("dispatches custom storage change event on save", () => {
    const handler = vi.fn();
    window.addEventListener(STORAGE_CHANGE_EVENT, handler);
    saveToStorage(KEYS.ACCOUNT, { test: true });
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(STORAGE_CHANGE_EVENT, handler);
  });

  it("saves account-scoped data when user is logged in", () => {
    localStorage.setItem(KEYS.ACCOUNT, JSON.stringify({ id: "user-save" }));
    saveToStorage(KEYS.COURSES, ["CSC 101"]);
    const loaded = loadFromStorage(KEYS.COURSES, []);
    expect(loaded).toEqual(["CSC 101"]);
  });
});

describe("removeFromStorage", () => {
  it("removes a stored value", () => {
    saveToStorage(KEYS.ACCOUNT, { data: "hello" });
    removeFromStorage(KEYS.ACCOUNT);
    expect(loadFromStorage(KEYS.ACCOUNT, null)).toBeNull();
  });

  it("dispatches custom storage change event on remove", () => {
    const handler = vi.fn();
    window.addEventListener(STORAGE_CHANGE_EVENT, handler);
    removeFromStorage(KEYS.ACCOUNT);
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(STORAGE_CHANGE_EVENT, handler);
  });
});

describe("readStorageRaw", () => {
  it("returns raw string value", () => {
    saveToStorage(KEYS.ACCOUNT, { key: "value" });
    const raw = readStorageRaw(KEYS.ACCOUNT);
    expect(raw).toBe(JSON.stringify({ key: "value" }));
  });

  it("returns null for missing key", () => {
    expect(readStorageRaw("missing_key_xyz")).toBeNull();
  });
});

describe("migrateLegacyStorageToAccount", () => {
  it("migrates legacy data to account-scoped keys", () => {
    localStorage.setItem(KEYS.COURSES, JSON.stringify(["CSC101"]));
    localStorage.setItem(KEYS.NOTES, JSON.stringify(["note1"]));

    migrateLegacyStorageToAccount("user-migrate");

    const scopedKey = `ccny_account_scope_v1:user:user-migrate:${KEYS.COURSES}`;
    expect(localStorage.getItem(scopedKey)).toBe(JSON.stringify(["CSC101"]));
  });

  it("does not overwrite existing scoped data", () => {
    const scopedKey = `ccny_account_scope_v1:user:user-existing:${KEYS.COURSES}`;
    localStorage.setItem(scopedKey, JSON.stringify(["existing"]));
    localStorage.setItem(KEYS.COURSES, JSON.stringify(["legacy"]));

    migrateLegacyStorageToAccount("user-existing");

    expect(localStorage.getItem(scopedKey)).toBe(JSON.stringify(["existing"]));
  });

  it("does nothing for empty accountId", () => {
    localStorage.setItem(KEYS.COURSES, JSON.stringify(["data"]));
    migrateLegacyStorageToAccount("");
    // Should not migrate
    const scopedKey = `ccny_account_scope_v1:user::${KEYS.COURSES}`;
    expect(localStorage.getItem(scopedKey)).toBeNull();
  });
});

describe("loadAccountScopedStorageSnapshot", () => {
  it("returns snapshot of all scoped keys for logged-in user", () => {
    localStorage.setItem(KEYS.ACCOUNT, JSON.stringify({ id: "user-snap" }));
    const scopedKey = `ccny_account_scope_v1:user:user-snap:${KEYS.COURSES}`;
    localStorage.setItem(scopedKey, JSON.stringify(["CSC 101"]));

    const snapshot = loadAccountScopedStorageSnapshot();
    expect(snapshot[KEYS.COURSES]).toEqual(["CSC 101"]);
  });

  it("returns empty object when no data stored", () => {
    const snapshot = loadAccountScopedStorageSnapshot();
    expect(Object.keys(snapshot)).toHaveLength(0);
  });
});

describe("hasAccountScopedStorageData", () => {
  it("returns true when scoped data exists", () => {
    const guestKey = `ccny_account_scope_v1:guest:${KEYS.COURSES}`;
    localStorage.setItem(guestKey, JSON.stringify(["data"]));
    expect(hasAccountScopedStorageData()).toBe(true);
  });

  it("returns false when no scoped data exists", () => {
    expect(hasAccountScopedStorageData()).toBe(false);
  });
});

describe("replaceAccountScopedStorageFromSnapshot", () => {
  it("replaces all scoped keys from snapshot", () => {
    const snapshot = {
      [KEYS.COURSES]: ["CSC 101", "CSC 202"],
      [KEYS.NOTES]: ["note1"],
    };

    replaceAccountScopedStorageFromSnapshot(snapshot);

    const effectiveCoursesKey = getEffectiveStorageKey(KEYS.COURSES);
    expect(localStorage.getItem(effectiveCoursesKey)).toBe(
      JSON.stringify(["CSC 101", "CSC 202"])
    );
  });

  it("removes keys not present in snapshot", () => {
    const effectiveKey = getEffectiveStorageKey(KEYS.PROGRESS);
    localStorage.setItem(effectiveKey, JSON.stringify({ streak: 5 }));

    replaceAccountScopedStorageFromSnapshot({});

    expect(localStorage.getItem(effectiveKey)).toBeNull();
  });
});
