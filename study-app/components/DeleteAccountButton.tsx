"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KEYS } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOutSupabaseUser } from "@/lib/supabase/auth";

export default function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    const ok = window.confirm(
      "Permanently delete your account and all data? This cannot be undone. Click OK to continue."
    );
    if (!ok) return;

    setLoading(true);

    try {
      const resp = await fetch("/api/delete-account", { method: "POST" });
      const body = await resp.json();
      if (!resp.ok) {
        throw new Error(body?.error || "Deletion failed");
      }

      // Clear account-scoped localStorage keys if present
      try {
        const keysToClear = [KEYS.ACCOUNT, KEYS.PROFILE, KEYS.MAJOR, KEYS.COURSES];
        keysToClear.forEach((k) => localStorage.removeItem(k));
        // broadcast storage change event if your app listens for it
        window.dispatchEvent(new CustomEvent("account:deleted", { detail: { keys: keysToClear } }));
      } catch (e) {
        console.warn("Failed to clear local storage", e);
      }

      // Sign out client session
      try {
        await signOutSupabaseUser();
      } catch (e) {
        // ignore
      }

      // Redirect to goodbye page
      router.replace("/goodbye");
    } catch (e: any) {
      window.alert("Account deletion failed: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="mt-3 w-full rounded-2xl border border-red-500/40 px-5 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-60"
    >
      {loading ? "Deleting..." : "Delete my account"}
    </button>
  );
}
