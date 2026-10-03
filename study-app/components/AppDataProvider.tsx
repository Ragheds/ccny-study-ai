"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ServerStudyState } from "@/lib/supabase/serverStudyState";
import { KEYS, mergeAccountScopedStorageFromSnapshot, saveToStorage } from "@/lib/storage";

type AppDataContextValue = { initial: ServerStudyState | null; ready: boolean };
const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppDataContext() {
  return useContext(AppDataContext);
}

export function AppDataProvider({ initial, children }: { initial: ServerStudyState | null; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (initial) {
      saveToStorage(KEYS.ACCOUNT, initial.account);
      if (initial.hasStudyData) mergeAccountScopedStorageFromSnapshot(initial.data, initial.updatedAt);
    }
    queueMicrotask(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [initial]);

  return <AppDataContext.Provider value={{ initial, ready }}>{children}</AppDataContext.Provider>;
}
