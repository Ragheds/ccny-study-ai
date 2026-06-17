"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import {
  AccountProfile,
  formatAccountDate,
  isValidEmail,
  updateAccountProfile,
} from "@/lib/account";
import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";
import { KEYS } from "@/lib/storage";

const EMPTY_COURSES: SavedCourse[] = [];

export default function AccountPage() {
  const hydrated = useHydrated();
  const [account, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const [major] = useStoredValue<SavedMajor | null>(KEYS.MAJOR, null);
  const [courses] = useStoredValue(KEYS.COURSES, EMPTY_COURSES);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [error, setError] = useState("");

  const beginEdit = () => {
    if (!account) return;
    setDraftName(account.name);
    setDraftEmail(account.email);
    setError("");
    setEditing(true);
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) return;

    const cleanName = draftName.replace(/\s+/g, " ").trim();
    const cleanEmail = draftEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Enter your name.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setAccount(updateAccountProfile(account, cleanName, cleanEmail));
    setEditing(false);
    setError("");
  };

  if (!hydrated) return <main className="min-h-screen bg-[var(--app-bg)]" />;

  if (!account) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-6 py-16 text-[var(--app-text)]">
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-sm">
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="mt-3 text-sm text-[var(--app-muted)]">
            Sign in to attach your dashboard, courses, chats, and flashcards to a local profile.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-2xl bg-[var(--app-text)] px-6 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-6 py-10 text-[var(--app-text)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--app-accent)]">
              Account
            </p>
            <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
            <p className="mt-2 text-sm text-[var(--app-muted)]">
              Manage your profile and study workspace preferences.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-[var(--app-border)] px-5 py-3 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <div className="h-32 bg-[var(--app-accent-soft)]" />
            <div className="-mt-14 px-6 pb-6">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--app-surface)] bg-[var(--app-accent)] text-4xl font-black text-white shadow-sm">
                {account.initials}
              </div>

              {!editing ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-bold">{account.name}</h2>
                      <p className="mt-1 text-sm text-[var(--app-muted)]">{account.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={beginEdit}
                      className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
                    >
                      Edit
                    </button>
                  </div>

                  <dl className="mt-8 space-y-5 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">
                        Member since
                      </dt>
                      <dd className="mt-1 font-semibold text-[var(--app-text)]">
                        {formatAccountDate(account.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">
                        Student plan
                      </dt>
                      <dd className="mt-1 font-semibold text-[var(--app-text)]">CCNY workspace</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">
                        Profile ID
                      </dt>
                      <dd className="mt-1 truncate font-mono text-xs text-[var(--app-muted-strong)]">
                        {account.id}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={() => setAccount(null)}
                    className="mt-8 w-full rounded-2xl border border-red-500/40 px-5 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <form onSubmit={saveProfile} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                      Name
                    </span>
                    <input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--app-border-strong)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                      Email
                    </span>
                    <input
                      value={draftEmail}
                      onChange={(event) => setDraftEmail(event.target.value)}
                      className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--app-border-strong)]"
                      type="email"
                    />
                  </label>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-2xl border border-[var(--app-border)] px-4 py-3 text-sm font-semibold text-[var(--app-muted-strong)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-2xl bg-[var(--app-text)] px-4 py-3 text-sm font-semibold text-[var(--app-bg)]"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-[var(--app-muted)]">
                    Academic setup
                  </p>
                  <h2 className="text-2xl font-bold">
                    {major ? major.name : "No major selected"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    {major ? `${major.code} · ${major.school}` : "Choose a major to personalize the app."}
                  </p>
                </div>

                <Link
                  href={major ? `/dashboard/${major.code}` : "/majors"}
                  className="rounded-2xl bg-[var(--app-text)] px-5 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
                >
                  {major ? "Manage Courses" : "Choose Major"}
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <StatCard label="Saved courses" value={String(courses.length)} />
                <StatCard label="Major" value={major?.code ?? "None"} />
                <StatCard label="Storage" value="Local" />
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-[var(--app-muted)]">
                    Theme
                  </p>
                  <h2 className="text-2xl font-bold">Appearance</h2>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    This preference follows you across dashboard, courses, and study tools.
                  </p>
                </div>

                <div className="w-full lg:w-80">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <p className="mb-2 text-xs uppercase tracking-widest text-[var(--app-muted)]">
                Workspace data
              </p>
              <h2 className="text-2xl font-bold">Saved on this browser</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                Your account profile links together local major selection, selected courses,
                AI chats, flashcards, notes, quiz results, and progress tracking.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--app-muted)]">{label}</p>
      <p className="mt-2 truncate text-lg font-bold text-[var(--app-text)]">{value}</p>
    </div>
  );
}
