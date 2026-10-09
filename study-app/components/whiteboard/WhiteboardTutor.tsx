"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Board } from "@/components/whiteboard/Board";
import {
  LessonSchema,
  StepSchema,
  type Lesson,
  type Step,
} from "@/lib/whiteboard/schema";
import { LineDecoder } from "@/lib/whiteboard/ndjson";
import {
  saveDeviceLesson,
  savedDeviceLessons,
  type SavedLesson,
} from "@/lib/whiteboard/deviceLessons";
import { useAutoNotes } from "@/hooks/useAutoNotes";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import {
  speakText,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  subscribeSpeech,
  getSpeechState,
  getServerSpeechState,
  DEFAULT_SPEECH_PREFERENCES,
  type SpeechPreferences,
} from "@/lib/speech";
import { SpeechToolbar } from "@/components/SpeechToolbar";
export function WhiteboardTutor({
  courseCode,
  initialLesson,
}: {
  courseCode: string;
  initialLesson?: Lesson;
}) {
  const [question, setQuestion] = useState("");
  const [title, setTitle] = useState(
    initialLesson?.title ?? "Whiteboard tutor",
  );
  const [steps, setSteps] = useState<Step[]>(initialLesson?.steps ?? []);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(!!initialLesson);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState("");
  const [chalk, setChalk] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [replay, setReplay] = useState(0);
  const [saved, setSaved] = useState<SavedLesson[]>([]);
  const [preferences, setPreferences] = useStoredValue<SpeechPreferences>(
    KEYS.SPEECH_PREFERENCES,
    DEFAULT_SPEECH_PREFERENCES,
  );
  const speech = useSyncExternalStore(
    subscribeSpeech,
    getSpeechState,
    getServerSpeechState,
  );
  const abort = useRef<AbortController | null>(null);
  const lessonId = useRef(crypto.randomUUID());
  const capture = useAutoNotes(courseCode);
  const current = steps[index];
  useEffect(() => {
    savedDeviceLessons(courseCode)
      .then(setSaved)
      .catch(() => {});
    if (navigator.onLine && !initialLesson)
      fetch("/api/lessons")
        .then((response) => (response.ok ? response.json() : null))
        .then(async (data) => {
          for (const row of data?.lessons ?? []) {
            const parsed = LessonSchema.safeParse(row.content?.lesson);
            if (row.content?.courseCode === courseCode && parsed.success)
              await saveDeviceLesson(courseCode, parsed.data, row.id);
          }
          setSaved(await savedDeviceLessons(courseCode));
        })
        .catch(() => {});
    return () => {
      abort.current?.abort();
      stopSpeech();
    };
  }, [courseCode, initialLesson]);
  useEffect(() => {
    if (!current || !playing) return;
    capture(
      `${lessonId.current}:${index}`,
      `${current.say}\n${current.board
        .filter((block) => block.t !== "graph")
        .map((block) => JSON.stringify(block))
        .join("\n")}`,
      "lesson",
    );
    speakText(
      current.say,
      { ...preferences, rate: speed },
      `${lessonId.current}:${index}`,
      () => setIndex((value) => value + 1),
    );
    return stopSpeech;
  }, [current, playing, index, preferences, speed, replay, capture]);
  async function ask(topicId?: number) {
    if (!navigator.onLine) {
      setStatus(
        "Needs internet for a new lesson. Replay a saved lesson below.",
      );
      return;
    }
    abort.current?.abort();
    stopSpeech();
    const controller = new AbortController();
    abort.current = controller;
    lessonId.current = crypto.randomUUID();
    setSteps([]);
    setIndex(0);
    setDone(false);
    setPlaying(true);
    setBusy(true);
    setFallback("");
    setStatus("Preparing the first step…");
    let received: Step[] = [];
    let lessonTitle = "Course lesson";
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question || "Graph y=2x+1 and explain its slope.",
          courseCode,
          topicId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw Error(error.error);
      }
      if (!response.body) throw Error("No lesson received.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const lines = new LineDecoder();
      function consume(text: string, finish = false) {
        for (const line of lines.push(text, finish)) {
          const event = JSON.parse(line);
          if (event.type === "title") {
            lessonTitle = String(event.title);
            setTitle(lessonTitle);
          } else if (event.type === "step") {
            const step = StepSchema.parse(event.step);
            received.push(step);
            setSteps([...received]);
            setStatus("");
          } else if (event.type === "reset") {
            received = [];
            setSteps([]);
            setIndex(0);
            stopSpeech();
          } else if (event.type === "fallback") {
            received = [];
            setSteps([]);
            setFallback(event.text);
            setPlaying(false);
            stopSpeech();
          } else if (event.type === "done") setDone(true);
        }
      }
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        consume(decoder.decode(value, { stream: true }));
      }
      consume(decoder.decode(), true);
      if (received.length) {
        const lesson = LessonSchema.parse({
          title: lessonTitle,
          steps: received,
        });
        await saveDeviceLesson(courseCode, lesson);
        setSaved(await savedDeviceLessons(courseCode));
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setStatus(
          error instanceof Error ? error.message : "Could not load a lesson.",
        );
        setPlaying(false);
        stopSpeech();
      }
    } finally {
      setBusy(false);
      setDone(true);
    }
  }
  function select(lesson: Lesson) {
    abort.current?.abort();
    stopSpeech();
    lessonId.current = crypto.randomUUID();
    setTitle(lesson.title);
    setSteps(lesson.steps);
    setIndex(0);
    setPlaying(false);
    setDone(true);
    setFallback("");
  }
  function move(next: number) {
    stopSpeech();
    setPlaying(false);
    setIndex(Math.max(0, Math.min(steps.length - 1, next)));
  }
  return (
    <section className="mx-auto max-w-3xl space-y-4 p-4 pb-20">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p>{courseCode} · AI can be wrong; check with your professor.</p>
      <label>
        Ask a typed question
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={1500}
          className="block w-full rounded-xl border p-3"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy || question.trim().length < 3}
          onClick={() => ask()}
          className="rounded-xl border p-3"
        >
          {busy ? "Teaching…" : "Teach on the board"}
        </button>
        <button
          disabled={busy}
          onClick={() => ask(1)}
          className="rounded-xl border p-3"
        >
          Example: slope of 2x + 1
        </button>
      </div>
      <p role="status">{status}</p>
      {fallback && (
        <div className="rounded-xl border p-4">
          <p className="whitespace-pre-wrap">{fallback}</p>
          <Link
            href={`/dashboard?tab=ai&course=${encodeURIComponent(courseCode)}`}
          >
            Continue in Chat →
          </Link>
        </div>
      )}
      {steps.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border p-2"
              onClick={() => {
                setPlaying(true);
                setReplay((value) => value + 1);
                if (index >= steps.length) setIndex(0);
              }}
            >
              Play / replay step
            </button>
            <button
              className="rounded-lg border p-2"
              onClick={speech.status === "paused" ? resumeSpeech : pauseSpeech}
            >
              {speech.status === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              className="rounded-lg border p-2"
              onClick={() => {
                setPlaying(false);
                stopSpeech();
              }}
            >
              Stop
            </button>
            <button
              onClick={() => move(index - 1)}
              className="rounded-lg border p-2"
            >
              Previous
            </button>
            <button
              onClick={() => move(index + 1)}
              className="rounded-lg border p-2"
            >
              Next
            </button>
            <label>
              Speed
              <select
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                {[0.75, 1, 1.25].map((rate) => (
                  <option key={rate}>{rate}</option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={captions}
                onChange={(event) => setCaptions(event.target.checked)}
              />
              Captions
            </label>
            <label>
              <input
                type="checkbox"
                checked={chalk}
                onChange={(event) => setChalk(event.target.checked)}
              />
              Chalk theme
            </label>
            <SpeechToolbar
              preferences={preferences}
              onChange={setPreferences}
            />
          </div>
          <p>
            Step {Math.min(index + 1, steps.length)} of {steps.length}
            {!done ? " · still streaming" : ""}
          </p>
          <Board
            steps={steps}
            index={Math.min(index, steps.length - 1)}
            chalk={chalk}
          />
          {captions && (
            <p className="rounded-xl border p-3" aria-live="polite">
              {current?.say ??
                "Lesson complete. Replay a step or ask a new question."}
            </p>
          )}
        </>
      )}
      <h2 className="font-semibold">Saved on this device</h2>
      {!saved.length && (
        <p>
          No saved lessons yet. Completed lessons can replay without internet.
        </p>
      )}
      {saved.map((item) => (
        <button
          key={item.id}
          onClick={() => select(item.lesson)}
          className="mr-2 rounded-xl border p-3"
        >
          {item.lesson.title}
        </button>
      ))}
    </section>
  );
}
