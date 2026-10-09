"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ALGEBRA_CASES } from "@/lib/whiteboard/algebraCases";
import { Board } from "@/components/whiteboard/Board";
import {
  DEFAULT_SPEECH_PREFERENCES,
  speakText,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  subscribeSpeech, getSpeechState, getServerSpeechState,
} from "@/lib/speech";
import type { Step } from "@/lib/whiteboard/schema";
const Graph = dynamic(() =>
  import("@/components/whiteboard/Graph").then((module) => module.Graph),
);
const STEPS: Step[] = [
  {
    say: "The graph of y equals two x plus one is a straight line. Its slope is two and its y intercept is one.",
    board: [
      { id: "heading", t: "heading", text: "Slope and intercept" },
      { id: "equation", t: "equation", latex: "y = 2x + 1" },
    ],
  },
  {
    say: "Start at zero, one. Move one right and two up to reach one, three. Both points satisfy the equation.",
    board: [
      {
        id: "graph",
        t: "graph",
        xRange: [-3, 3],
        yRange: [-5, 7],
        plots: [
          { kind: "function", expr: "2*x+1", label: "y = 2x + 1" },
          {
            kind: "points",
            pts: [
              [0, 1],
              [1, 3],
            ],
          },
        ],
        highlight: [{ x: 0, y: 1, label: "intercept" }],
        reveal: "axes-then-plots",
      },
    ],
  },
  {
    say: "Your turn. When x is two, what is y? Two times two plus one equals five.",
    board: [{ id: "practice", t: "text", text: "Practice: x = 2 → y = 5" }],
  },
];
export function StudyDemo() {
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [chalk, setChalk] = useState(false),
    [answer, setAnswer] = useState(false),
    [example, setExample] = useState(1);
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechState, getServerSpeechState);
  useEffect(() => () => stopSpeech(), []);
  const play = (step: number) => {
    setIndex(step);
    setPlaying(true);
    speakText(STEPS[step].say, DEFAULT_SPEECH_PREFERENCES, "demo", () =>
      setPlaying(false),
    );
  };
  const move = (step: number) => {
    stopSpeech();
    setPlaying(false);
    setIndex(step);
  };
  return (
    <main
      data-study-workspace
      className="study-mode-enter mx-auto max-w-3xl space-y-6 p-5 sm:p-8"
    >
      <header>
        <p className="text-sm text-[var(--app-accent)]">CCNY Study AI · Demo</p>
        <h1 className="mt-2 text-3xl font-semibold">Study for your commute</h1>
        <p className="mt-3">
          Prepared algebra examples. No account, AI request, or payment needed.
          Narration uses your browser voice; captions remain visible.
        </p>
      </header>
      <section className="space-y-3" aria-labelledby="board-demo-title">
        <h2 id="board-demo-title" className="text-xl font-semibold">
          A short whiteboard lesson
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border px-4 py-2"
            onClick={() => play(index)}
          >
            Listen / replay
          </button>
          <button
            className="rounded-xl border px-4 py-2"
            disabled={!playing}
            onClick={speech.status === "paused" ? resumeSpeech : pauseSpeech}
          >
            {speech.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button
            className="rounded-xl border px-4 py-2"
            onClick={() => {
              stopSpeech();
              setPlaying(false);
            }}
          >
            Stop
          </button>
          <button
            className="rounded-xl border px-4 py-2"
            disabled={index === 0}
            onClick={() => move(index - 1)}
          >
            Previous
          </button>
          <button
            className="rounded-xl border px-4 py-2"
            disabled={index === STEPS.length - 1}
            onClick={() => move(index + 1)}
          >
            Next
          </button>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={chalk}
              onChange={(event) => setChalk(event.target.checked)}
            />{" "}
            Chalk theme
          </label>
        </div>
        <p role="status">
          Step {index + 1} of {STEPS.length}
        </p>
        <Board
          steps={STEPS}
          index={index}
          chalk={chalk}
          animate={playing}
          paused={speech.status === "paused"}
        />
        <p className="rounded-xl border p-3">{STEPS[index].say}</p>
      </section>
      <section className="rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">A saved flashcard</h2>
        <p className="my-3">What is the slope of y = 2x + 1?</p>
        <button
          className="rounded-xl border px-4 py-2"
          aria-expanded={answer}
          onClick={() => setAnswer(!answer)}
        >
          {answer ? "Hide answer" : "Show answer"}
        </button>
        {answer && (
          <p className="mt-3">2. Each unit increase in x adds 2 to y.</p>
        )}
      </section>
      <section className="space-y-3">
        <label className="block">
          Algebra renderer checks
          <select
            className="mt-2 w-full rounded-xl border p-3"
            value={example}
            onChange={(event) => setExample(Number(event.target.value))}
          >
            {ALGEBRA_CASES.map((item, i) => (
              <option key={i} value={i}>
                {i + 1}. {item.question}
              </option>
            ))}
          </select>
        </label>
        <Graph
          block={{
            id: "demo-check",
            t: "graph",
            xRange: [-5, 5],
            yRange: [-5, 5],
            plots: [{ kind: "function", expr: ALGEBRA_CASES[example].expr }],
          }}
        />
        <p className="text-sm">
          These graphs are computed locally. The question bank is a renderer
          test set, not generated answers.
        </p>
      </section>
      <Link href="/" className="inline-block underline">
        Back to home
      </Link>
    </main>
  );
}
