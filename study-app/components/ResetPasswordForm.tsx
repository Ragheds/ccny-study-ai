"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { AccountProfile, createAccountProfileFromAuthUser } from "@/lib/account";
import { KEYS } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ResetNotice = {
  type: "error" | "success";
  message: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const [, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<ResetNotice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function syncResetSession() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (isMounted) {
          setNotice({
            type: "error",
            message: "Supabase is not configured yet.",
          });
        }
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data.user) {
        setNotice({
          type: "error",
          message: "Open the password reset email link first, then set your new password here.",
        });
        return;
      }

      setAccount(createAccountProfileFromAuthUser(data.user));
    }

    syncResetSession();

    return () => {
      isMounted = false;
    };
  }, [setAccount]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (password.length < 6) {
      setNotice({ type: "error", message: "Use at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setNotice({ type: "error", message: "Passwords do not match." });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice({ type: "error", message: "Supabase is not configured yet." });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setNotice({ type: "error", message: error.message });
      return;
    }

    await supabase.auth.signOut();
    setAccount(null);
    setLoading(false);
    setNotice({
      type: "success",
      message: "Your password was updated. Login with your email and new password.",
    });
    setPassword("");
    setConfirmPassword("");
    router.push("/login?status=password_changed");
  };

  return (
    <main className="auth-page flex h-[100dvh] flex-col items-center justify-center gap-3 overflow-hidden px-5 py-3 text-[#302d2a] sm:gap-4 sm:py-6">
      <section className="auth-card w-full max-w-[26.5rem] p-4 sm:p-6">
        <h1 className="text-[2rem] font-extrabold leading-none tracking-[-0.03em] sm:text-[2.35rem]">
          Reset Password
        </h1>
        <p className="mt-2 text-[0.88rem] font-medium leading-5 text-[#6d6964] sm:text-[0.95rem]">
          Choose a new password for your CCNY Study AI account.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[#6d6964]">New password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input"
              type="password"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[#6d6964]">Confirm password</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="auth-input"
              type="password"
            />
          </label>

          {notice && (
            <div className={`auth-notice auth-notice-${notice.type}`}>
              <p>{notice.message}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-submit-button">
            {loading ? "Saving..." : "Save new password"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm font-medium text-[#6d6964]">
          <Link
            href="/login"
            className="font-bold text-[#4b4641] underline decoration-[#4b4641]/70 underline-offset-2 transition hover:text-[#6d28ff]"
          >
            Return to login
          </Link>
        </p>
      </section>
    </main>
  );
}
