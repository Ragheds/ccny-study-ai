"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAppDataContext } from "@/components/AppDataProvider";
import {
  getEffectiveStorageKey,
  isAccountScopedStorageKey,
  KEYS,
  readStorageRaw,
  saveToStorage,
  STORAGE_CHANGE_EVENT,
  type AccountScopedStorageSnapshot,
} from "@/lib/storage";

type StoredValueSetter<T> = (next: T | ((current: T) => T)) => void;

function parseStoredValue<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function subscribeToStorageKey(key: string, onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const isAccountScoped = isAccountScopedStorageKey(key);

  const isRelevantChange = (changedKey: string | null, changedStorageKey?: string | null) => {
    const currentStorageKey = getEffectiveStorageKey(key);

    return (
      changedKey === key ||
      changedKey === currentStorageKey ||
      changedStorageKey === currentStorageKey ||
      Boolean(isAccountScoped && changedKey === KEYS.ACCOUNT)
    );
  };

  const handleStorage = (event: StorageEvent) => {
    if (isRelevantChange(event.key)) onStoreChange();
  };

  const handleLocalChange = (event: Event) => {
    const customEvent = event as CustomEvent<{ key?: string; storageKey?: string }>;
    if (isRelevantChange(customEvent.detail?.key ?? null, customEvent.detail?.storageKey)) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_CHANGE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_CHANGE_EVENT, handleLocalChange);
  };
}

export function useHydrated(): boolean {
  const context = useAppDataContext();
  const clientHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  return Boolean(context?.initial?.hasStudyData) || clientHydrated;
}

export function useStoredValue<T>(key: string, fallback: T): [T, StoredValueSetter<T>] {
  const context = useAppDataContext();
  const initialValue = key === KEYS.ACCOUNT
    ? context?.initial?.account
    : context?.initial?.data[key as keyof AccountScopedStorageSnapshot];
  const initialRaw = initialValue === undefined ? null : JSON.stringify(initialValue);
  const raw = useSyncExternalStore(
    useCallback((onStoreChange) => subscribeToStorageKey(key, onStoreChange), [key]),
    useCallback(() => context && !context.ready ? initialRaw : readStorageRaw(key), [context, initialRaw, key]),
    useCallback(() => initialRaw, [initialRaw])
  );

  const value = useMemo(() => parseStoredValue(raw, fallback), [raw, fallback]);

  const setValue = useCallback<StoredValueSetter<T>>(
    (next) => {
      const current = parseStoredValue(readStorageRaw(key), fallback);
      const resolved = typeof next === "function"
        ? (next as (current: T) => T)(current)
        : next;
      saveToStorage(key, resolved);
    },
    [fallback, key]
  );

  return [value, setValue];
}
