"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StarburstLogo } from "@/components/StarburstLogo";
import { LearnThisModal } from "@/components/LearnThisModal";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import type { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";
import type { StudyMode } from "@/lib/studyMode";
import { addQuizAttempt, createQuizAttempt, deleteQuizAttempt, EMPTY_QUIZ_STORE, formatQuizDate, getCourseQuizAttempts, groupQuizAttemptsByDate, normalizeQuizStore, type QuizAttempt, type QuizQuestionResult, type QuizStore } from "@/lib/quizzes";

type QuizQuestion = {
  question: string;
  options: Record<string, string>;
  answer: string;
};

function parseQuiz(raw: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const blocks = raw.split(/\n(?=\d+[.)])/g).filter((block) => block.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n").filter((line) => line.trim());
    if (!lines.length) continue;

    const questionText = lines[0].replace(/^\d+[.)]\s*/, "").trim();
    const options: Record<string, string> = {};
    let answer = "";

    for (const line of lines.slice(1)) {
      const optionMatch = line.match(/^([A-D])[.)]\s+(.+)/);
      if (optionMatch) options[optionMatch[1]] = optionMatch[2].trim();

      const answerMatch = line.match(/^(?:Answer|Correct(?:\s+Answer)?):\s*([A-D])/i);
      if (answerMatch) answer = answerMatch[1].toUpperCase();
    }

    if (questionText && Object.keys(options).length >= 2 && answer) {
      questions.push({ question: questionText, options, answer });
    }
  }

  return questions;
}
/* ── shared review screen — used both for a freshly-submitted quiz AND for
   reopening a past saved attempt, so "Learn this" behaves identically either way */
