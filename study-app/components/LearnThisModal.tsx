"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import { DEFAULT_SPEECH_PREFERENCES, getServerSpeechState, getSpeechState, pauseSpeech, resumeSpeech, speakText, speechSupported, stopSpeech, subscribeSpeech, type SpeechPreferences } from "@/lib/speech";
import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";

type LearnThisQuestion = {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  userAnswer: string;
};

type LearnThisModalProps = {
  open: boolean;
  onClose: () => void;
  major: SavedMajor;
  course: SavedCourse;
  question: LearnThisQuestion;
};

type Status = "loading" | "ready" | "error";

export function LearnThisModal({
  open,
  onClose,
  major,
  course,
  question,
}: LearnThisModalProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [explanation, setExplanation] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechState, getServerSpeechState);
  const speaking = speech.status !== "idle";
  const paused = speech.status === "paused";
  const [preferences] = useStoredValue<SpeechPreferences>(KEYS.SPEECH_PREFERENCES, DEFAULT_SPEECH_PREFERENCES);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const message = [
      `Question: ${question.question}`,
      `Options: ${Object.entries(question.options)
        .map(([letter, text]) => `${letter}) ${text}`)
        .join("  |  ")}`,
      `The student answered: ${question.userAnswer}) ${
        question.options[question.userAnswer] ?? "--"
      }`,
      `The correct answer is: ${question.correctAnswer}) ${
        question.options[question.correctAnswer] ?? "--"
      }`,
    ].join("\n");

    async function loadExplanation() {
      setStatus("loading");
      setExplanation("");
      setYoutubeUrl("");

      try {
        const response = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message,
            action: "explain_answer",
            context: {
              major: major.name,
              majorCode: major.code,
              school: major.school,
              course: course.name,
              courseCode: course.code,
              courseSection: course.section,
            },
          }),
        });

        if (!response.ok || !response.body) throw new Error("Request failed");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
        }

        const searchMatch = raw.match(/YOUTUBE_SEARCH:\s*(.+)/i);
        const query =
          searchMatch?.[1]?.trim() ||
          `${course.name} ${question.question}`;
        const cleanExplanation = raw
          .replace(/YOUTUBE_SEARCH:\s*.+/i, "")
          .trim();

        setExplanation(
          cleanExplanation ||
            "Here is the correct answer -- take a look at the option highlighted above."
        );
        setYoutubeUrl(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(
            query
          )}`
        );
        setStatus("ready");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
      }
    }

    void loadExplanation();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question.question]);

  useEffect(() => {
    if (!open) {
      stopSpeech();
      abortRef.current?.abort();
    }
    return () => {
      stopSpeech();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const togglePause = () => paused ? resumeSpeech() : pauseSpeech();
  const stopSpeaking = stopSpeech;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-this-heading"
        className="relative z-10 w-full max-w-lg rounded-3xl bg-[var(--app-surface)] p-6 shadow-2xl"
      >
        {/* header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-base"
              style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)" }}
            >
              🎧
            </div>
            <h2
              id="learn-this-heading"
              className="text-base font-bold text-[var(--app-text)]"
            >
              AI Tutor
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* question recap */}
        <div className="mb-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 space-y-2">
          <p className="text-sm font-semibold text-[var(--app-text)]">
            {question.question}
          </p>
          <p className="text-xs" style={{ color: "#DC2626" }}>
            Your answer: {question.userAnswer}){" "}
            {question.options[question.userAnswer] ?? "--"}
          </p>
          <p className="text-xs font-medium" style={{ color: "#16A34A" }}>
            Correct answer: {question.correctAnswer}){" "}
            {question.options[question.correctAnswer] ?? "--"}
          </p>
        </div>

        {/* explanation */}
        <div className="min-h-[90px]">
          {status === "loading" && (
            <div className="flex items-center gap-2 py-4 text-sm text-[var(--app-muted)]">
              <div
                className="h-4 w-4 rounded-full border-2 border-orange-400 border-t-transparent"
                style={{ animation: "spin 0.8s linear infinite" }}
              />
              Thinking through the best way to explain this...
            </div>
          )}
          {status === "error" && (
            <p className="py-4 text-sm text-red-500">
              Could not load an explanation. Try again in a moment.
            </p>
          )}
          {status === "ready" && (
            <p className="text-sm leading-relaxed text-[var(--app-text)]">
              {explanation}
            </p>
          )}
        </div>

        {/* voice controls */}
        {status === "ready" && speechSupported() && (
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => speakText(explanation, preferences)} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-semibold">Listen</button>
            <button
              type="button"
              onClick={togglePause}
              disabled={!speaking && !paused}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)" }}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={stopSpeaking}
              disabled={!speaking && !paused}
              className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)] disabled:opacity-40"
            >
              Stop
            </button>
            <span className="text-[11px] text-[var(--app-muted)]">
              {speaking
                ? paused
                  ? "Paused"
                  : "Reading aloud..."
                : "Ready to listen"}
            </span>
          </div>
        )}

        {/* youtube link */}
        {status === "ready" && youtubeUrl && (
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--app-border)] px-4 py-3 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)]"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">📺</span>
              Watch a video on this topic
            </span>
            <span className="text-[var(--app-muted)]">&rarr;</span>
          </a>
        )}

        {!speechSupported() && status === "ready" && (
          <p className="mt-3 text-[11px] text-[var(--app-muted)]">
            Read-aloud is not supported in this browser -- text explanation
            above still works fine.
          </p>
        )}
      </div>
    </div>
  );
}