"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import {
  AccountProfile,
  createAccountProfileFromAuthUser,
  isValidEmail,
} from "@/lib/account";
import { KEYS } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

function getCallbackErrorMessage(): string {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const providerMessage = params.get("message");
  if (providerMessage) return providerMessage;

  const authError = params.get("error");
  if (!authError) return "";

  const messageByCode: Record<string, string> = {
    missing_code: "Google did not return an auth code. Try signing in again.",
    provider_error: "Google sign-in failed. Check the provider setup and try again.",
    oauth_failed: "Google sign-in failed. Check your Supabase and Google redirect URLs.",
    supabase_not_configured: "Supabase is missing its public URL or anon key.",
  };

  return messageByCode[authError] ?? "Sign-in failed. Try again.";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [account, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(getCallbackErrorMessage);
  const [authLoading, setAuthLoading] = useState<"google" | "email" | null>(null);
  const isSignup = mode === "signup";

  const handleGoogleSignIn = async () => {
    setError("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }

    setAuthLoading("google");

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (googleError) {
      setAuthLoading(null);
      setError(googleError.message);
    }
  };

  const handleForgotPassword = () => {
    setError("Password reset will come after the production email setup is finished.");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanFirstName = firstName.replace(/\s+/g, " ").trim();
    const cleanLastName = lastName.replace(/\s+/g, " ").trim();
    const cleanEmail = email.trim().toLowerCase();

    if (isSignup && cleanFirstName.length < 2) {
      setError("Enter your first name.");
      return;
    }

    if (isSignup && cleanLastName.length < 2) {
      setError("Enter your last name.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.trim().length < 6) {
      setError("Enter a password with at least 6 characters.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }

    setAuthLoading("email");

    if (isSignup) {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: `${cleanFirstName} ${cleanLastName}`,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      setAuthLoading(null);

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.user && data.session) {
        setAccount(createAccountProfileFromAuthUser(data.user));
        router.push("/dashboard");
        return;
      }

      setError("Check your email to finish creating your account.");
      return;
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setAuthLoading(null);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    if (data.user) {
      setAccount(createAccountProfileFromAuthUser(data.user));
      router.push("/dashboard");
    }
  };

  if (!hydrated) return <main className="min-h-screen bg-[#fbfbfb]" />;

  if (account) {
    return (
      <main className="min-h-screen bg-[#fbfbfb] px-6 py-16 text-[#302d2a]">
        <section className="mx-auto max-w-xl rounded-[1.5rem] border border-[#3d3935] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6d28ff] text-xl font-black text-white">
            {account.initials}
          </div>
          <h1 className="text-4xl font-black tracking-tight">You are signed in</h1>
          <p className="mt-2 text-base text-[#6d6964]">{account.email}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-[#6d28ff] px-5 py-3 text-sm font-black text-white transition hover:bg-[#5b1ee0]"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/account"
              className="rounded-2xl border border-[#8b8680] px-5 py-3 text-sm font-black text-[#302d2a] transition hover:bg-[#f0eeee]"
            >
              Account Settings
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfbfb] px-5 py-12 text-[#302d2a] sm:py-14">
      <section className="mx-auto max-w-[34rem] rounded-[1.5rem] border border-[#3d3935] bg-white p-7 shadow-sm sm:p-9">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          {isSignup ? "Sign Up" : "Login"}
        </h1>
        <p className="mt-5 text-base font-medium text-[#6d6964]">
          {isSignup
            ? "Create notes in minutes. No credit card required."
            : "Create notes in minutes. Free forever. No credit card required."}
        </p>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authLoading !== null}
            className="flex w-full items-center justify-center gap-4 rounded-2xl bg-[#eeeceb] px-5 py-4 text-base font-bold text-[#6d6964] transition hover:bg-[#e6e2e0]"
          >
            <span className="text-xl font-black text-[#4285f4]" aria-hidden="true">
              G
            </span>
            {authLoading === "google" ? "Opening Google..." : "Continue with Google"}
          </button>

          {!isSignup && (
              <button
                type="button"
                onClick={() => setError("Apple login will come after Google auth and database storage.")}
                disabled={authLoading !== null}
                className="flex w-full items-center justify-center gap-4 rounded-2xl bg-[#eeeceb] px-5 py-4 text-base font-bold text-[#6d6964] transition hover:bg-[#e6e2e0]"
              >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#cbc7c3] text-xs font-black text-white"
                aria-hidden="true"
              >
                A
              </span>
              Continue with Apple
            </button>
          )}
        </div>

        <div className="my-9 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#a9a6a2]" />
          <span className="text-xl font-medium text-[#6d6964]">OR</span>
          <span className="h-px flex-1 bg-[#a9a6a2]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignup && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#6d6964]">First name</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-2xl border-2 border-[#8f96a3] bg-white px-4 py-3 text-base font-medium text-[#302d2a] outline-none transition placeholder:text-[#c6c2be] focus:border-[#6d28ff]"
                  placeholder="Raghed"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#6d6964]">Last name</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-2xl border-2 border-[#8f96a3] bg-white px-4 py-3 text-base font-medium text-[#302d2a] outline-none transition placeholder:text-[#c6c2be] focus:border-[#6d28ff]"
                  placeholder="Soliman"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#6d6964]">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border-2 border-[#8f96a3] bg-white px-4 py-3 text-base font-medium text-[#302d2a] outline-none transition placeholder:text-[#c6c2be] focus:border-[#6d28ff]"
              placeholder="you@citymail.cuny.edu"
              type="email"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[#6d6964]">
              Password
              {!isSignup && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="font-bold underline decoration-[#6d6964]/60 underline-offset-2 transition hover:text-[#302d2a]"
                >
                  Forgot your password?
                </button>
              )}
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border-2 border-[#8f96a3] bg-white px-4 py-3 text-base font-medium text-[#302d2a] outline-none transition placeholder:text-[#c6c2be] focus:border-[#6d28ff]"
              type="password"
            />
          </label>

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading !== null}
            className="w-full rounded-2xl bg-[#6d28ff] px-5 py-4 text-base font-black text-white transition hover:bg-[#5b1ee0]"
          >
            {authLoading === "email" ? "Connecting..." : isSignup ? "Create an account" : "Login"}
          </button>
        </form>

        <p className="mt-10 text-center text-lg font-medium text-[#6d6964]">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-bold text-[#4b4641] underline decoration-[#4b4641]/70 underline-offset-2 transition hover:text-[#6d28ff]"
          >
            {isSignup ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </section>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm font-medium leading-6 text-[#7a756f]">
        By creating or entering an account, you agree to use CCNY Study AI with Supabase
        authentication.{" "}
        <Link href="/" className="font-black text-[#9d7cff] transition hover:text-[#6d28ff]">
          Learn more about CCNY Study AI
        </Link>
        .
      </p>
    </main>
  );
}
