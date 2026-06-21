"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  AccountProfile,
  createAccountProfileFromAuthUser,
} from "@/lib/account";
import { loadRemoteAppState, saveRemoteAppState } from "@/lib/supabase/appState";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  hasAccountScopedStorageData,
  isAccountScopedStorageKey,
  KEYS,
  loadFromStorage,
  migrateLegacyStorageToAccount,
  replaceAccountScopedStorageFromSnapshot,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage";
import { useStoredValue } from "@/hooks/useStoredValue";

type ProfileOverride = {
  name?: string;
  avatarUrl?: string;
};

function accountsMatch(current: AccountProfile | null, next: AccountProfile): boolean {
  return Boolean(
    current &&
      current.id === next.id &&
      current.email === next.email &&
      current.name === next.name &&
      current.avatarUrl === next.avatarUrl
  );
}

// Google (and any other OAuth provider) re-syncs user_metadata with its own
// name/photo on every single login, which would otherwise silently wipe out
// any name/photo the student customized in Settings. We keep the customized
// values in account-scoped storage under KEYS.PROFILE -- the same place
// courses/major already live, which Google never touches -- and layer them
// back on top of whatever Supabase/Google just handed us.
function applyProfileOverride(account: AccountProfile): AccountProfile {
  const override = loadFromStorage<ProfileOverride>(KEYS.PROFILE, {});
  if (!override.name && !override.avatarUrl) return account;

  return {
    ...account,
    name: override.name || account.name,
    avatarUrl: override.avatarUrl || account.avatarUrl,
  };
}

export function SupabaseAccountBridge() {
  const [, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const activeAccountIdRef = useRef<string | null>(null);
  const hydrateInProgressRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current === null) return;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);

  const scheduleRemoteSave = useCallback(
    (accountId = activeAccountIdRef.current) => {
      if (!accountId || hydrateInProgressRef.current) return;

      clearSaveTimer();
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void saveRemoteAppState(accountId);
      }, 800);
    },
    [clearSaveTimer]
  );

  const hydrateRemoteState = useCallback(
    async (accountId: string) => {
      const remoteState = await loadRemoteAppState(accountId);

      if (remoteState.status === "found") {
        hydrateInProgressRef.current = true;
        replaceAccountScopedStorageFromSnapshot(remoteState.data);
        hydrateInProgressRef.current = false;
        // The snapshot we just restored may include a customized name/photo
        // for this account (KEYS.PROFILE) -- e.g. this is a fresh device
        // that never had it locally. Re-apply it now that it's in storage.
        setAccount((current) => (current ? applyProfileOverride(current) : current));
        return;
      }

      if (remoteState.status === "missing") {
        await saveRemoteAppState(accountId);
        return;
      }

      if (hasAccountScopedStorageData()) {
        scheduleRemoteSave(accountId);
      }
    },
    [scheduleRemoteSave, setAccount]
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let mounted = true;

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;

      const nextAccount = applyProfileOverride(createAccountProfileFromAuthUser(data.user));
      activeAccountIdRef.current = nextAccount.id;
      migrateLegacyStorageToAccount(nextAccount.id);
      setAccount((current) => (accountsMatch(current, nextAccount) ? current : nextAccount));
      await hydrateRemoteState(nextAccount.id);
    };

    void syncUser();

    const { data } = supabase.auth.onAuthStateChange((
      event: AuthChangeEvent,
      session: Session | null
    ) => {
      if (event === "SIGNED_OUT") {
        activeAccountIdRef.current = null;
        clearSaveTimer();
        setAccount(null);
        return;
      }

      if (!session?.user) return;

      const nextAccount = applyProfileOverride(createAccountProfileFromAuthUser(session.user));
      activeAccountIdRef.current = nextAccount.id;
      migrateLegacyStorageToAccount(nextAccount.id);
      setAccount((current) => (accountsMatch(current, nextAccount) ? current : nextAccount));
      void hydrateRemoteState(nextAccount.id);
    });

    return () => {
      mounted = false;
      clearSaveTimer();
      data.subscription.unsubscribe();
    };
  }, [clearSaveTimer, hydrateRemoteState, setAccount]);

  useEffect(() => {
    const handleLocalStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>;
      const changedKey = customEvent.detail?.key;

      if (!changedKey || !isAccountScopedStorageKey(changedKey)) return;
      scheduleRemoteSave();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleLocalStorageChange);

    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleLocalStorageChange);
      clearSaveTimer();
    };
  }, [clearSaveTimer, scheduleRemoteSave]);

  return null;
}