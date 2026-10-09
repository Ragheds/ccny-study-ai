"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
const Markdown = dynamic(() => import("react-markdown"));
type Entry = { question: string; answer: string };
export function CodeWorkspace({ courseCode }: { courseCode: string }) {
  const [history, setHistory] = useStoredValue<Record<string, Entry[]>>(
    KEYS.CODE_WORKSPACE,
    {},
  );
  const [question, setQuestion] = useState("");
  const [attempt, setAttempt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function ask(reveal = false) {
    if (!navigator.onLine) {
      setError("Code help needs internet. Your saved replies remain here.");
      return;
    }
    setBusy(true);
    setError("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch("/api/code", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          attempt,
          reveal,
          expectedCourse: courseCode,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Code help is unavailable.");
      setHistory((current) => ({
        ...current,
        [courseCode]: [
          ...(current[courseCode] ?? []).slice(-9),
          { question, answer: data.answer },
        ],
      }));
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : "Try again shortly.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-3xl space-y-5 p-5 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Code · {courseCode}</h1>
        <p className="mt-2 text-sm text-[var(--app-muted-strong)]">
          Start with a hint. Share your attempt before requesting a solution.
          Code is explained here, never executed.
        </p>
      </header>
      <label className="block">
        Your question
        <textarea
          className="mt-2 w-full rounded-xl border p-3"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={1500}
          rows={3}
        />
      </label>
      <label className="block">
        Your attempt <span className="text-sm">(optional for hints)</span>
        <textarea
          className="mt-2 w-full rounded-xl border p-3 font-mono text-sm"
          value={attempt}
          onChange={(event) => setAttempt(event.target.value)}
          maxLength={6000}
          rows={6}
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => ask()}
          disabled={busy || question.trim().length < 3}
          className="rounded-xl bg-[var(--app-text)] px-4 py-3 text-[var(--app-bg)] disabled:opacity-50"
        >
          {busy ? "Thinking…" : "Give me a hint"}
        </button>
        <button
          onClick={() => ask(true)}
          disabled={
            busy || question.trim().length < 3 || attempt.trim().length < 20
          }
          className="rounded-xl border px-4 py-3 disabled:opacity-50"
        >
          Explain a solution
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border p-4">
          {error}{" "}
          <Link href="/plans" className="underline">
            View plans
          </Link>
        </p>
      )}
      {!history[courseCode]?.length && (
        <p className="text-sm text-[var(--app-muted-strong)]">
          Ask about an assignment, an error, or a concept. Include the language
          you are using.
        </p>
      )}
      {[...(history[courseCode] ?? [])].reverse().map((entry, index) => (
        <article key={index} className="rounded-2xl border p-5">
          <h2 className="mb-4 font-semibold">{entry.question}</h2>
          <div className="prose max-w-none overflow-x-auto">
            <Markdown>{entry.answer}</Markdown>
          </div>
          <button
            className="mt-4 rounded-lg border px-3 py-2"
            onClick={() =>
              navigator.clipboard
                .writeText(entry.answer)
                .catch(() =>
                  setError(
                    "Copy unavailable. Select the reply text to copy it.",
                  ),
                )
            }
          >
            Copy reply
          </button>
        </article>
      ))}
    </section>
  );
}
