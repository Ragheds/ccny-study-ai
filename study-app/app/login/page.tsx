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

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [account, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.replace(/\s+/g, " ").trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Enter your name.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setAccount(createAccountProfile(cleanName, cleanEmail));
    router.push("/dashboard");
  };

  if (!hydrated) return <main className="min-h-screen bg-[var(--app-bg)]" />;

  if (account) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-6 py-16 text-[var(--app-text)]">
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--app-accent-soft)] text-xl font-black text-[var(--app-accent)]">
            {account.initials}
          </div>
          <h1 className="text-3xl font-bold">You are signed in</h1>
          <p className="mt-2 text-sm text-[var(--app-muted)]">{account.email}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/account"
              className="rounded-2xl border border-[var(--app-border)] px-5 py-3 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
            >
              Account Settings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-6 py-16 text-[var(--app-text)]">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--app-accent)]">
            CCNY Study AI account
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Keep your study workspace personal.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
            Your profile, selected major, courses, chats, flashcards, notes, and progress stay
            connected on this browser.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold">Sign up</h2>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Create a local student profile for this device.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--app-border-strong)]"
                placeholder="Your name"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                Email
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--app-border-strong)]"
                placeholder="you@citymail.cuny.edu"
                type="email"
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-2xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
            >
              Create account
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
