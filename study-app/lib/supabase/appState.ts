"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AccountScopedStorageSnapshot,
  loadAccountScopedStorageSnapshot,
} from "@/lib/storage";

const APP_STATE_VERSION = 1;

type StoredAppState = {
  version: typeof APP_STATE_VERSION;
  updatedAt: number;
  data: AccountScopedStorageSnapshot;
};

type UserAppStateRow = {
  state: unknown;
};

export type RemoteAppStateLoadResult =
  | { status: "found"; data: AccountScopedStorageSnapshot }
  | { status: "missing" }
  | { status: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function normalizeStoredState(value: unknown): StoredAppState | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;

  return {
    version: APP_STATE_VERSION,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    data: value.data as AccountScopedStorageSnapshot,
  };
}

export async function loadRemoteAppState(userId: string): Promise<RemoteAppStateLoadResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("user_app_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Remote app state load error:", error);
    return { status: "error", message: error.message };
  }

  const row = data as UserAppStateRow | null;
  const normalized = normalizeStoredState(row?.state);
  return normalized ? { status: "found", data: normalized.data } : { status: "missing" };
}

export async function saveRemoteAppState(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const now = Date.now();
  const state: StoredAppState = {
    version: APP_STATE_VERSION,
    updatedAt: now,
    data: loadAccountScopedStorageSnapshot(),
  };

  const { error } = await supabase.from("user_app_state").upsert(
    {
      user_id: userId,
      state,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Remote app state save error:", error);
  }
}
