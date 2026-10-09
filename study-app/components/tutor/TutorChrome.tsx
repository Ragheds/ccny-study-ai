"use client";
import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { StarburstLogo } from "@/components/StarburstLogo";
import type {
  ChatConversation,
  groupConversationsByDate,
} from "@/lib/chatWorkspace";
const LOADING_EMOJIS = ["✏️", "📖", "📓", "🗂️"];
const TYPING_PHRASES = [
  "feel free to ask..",
  "what you need help with..",
  "is that all..",
];
export type Toast = { id: string; msg: string; type: "success" | "error" };
type ChatListProps = {
  activeConversation?: ChatConversation;
  conversationGroups: ReturnType<typeof groupConversationsByDate>;
  editingConvId: string | null;
  editingTitle: string;
  selectedCourseCode: string;
  confirmDeleteId: string | null;
  setEditingConvId: (id: string | null) => void;
  setEditingTitle: (t: string) => void;
  setConfirmDeleteId: (id: string | null) => void;
  onBeginRename: (conv: ChatConversation) => void;
  onRemoveConversation: (conv: ChatConversation) => void;
  onSelectConversation: (id: string) => void;
  onStartNewChat: () => void;
  onSubmitRename: () => void;
};
export type SidebarContentProps = ChatListProps & {
  onClose?: () => void;
};

/* ── icons ──────────────────────────────────────────────────────── */
export function SidebarOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect
        x="1.5"
        y="1.5"
        width="5.5"
        height="15"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10 6l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function SidebarCloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect
        x="1.5"
        y="1.5"
        width="5.5"
        height="15"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M13 6l-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function NewChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function SendIcon({ active }: { active: boolean }) {
  const c = active ? "white" : "var(--app-muted)";
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 2L11 13"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M21.44 11.05L12.25 20.24a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── toast ──────────────────────────────────────────────────────── */
export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === "error" ? "#FEF2F2" : "#F0FDF4",
            border: `1px solid ${t.type === "error" ? "#FCA5A5" : "#86EFAC"}`,
            color: t.type === "error" ? "#991B1B" : "#166534",
            padding: "9px 18px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,.08)",
            animation: "toast-in .18s ease-out",
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── typing phrase ──────────────────────────────────────────────── */
function TypingPhrase() {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<
    "typing" | "pause" | "nod" | "leave" | "reset"
  >("typing");
  const cRef = useRef(0);
  const phrase = TYPING_PHRASES[idx % TYPING_PHRASES.length] ?? "";

  useEffect(() => {
    let alive = true;
    if (phase === "typing") {
      const step = () => {
        if (!alive) return;
        if (cRef.current < phrase.length) {
          cRef.current++;
          setText(phrase.slice(0, cRef.current));
          setTimeout(step, 50);
        } else setPhase("pause");
      };
      const t = setTimeout(step, 50);
      return () => {
        alive = false;
        clearTimeout(t);
      };
    }
    const delays: Record<string, [() => void, number]> = {
      pause: [() => setPhase("nod"), 1000],
      nod: [() => setPhase("leave"), 200],
      leave: [
        () => {
          cRef.current = 0;
          setText("");
          setIdx((i) => (i + 1) % TYPING_PHRASES.length);
          setPhase("reset");
        },
        300,
      ],
      reset: [() => setPhase("typing"), 60],
    };
    const [fn, ms] = delays[phase] ?? [() => {}, 0];
    const t = setTimeout(() => {
      if (alive) fn();
    }, ms);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [phase, idx, phrase]);

  return (
    <span
      className="block min-h-[1em] text-xs"
      style={{
        color: "var(--app-muted)",
        transition: "transform .2s, opacity .3s",
        transformOrigin: "left",
        transform: phase === "nod" ? "scale(1.03)" : "scale(1)",
        opacity: phase === "leave" ? 0 : 1,
      }}
    >
      {text}
      <span
        style={{
          display: "inline-block",
          width: "1.5px",
          height: ".72em",
          background: "var(--app-muted)",
          verticalAlign: "-.04em",
          marginLeft: "1px",
          borderRadius: "1px",
          animation: "cursor-blink .8s step-start infinite",
        }}
      />
    </span>
  );
}

/* ── orbital loader ─────────────────────────────────────────────── */
export function OrbitalLoader({ leaving }: { leaving: boolean }) {
  return (
    <div
      className="px-6 py-4 max-w-3xl mx-auto w-full flex items-center gap-4"
      style={{
        transition: "opacity .3s, transform .3s",
        opacity: leaving ? 0 : 1,
        transform: leaving ? "translateX(16px)" : "none",
      }}
    >
      <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
        {LOADING_EMOJIS.map((e, i) => (
          <span
            key={e}
            className="absolute select-none text-lg leading-none"
            style={{
              top: "50%",
              left: "50%",
              marginTop: "-9px",
              marginLeft: "-9px",
              animation: "emoji-orbit 2.4s cubic-bezier(.4,0,.2,1) infinite",
              animationDelay: `${i * -0.6}s`,
            }}
          >
            {e}
          </span>
        ))}
      </div>
      <span
        className="text-sm text-[var(--app-muted)]"
        style={{ animation: "pulse 1.5s ease-in-out infinite" }}
      >
        Thinking…
      </span>
    </div>
  );
}

/* ── input pill ─────────────────────────────────────────────────── */
export function InputPill({
  input,
  loading,
  courseCode,
  uploadedFileName,
  onChange,
  onKeyDown,
  onSend,
  onUploadToggle,
}: {
  input: string;
  loading: boolean;
  courseCode: string;
  uploadedFileName: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onUploadToggle: () => void;
}) {
  const canSend = Boolean(input.trim()) && !loading;
  return (
    <div
      className="flex items-center gap-2 rounded-2xl px-3 py-3"
      style={{
        background: "var(--app-surface)",
        boxShadow: "0 2px 18px rgba(0,0,0,.06), 0 0 0 1px var(--app-border)",
      }}
    >
      <button
        type="button"
        onClick={onUploadToggle}
        aria-label="Attach class material"
        title={uploadedFileName ? `Using: ${uploadedFileName}` : "Attach file"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-[var(--app-surface-muted)]"
        style={{ color: uploadedFileName ? "#FF6B35" : "var(--app-muted)" }}
      >
        <PaperclipIcon />
      </button>
      <input
        aria-label="Message to tutor"
        placeholder={
          uploadedFileName
            ? `Ask about "${uploadedFileName}"…`
            : `Ask anything about ${courseCode}…`
        }
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={loading}
        className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] disabled:opacity-60"
      />
      <button
        type="button"
        onClick={onSend}
        aria-label="Send message"
        disabled={!canSend}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40"
        style={{
          background: canSend
            ? "linear-gradient(135deg,#FF6B35,#F7931E)"
            : "var(--app-surface-muted)",
        }}
      >
        <SendIcon active={canSend} />
      </button>
    </div>
  );
}

/* ── file upload panel ──────────────────────────────────────────── */
export function UploadPanel({
  uploadedFileName,
  uploadedText,
  onFileChange,
  onPasteChange,
  onClear,
  onClose,
}: {
  uploadedFileName: string;
  uploadedText: string;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onPasteChange: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--app-muted)]">
          Attach material
        </p>
        <button
          onClick={onClose}
          className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          Done
        </button>
      </div>

      <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-[var(--app-border)] px-4 py-3 transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)]">
        <PaperclipIcon />
        <span className="text-sm text-[var(--app-muted)]">
          {uploadedFileName || "Choose .txt or .pdf file"}
        </span>
        <input
          type="file"
          accept=".txt,.pdf"
          onChange={onFileChange}
          className="hidden"
        />
      </label>

      <textarea
        placeholder="…or paste your notes here"
        value={uploadedText}
        onChange={(e) => onPasteChange(e.target.value)}
        className="h-20 w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
      />

      {uploadedText && (
        <button
          onClick={onClear}
          className="text-xs text-[var(--app-muted)] hover:text-red-500 transition"
        >
          Clear material
        </button>
      )}
    </div>
  );
}

