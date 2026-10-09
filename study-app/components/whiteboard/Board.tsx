"use client";
import dynamic from "next/dynamic";
import { Caveat } from "next/font/google";
import type { Block, Step } from "@/lib/whiteboard/schema";
const handwriting = Caveat({ subsets: ["latin"], display: "swap" });
const Equation = dynamic(() => import("./Equation"), {
  loading: () => <p>Loading equation…</p>,
});
const Graph = dynamic(() => import("./Graph").then((module) => module.Graph), {
  loading: () => <p>Computing graph…</p>,
});
export function visibleBlocks(steps: Step[], index: number) {
  let blocks: Block[] = [];
  for (const step of steps.slice(0, index + 1)) {
    if (step.clearBefore || blocks.length + step.board.length > 10) blocks = [];
    blocks.push(...step.board);
  }
  return blocks;
}
export function Board({
  steps,
  index,
  chalk = false,
  paused = false,
  speed = 1,
  animate = true,
}: {
  steps: Step[];
  index: number;
  chalk?: boolean;
  paused?: boolean;
  speed?: number;
  animate?: boolean;
}) {
  return (
    <div
      className={`${handwriting.className} space-y-4 rounded-2xl border p-5 text-xl ${chalk ? "bg-slate-900 text-slate-50" : "bg-white text-slate-900"}`}
      aria-label="Lesson board"
      data-paused={paused}
    >
      {visibleBlocks(steps, index).map((block) => (
        <div
          key={block.id}
          className={
            animate && steps[index]?.board.some((item) => item.id === block.id)
              ? "board-write"
              : undefined
          }
          style={{
            animationDuration: `${Math.max(1, (steps.find((step) => step.board.some((item) => item.id === block.id))?.say.length ?? 25) / 14 / speed)}s`,
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {block.t === "heading" ? (
            <h2 className="text-3xl font-bold">{block.text}</h2>
          ) : block.t === "text" ? (
            <p>{block.text}</p>
          ) : block.t === "equation" ? (
            <Equation latex={block.latex} />
          ) : block.t === "graph" ? (
            <Graph block={block} />
          ) : block.t === "list" ? (
            <ul className="list-inside list-disc">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : block.t === "flow" ? (
            <div className="flex flex-wrap gap-2">
              {block.nodes.map((node, i) => (
                <span key={i} className="rounded-lg border p-2">
                  {i > 0 ? "→ " : ""}
                  {node}
                </span>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {[block.left, block.right].map((side, i) => (
                <section key={i}>
                  <h3 className="font-bold">{side.title}</h3>
                  <ul>
                    {side.items.map((item, n) => (
                      <li key={n}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