function QuizReviewScreen({
  results,
  title,
  onBack,
  onLearnThis,
  onRetry,
  onNewQuiz,
}: {
  results: QuizQuestionResult[];
  title: string;
  onBack: () => void;
  onLearnThis: (question: QuizQuestionResult) => void;
  onRetry?: () => void;
  onNewQuiz?: () => void;
}) {
  const correctCount = results.filter((r) => r.userAnswer.toUpperCase() === r.correctAnswer.toUpperCase()).length;
  const percentage = results.length ? Math.round((correctCount / results.length) * 100) : 0;
  const resultEmoji = percentage >= 80 ? "🎉" : percentage >= 60 ? "👍" : "📖";
  const resultMessage =
    percentage >= 80 ? "Great job!" : percentage >= 60 ? "Good work — keep studying!" : "Keep reviewing and try again.";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <p className="text-sm font-semibold text-[var(--app-text)]">{title}</p>
      </div>

      <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center">
        <div className="mb-4 text-5xl">{resultEmoji}</div>
        <p className="text-5xl font-bold text-[var(--app-text)]">{percentage}%</p>
        <p className="mt-2 text-sm text-[var(--app-muted)]">
          {correctCount} / {results.length} correct · {resultMessage}
        </p>

        <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: "var(--app-surface-muted)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percentage}%`,
              background: percentage >= 80 ? "#22C55E" : percentage >= 60 ? "#F59E0B" : "#EF4444",
            }}
          />
        </div>

        {(onRetry || onNewQuiz) && (
          <div className="mt-6 flex justify-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-xl border border-[var(--app-border)] px-5 py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-border-strong)]"
              >
                Retry same quiz
              </button>
            )}
            {onNewQuiz && (
              <button
                type="button"
                onClick={onNewQuiz}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
                style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)" }}
              >
                New quiz
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--app-muted)]">Review</h3>
        {results.map((result, index) => {
          const isCorrect = result.userAnswer.toUpperCase() === result.correctAnswer.toUpperCase();
          return (
            <div
              key={index}
              className="space-y-3 rounded-2xl border p-5"
              style={{
                borderColor: isCorrect ? "rgba(34,197,94,.4)" : "rgba(239,68,68,.4)",
                background: isCorrect ? "rgba(34,197,94,.04)" : "rgba(239,68,68,.04)",
              }}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-base">{isCorrect ? "✅" : "❌"}</span>
                <p className="text-sm font-semibold text-[var(--app-text)]">
                  {index + 1}. {result.question}
                </p>
              </div>
              <div className="grid gap-1.5 pl-7">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  if (!result.options[letter]) return null;
                  const isRightAnswer = letter === result.correctAnswer.toUpperCase();
                  const wasSelected = result.userAnswer.toUpperCase() === letter;
                  return (
                    <div
                      key={letter}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                      style={{
                        background: isRightAnswer ? "rgba(34,197,94,.12)" : wasSelected ? "rgba(239,68,68,.12)" : "transparent",
                        color: isRightAnswer ? "#16A34A" : wasSelected ? "#DC2626" : "var(--app-muted)",
                        fontWeight: isRightAnswer || wasSelected ? 600 : 400,
                      }}
                    >
                      <span className="w-5 shrink-0 font-mono text-xs">{letter}.</span>
                      {result.options[letter]}
                      {isRightAnswer && <span className="ml-auto text-xs">✓ correct</span>}
                      {wasSelected && !isRightAnswer && <span className="ml-auto text-xs">your answer</span>}
                    </div>
                  );
                })}
              </div>

              {/* under each WRONG answer: the AI Tutor explain+watch feature */}
              {!isCorrect && (
                <button
                  type="button"
                  onClick={() => onLearnThis(result)}
                  className="ml-7 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)" }}
                >
                  🎧 AI Tutor — explain this
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuizzesTab({ major, courses, activeCourseCode }: { major: SavedMajor; courses: SavedCourse[]; activeCourseCode?: string | null }) {
  const [studyMode] = useStoredValue<StudyMode | null>(KEYS.STUDY_MODE, null);
  const [audioQuiz, setAudioQuiz] = useState(false);
  const [audioIndex, setAudioIndex] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState("");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const [rawStore, setRawStore] = useStoredValue<QuizStore>(KEYS.QUIZ_RESULTS, EMPTY_QUIZ_STORE);
  const store = normalizeQuizStore(rawStore);

  const [selectedCode, setSelectedCode] = useState(activeCourseCode ?? courses[0]?.code ?? "");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [viewingAttempt, setViewingAttempt] = useState<QuizAttempt | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [learnThisQuestion, setLearnThisQuestion] = useState<QuizQuestionResult | null>(null);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const speakQuestion = (index: number, quizQuestions = questions) => {
    const question = quizQuestions[index];
    if (!question || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const options = Object.entries(question.options).map(([letter, value]) => `Option ${letter}: ${value}`).join(". ");
    const utterance = new SpeechSynthesisUtterance(`Question ${index + 1}. ${question.question}. ${options}`);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const answerAudioQuestion = (letter: string) => {
    setAnswers((prev) => ({ ...prev, [audioIndex]: letter }));
    setVoiceStatus(`Selected ${letter}.`);
    if (audioIndex < questions.length - 1) {
      const next = audioIndex + 1;
      setAudioIndex(next);
      speakQuestion(next);
    }
  };

  const listenForAnswer = () => {
    type Recognition = { lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
    const voiceWindow = window as typeof window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Constructor = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
    if (!Constructor) { setVoiceStatus("Voice answers are unavailable in this browser. Tap an answer instead."); return; }
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    const recognition = new Constructor();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const heard = event.results[0]?.[0]?.transcript.trim().toLowerCase() ?? "";
      const words: Record<string, string> = { a: "A", ay: "A", b: "B", bee: "B", c: "C", see: "C", d: "D", dee: "D" };
      const letter = words[heard.replace(/[.!,]/g, "")];
      if (letter && questions[audioIndex]?.options[letter]) answerAudioQuestion(letter);
      else setVoiceStatus(`Heard “${heard}”. Say A, B, C, or D, or tap an answer.`);
    };
    recognition.onerror = () => setVoiceStatus("Voice input stopped. Tap an answer or try again.");
    recognition.onend = () => { recognitionRef.current = null; };
    recognitionRef.current = recognition;
    setVoiceStatus("Listening for A, B, C, or D…");
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceStatus("Voice input couldn't start. Tap an answer instead.");
    }
  };

  const selectedCourse = courses.find((course) => course.code === selectedCode) ?? courses[0] ?? null;

  const freshResults: QuizQuestionResult[] = questions.map((question, index) => ({
    question: question.question,
    options: question.options,
    correctAnswer: question.answer,
    userAnswer: answers[index] ?? "",
  }));

  const submitQuiz = () => {
    if (!selectedCourse) return;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    const attempt = createQuizAttempt(selectedCourse, major, topic, freshResults);
    setRawStore((prev) => addQuizAttempt(normalizeQuizStore(prev), attempt));
    setSubmitted(true);
  };

  if (courses.length === 0 || !selectedCourse) {
    return (
      <div className="py-20 text-center">
        <p className="text-[var(--app-muted)] mb-4">Add courses first to take quizzes.</p>
        <Link href="/majors" className="text-sm font-semibold text-[var(--app-accent)] hover:underline">
          Browse Majors →
        </Link>
      </div>
    );
  }

  const pastAttempts = getCourseQuizAttempts(store, selectedCourse.code);
  const attemptGroups = groupQuizAttemptsByDate(pastAttempts);

  const startNewQuiz = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setAudioQuiz(false);
    setVoiceStatus("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setTopic("");
    setError("");
  };

  const retrySameQuiz = () => {
    setAudioIndex(0);
    setAudioQuiz(false);
    setAnswers({});
    setSubmitted(false);
  };

  const removeAttempt = (id: string) => {
    setRawStore((prev) => deleteQuizAttempt(normalizeQuizStore(prev), id));
    setConfirmDeleteId(null);
    if (viewingAttempt?.id === id) setViewingAttempt(null);
  };

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setProgressLabel("Building your quiz…");

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: topic.trim()
            ? `Generate a 5-question multiple choice quiz about: ${topic.trim()}`
            : `Generate a 5-question multiple choice quiz covering ${selectedCourse.name} (${selectedCourse.code}) core topics.`,
          action: "quiz",
          context: {
            major: major.name,
            majorCode: major.code,
            school: major.school,
            course: selectedCourse.name,
            courseCode: selectedCourse.code,
            courseSection: selectedCourse.section,
          },
        }),
      });

      if (!response.ok || !response.body) throw new Error("Request failed. Try again.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      const dots = ["Generating.", "Generating..", "Generating..."];
      let dotIndex = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        dotIndex = (dotIndex + 1) % dots.length;
        setProgressLabel(dots[dotIndex]);
      }

      const parsed = parseQuiz(raw);
      if (parsed.length === 0) throw new Error("Couldn't build a quiz from that. Try a more specific topic.");
      setQuestions(parsed);
      setAudioIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setProgressLabel("");
    }
  };

  /* ── viewing a past, already-graded attempt ─────────────────────────────── */
  if (viewingAttempt) {
    return (
      <>
        <QuizReviewScreen
          results={viewingAttempt.questions}
          title={viewingAttempt.title}
          onBack={() => setViewingAttempt(null)}
          onLearnThis={setLearnThisQuestion}
        />
        {learnThisQuestion && (
          <LearnThisModal
            open
            onClose={() => setLearnThisQuestion(null)}
            major={major}
            course={selectedCourse}
            question={learnThisQuestion}
          />
        )}
      </>
    );
  }

  /* ── actively taking a quiz, not yet submitted ──────────────────────────── */
  if (questions.length > 0 && !submitted) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{selectedCourse.code} Quiz</h2>
            {topic && <p className="mt-0.5 text-xs text-[var(--app-muted)]">Topic: {topic}</p>}
          </div>
          <button type="button" onClick={startNewQuiz} className="text-sm text-[var(--app-muted)] transition hover:text-[var(--app-text)]">
            ← New quiz
          </button>
        </div>

        {studyMode === "audio" && <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--app-text)]">Audio quiz</p>
          <p className="mt-1 text-xs text-[var(--app-muted-strong)]">Hear each question and answer by voice or tap. Voice input depends on your browser.</p>
          {!audioQuiz ? <button type="button" onClick={() => { setAudioQuiz(true); setAudioIndex(0); speakQuestion(0); }} className="mt-3 rounded-lg bg-[var(--app-text)] px-4 py-2 text-xs font-semibold text-[var(--app-bg)]">Start audio quiz</button>
            : <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mr-auto text-xs font-medium text-[var(--app-text)]">Question {audioIndex + 1} of {questions.length}</span>
              <button type="button" onClick={() => speakQuestion(audioIndex)} className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-xs font-semibold">Replay</button>
              <button type="button" onClick={listenForAnswer} className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-xs font-semibold">Answer by voice</button>
              <button type="button" onClick={() => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); setAudioQuiz(false); }} className="rounded-lg px-3 py-2 text-xs font-semibold">Stop</button>
            </div>}
          {voiceStatus && <p role="status" className="mt-2 text-xs text-[var(--app-muted-strong)]">{voiceStatus}</p>}
        </div>}

        <div className="space-y-5">
          {questions.map((question, questionIndex) => (
            <div key={questionIndex} className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <p className="text-sm font-semibold text-[var(--app-text)]">
                <span className="mr-2 text-[var(--app-muted)]">{questionIndex + 1}.</span>
                {question.question}
              </p>
              <div className="grid gap-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  if (!question.options[letter]) return null;
                  const isSelected = answers[questionIndex] === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => audioQuiz && questionIndex === audioIndex
                        ? answerAudioQuestion(letter)
                        : setAnswers((prev) => ({ ...prev, [questionIndex]: letter }))}
                      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition"
                      style={{
                        background: isSelected ? "var(--app-text)" : "var(--app-surface-muted)",
                        color: isSelected ? "var(--app-bg)" : "var(--app-text)",
                        borderColor: isSelected ? "var(--app-text)" : "var(--app-border)",
                      }}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                        style={{ borderColor: isSelected ? "var(--app-bg)" : "var(--app-border)", opacity: isSelected ? 0.7 : 1 }}
                      >
                        {letter}
                      </span>
                      {question.options[letter]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={submitQuiz}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", boxShadow: "0 4px 14px rgba(255,107,53,.3)" }}
        >
          Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
        </button>
      </div>
    );
  }

  /* ── just submitted a fresh quiz → show results right away ──────────────── */
  if (submitted) {
    return (
      <>
        <QuizReviewScreen
          results={freshResults}
          title={topic || `${selectedCourse.code} review`}
          onBack={startNewQuiz}
          onLearnThis={setLearnThisQuestion}
          onRetry={retrySameQuiz}
          onNewQuiz={startNewQuiz}
        />
        {learnThisQuestion && (
          <LearnThisModal
            open
            onClose={() => setLearnThisQuestion(null)}
            major={major}
            course={selectedCourse}
            question={learnThisQuestion}
          />
        )}
      </>
    );
  }

  /* ── default: generate a new quiz + browse past attempts (mirrors Flashcards) ── */
  return (
    <div className="flex gap-6 flex-col lg:flex-row" style={{ minHeight: "calc(100dvh - 260px)" }}>
      <div className="lg:w-[340px] shrink-0 space-y-4">
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Course</p>
          <div className="flex flex-wrap gap-2">
            {courses.map((course) => (
              <button
                key={course.code}
                type="button"
                onClick={() => setSelectedCode(course.code)}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  background: course.code === selectedCode ? course.color : "var(--app-surface-muted)",
                  color: course.code === selectedCode ? "#fff" : "var(--app-muted)",
                  borderColor: course.code === selectedCode ? course.color : "var(--app-border)",
                }}
              >
                {course.code}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Topic (optional)</p>
          <input
            placeholder="e.g. limits, recursion, mitosis…"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void generate();
            }}
            className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-2.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", boxShadow: "0 4px 14px rgba(255,107,53,.3)" }}
        >
          {loading ? (
  <span className="flex items-center justify-center gap-2">
    <span className="generating-icon"><StarburstLogo size={16} white /></span>
    {progressLabel || "Generating…"}
  </span>
) : (
  "Generate Quiz →"
)}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {pastAttempts.length === 0 ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[var(--app-border)]">
            <div className="text-3xl">📝</div>
            <div className="text-center">
              <p className="font-semibold text-[var(--app-text)]">No quizzes yet</p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Generate your first one using the panel on the left.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {attemptGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">{group.label}</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.attempts.map((attempt) => {
                    const pct = attempt.totalQuestions
                      ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
                      : 0;
                    const isConfirming = attempt.id === confirmDeleteId;
                    return (
                      <div
                        key={attempt.id}
                        className="group relative rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:border-[var(--app-border-strong)] hover:shadow-sm"
                      >
                        <button type="button" onClick={() => setViewingAttempt(attempt)} className="block w-full text-left">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[var(--app-text)] leading-snug pr-8">{attempt.title}</p>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                              style={{
                                background: pct >= 80 ? "rgba(34,197,94,.12)" : pct >= 60 ? "rgba(245,158,11,.12)" : "rgba(239,68,68,.12)",
                                color: pct >= 80 ? "#16A34A" : pct >= 60 ? "#D97706" : "#DC2626",
                              }}
                            >
                              {pct}%
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--app-muted)]">
                            {attempt.correctCount}/{attempt.totalQuestions} correct · {formatQuizDate(attempt.createdAt)}
                          </p>
                        </button>

                        <div className="absolute bottom-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                          {isConfirming ? (
                            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--app-surface-muted)] px-2 py-1">
                              <span className="text-[11px] text-[var(--app-muted)]">Delete?</span>
                              <button type="button" onClick={() => removeAttempt(attempt.id)} className="text-[11px] font-semibold text-red-500 hover:text-red-600">
                                Yes
                              </button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-[var(--app-muted)] hover:text-[var(--app-text)]">
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(attempt.id)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-red-500"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
