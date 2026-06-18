"use client";

import { useEffect } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  AccountProfile,
  createAccountProfileFromAuthUser,
} from "@/lib/account";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { KEYS, migrateLegacyStorageToAccount } from "@/lib/storage";
import { useStoredValue } from "@/hooks/useStoredValue";

function accountsMatch(current: AccountProfile | null, next: AccountProfile): boolean {
  return Boolean(
    current &&
      current.id === next.id &&
      current.email === next.email &&
      current.name === next.name
  );
}

export function SupabaseAccountBridge() {
  const [, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let mounted = true;

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;

      const nextAccount = createAccountProfileFromAuthUser(data.user);
      migrateLegacyStorageToAccount(nextAccount.id);
      setAccount((current) => (accountsMatch(current, nextAccount) ? current : nextAccount));
    };

    void syncUser();

    const { data } = supabase.auth.onAuthStateChange((
      event: AuthChangeEvent,
      session: Session | null
    ) => {
      if (event === "SIGNED_OUT") {
        setAccount(null);
        return;
      }

      if (!session?.user) return;

      const nextAccount = createAccountProfileFromAuthUser(session.user);
      migrateLegacyStorageToAccount(nextAccount.id);
      setAccount((current) => (accountsMatch(current, nextAccount) ? current : nextAccount));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [setAccount]);

  return null;
}