/* ── chat list ──────────────────────────────────────────────────── */
function ChatList({
  activeConversation,
  conversationGroups,
  editingConvId,
  editingTitle,
  selectedCourseCode,
  confirmDeleteId,
  setEditingConvId,
  setEditingTitle,
  setConfirmDeleteId,
  onBeginRename,
  onRemoveConversation,
  onSelectConversation,
  onStartNewChat,
  onSubmitRename,
}: ChatListProps) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
          {selectedCourseCode}
        </p>
        <button
          type="button"
          onClick={onStartNewChat}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--app-muted-strong)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
        >
          <NewChatIcon /> New
        </button>
      </div>

      {conversationGroups.length === 0 && (
        <p className="px-3 text-xs text-[var(--app-muted)]">
          No conversations yet.
        </p>
      )}

      {conversationGroups.map((group) => (
        <div key={group.label} className="mb-5">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
            {group.label}
          </p>
          <div className="space-y-px">
            {group.conversations.map((conv) => {
              const isActive = conv.id === activeConversation?.id;
              const isEditing = conv.id === editingConvId;
              const isConfirming = conv.id === confirmDeleteId;
              return (
                <div
                  key={conv.id}
                  className={`group rounded-xl px-3 py-2.5 transition ${isActive ? "bg-[var(--app-surface-strong)]" : "hover:bg-[var(--app-surface-muted)]"}`}
                >
                  {isEditing ? (
                    <div className="flex gap-1.5">
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSubmitRename();
                          if (e.key === "Escape") setEditingConvId(null);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-xs text-[var(--app-text)] outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={onSubmitRename}
                        className="rounded-lg bg-[var(--app-text)] px-2 py-1 text-xs font-semibold text-[var(--app-bg)]"
                      >
                        Save
                      </button>
                    </div>
                  ) : isConfirming ? (
                    /* Inline delete confirm — no window.confirm() */
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--app-muted)] truncate">
                        Delete this chat?
                      </span>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveConversation(conv);
                            setConfirmDeleteId(null);
                          }}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 transition"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectConversation(conv.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm text-[var(--app-text)]">
                          {conv.title}
                        </span>
                        <span className="block text-[11px] text-[var(--app-muted)]">
                          {conv.messages.length} messages
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => onBeginRename(conv)}
                          className="rounded-md p-1 text-[var(--app-muted)] hover:text-[var(--app-text)]"
                          title="Rename"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(conv.id)}
                          className="rounded-md p-1 text-[var(--app-muted)] hover:text-red-500"
                          title="Delete"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/* ── sidebar content ────────────────────────────────────────────── */
export function SidebarContent(props: SidebarContentProps) {
  const { onClose, ...chatListProps } = props;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 py-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg,#FF6B35,#F7931E)",
            boxShadow: "0 2px 8px rgba(255,107,53,.28)",
          }}
        >
          <StarburstLogo size={16} white />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--app-text)]">
            AI Tutor
          </p>
          <TypingPhrase />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* chat list */}
      <div className="flex-1 overflow-y-auto py-3">
        <ChatList {...chatListProps} />
      </div>
    </div>
  );
}
