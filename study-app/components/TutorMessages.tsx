"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/chatWorkspace";
import { StarburstLogo } from "@/components/StarburstLogo";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ── markdown renderer ──────────────────────────────────────────── */
function MD({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      h1: ({ children }) => <h1 className="mb-3 mt-1 text-xl font-bold text-[var(--app-text)]">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-2 mt-5 border-b border-[var(--app-border)] pb-1 text-sm font-bold uppercase tracking-wide text-[var(--app-text)] first:mt-0">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-bold text-[var(--app-text)] first:mt-0">{children}</h3>,
      p:  ({ children }) => <p className="mb-3 leading-[1.8] last:mb-0 text-[var(--app-text)]">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-[var(--app-text)]">{children}</strong>,
      em:     ({ children }) => <em className="italic text-[var(--app-muted-strong)]">{children}</em>,
      ul: ({ children }) => <ul className="mb-3 space-y-1.5 pl-5 last:mb-0" style={{ listStyleType: "disc" }}>{children}</ul>,
      ol: ({ children }) => <ol className="mb-3 space-y-1.5 pl-5 last:mb-0" style={{ listStyleType: "decimal" }}>{children}</ol>,
      li: ({ children }) => <li className="leading-[1.8] text-[var(--app-text)]">{children}</li>,
      blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-orange-400 pl-4 italic text-[var(--app-muted-strong)]">{children}</blockquote>,
      hr:  () => <hr className="my-5 border-[var(--app-border)]" />,
      pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-2xl bg-[var(--app-surface)] p-4 last:mb-0">{children}</pre>,
      code: ({ className, children }) => Boolean(className)
        ? <code className="block font-mono text-xs leading-relaxed text-[var(--app-text)]">{children}</code>
        : <code className="rounded bg-[var(--app-surface)] px-1.5 py-0.5 font-mono text-xs" style={{ color: "#FF6B35" }}>{children}</code>,
      table: ({ children }) => <div className="mb-3 overflow-x-auto rounded-2xl border border-[var(--app-border)] last:mb-0"><table className="w-full text-sm">{children}</table></div>,
      thead: ({ children }) => <thead className="bg-[var(--app-surface-muted)]">{children}</thead>,
      tbody: ({ children }) => <tbody className="divide-y divide-[var(--app-border)]">{children}</tbody>,
      tr:   ({ children }) => <tr className="hover:bg-[var(--app-surface-muted)] transition-colors">{children}</tr>,
      th:   ({ children }) => <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--app-muted)]">{children}</th>,
      td:   ({ children }) => <td className="px-4 py-3 text-sm text-[var(--app-text)]">{children}</td>,
    }}>
      {content}
    </ReactMarkdown>
  );
}

/* ── messages ───────────────────────────────────────────────────── */
function AIMessage({ msg, isNew }: { msg: ChatMessage; isNew: boolean }) {
  return (
    <div className="group px-6 py-5 max-w-3xl mx-auto w-full flex gap-4">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{
        background: "linear-gradient(135deg,#FF6B35,#F7931E)",
        boxShadow: "0 1px 6px rgba(255,107,53,.28)",
        animation: isNew ? "avatar-swipe-in .3s ease-out" : "none",
      }}>
        <StarburstLogo size={13} white />
      </div>
      <div className="flex-1 min-w-0">
        <MD content={msg.content} />
        <p className="mt-2 text-[11px] text-[var(--app-muted)] opacity-0 transition-opacity group-hover:opacity-100">{formatTime(msg.timestamp)}</p>
      </div>
    </div>
  );
}

function UserMessage({ msg, isNew }: { msg: ChatMessage; isNew?: boolean }) {
  return (
    <div className="px-6 py-3 max-w-3xl mx-auto w-full flex justify-end">
      <div className="max-w-[75%]" style={{ animation: isNew ? "user-msg-in .3s ease-out" : "none" }}>
        <div
          className="rounded-[20px] px-5 py-3.5 text-sm leading-relaxed"
          style={{
            background: "linear-gradient(135deg,#2A2A28,#1A1A18)",
            color: "var(--app-bg)",
            boxShadow: "0 2px 10px rgba(0,0,0,.14)",
          }}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        <p className="mt-1 pr-1 text-right text-[11px] text-[var(--app-muted)]">{formatTime(msg.timestamp)}</p>
      </div>
    </div>
  );
}

/* ── streaming cursor ───────────────────────────────────────────── */
function StreamingAIMessage({ content }: { content: string }) {
  return (
    <div className="px-6 py-5 max-w-3xl mx-auto w-full flex gap-4">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{
        background: "linear-gradient(135deg,#FF6B35,#F7931E)",
        boxShadow: "0 1px 6px rgba(255,107,53,.28)",
      }}>
        <StarburstLogo size={13} white />
      </div>
      <div className="flex-1 min-w-0">
        {content ? <MD content={content} /> : (
          <span className="inline-block h-4 w-1.5 rounded-sm bg-current opacity-60"
            style={{ animation: "cursor-blink .8s step-start infinite" }} />
        )}
      </div>
    </div>
  );
}


export const MemoAIMessage = memo(AIMessage);
export const MemoUserMessage = memo(UserMessage);
export const MemoStreamingAIMessage = memo(StreamingAIMessage);
