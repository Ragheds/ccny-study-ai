"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import {
  AccountProfile,
  createAccountProfile,
  isValidEmail,
} from "@/lib/account";
import { KEYS } from "@/lib/storage";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

function nameFromEmail(email: string): string {
  const localPart = email.split("@")[0] || "ccny student";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [account, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isSignup = mode === "signup";

  const handleUnavailableProvider = (provider: string) => {
    setError(
      `${provider} sign-in needs real production authentication. Use email for this local profile.`
    );
  };

  const handleForgotPassword = () => {
    setError("Password reset needs production authentication. Use email for this local profile.");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    const profileName = isSignup
      ? `${cleanFirstName} ${cleanLastName}`
      : nameFromEmail(cleanEmail);

    setAccount(createAccountProfile(profileName, cleanEmail));
    router.push("/dashboard");
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
            onClick={() => handleUnavailableProvider("Google")}
            className="flex w-full items-center justify-center gap-4 rounded-2xl bg-[#eeeceb] px-5 py-4 text-base font-bold text-[#6d6964] transition hover:bg-[#e6e2e0]"
          >
            <span className="text-xl font-black text-[#4285f4]" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>

          {!isSignup && (
            <button
              type="button"
              onClick={() => handleUnavailableProvider("Apple")}
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
            className="w-full rounded-2xl bg-[#6d28ff] px-5 py-4 text-base font-black text-white transition hover:bg-[#5b1ee0]"
          >
            {isSignup ? "Create an account" : "Login"}
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
        By creating or entering an account, you agree to keep this CCNY Study AI profile in
        local browser storage.{" "}
        <Link href="/" className="font-black text-[#9d7cff] transition hover:text-[#6d28ff]">
          Learn more about CCNY Study AI
        </Link>
        .
      </p>
    </main>
  );
}
