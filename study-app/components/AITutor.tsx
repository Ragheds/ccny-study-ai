"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import {
  addConversation,
  appendMessagesToConversation,
  ChatConversation,
  ChatMessage,
  closeInactiveConversation,
  createChatMessage,
  createConversation,
  deleteConversation,
  EMPTY_CHAT_WORKSPACE,
  ensureConversationForMessage,
  getCourseConversations,
  groupConversationsByDate,
  migrateLegacyChatHistory,
  renameConversation,
  SavedCourse,
  SavedMajor,
  touchConversation,
} from "@/lib/chatWorkspace";
import { KEYS } from "@/lib/storage";

/* ─── constants ─────────────────────────────────────────────────── */
const EMPTY_MESSAGES: ChatMessage[] = [];
const LOADING_EMOJIS = ["✏️", "📖", "📓", "🗂️"];
const TYPING_PHRASES = ["feel free to ask..", "what you need help with..", "is that all.."];
type AITutorProps = {
  major: SavedMajor;
  courses: SavedCourse[];
  activeCourseCode?: string | null;
  onActiveCourseChange?: (courseCode: string) => void;
};

type Star = { id: number; x: number; y: number };

type ChatListProps = {
  activeConversation?: ChatConversation;
  conversationGroups: ReturnType<typeof groupConversationsByDate>;
  editingConvId: string | null;
  editingTitle: string;
  selectedCourseCode: string;
  setEditingConvId: (id: string | null) => void;
  setEditingTitle: (t: string) => void;
  onBeginRename: (conv: ChatConversation) => void;
  onRemoveConversation: (conv: ChatConversation) => void;
  onSelectConversation: (id: string) => void;
  onStartNewChat: () => void;
  onSubmitRename: () => void;
};

type SidebarProps = ChatListProps & {
  isOpen: boolean;
  onClose: () => void;
  courses: SavedCourse[];
  selectedCourse: SavedCourse | null;
  onChooseCourse: (course: SavedCourse) => void;
};

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ─── StarburstLogo ──────────────────────────────────────────────── */
function StarburstLogo({ size = 28, white = false }: { size?: number; white?: boolean }) {
  const fill = white ? "#fff" : "url(#sbg)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {!white && (
        <defs>
          <linearGradient id="sbg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6B35" />
            <stop offset="1" stopColor="#F7931E" />
          </linearGradient>
        </defs>
      )}
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} />
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} transform="rotate(60 16 16)" />
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} transform="rotate(120 16 16)" />
    </svg>
  );
}

/* ─── TypingPhrase (sidebar header) ─────────────────────────────── */
function TypingPhrase() {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pause" | "nod" | "leave" | "reset">("typing");
  const charRef = useRef(0);
  const phrase = TYPING_PHRASES[idx % TYPING_PHRASES.length] ?? "";

  useEffect(() => {
    let alive = true;
    if (phase === "typing") {
      const step = () => {
        if (!alive) return;
        if (charRef.current < phrase.length) {
          charRef.current += 1;
          setText(phrase.slice(0, charRef.current));
          setTimeout(step, 50);
        } else { setPhase("pause"); }
      };
      const t = setTimeout(step, 50);
      return () => { alive = false; clearTimeout(t); };
    }
    if (phase === "pause") {
      const t = setTimeout(() => { if (alive) setPhase("nod"); }, 1000);
      return () => { alive = false; clearTimeout(t); };
    }
    if (phase === "nod") {
      const t = setTimeout(() => { if (alive) setPhase("leave"); }, 200);
      return () => { alive = false; clearTimeout(t); };
    }
    if (phase === "leave") {
      const t = setTimeout(() => {
        if (!alive) return;
        charRef.current = 0;
        setText("");
        setIdx((i) => (i + 1) % TYPING_PHRASES.length);
        setPhase("reset");
      }, 300);
      return () => { alive = false; clearTimeout(t); };
    }
    if (phase === "reset") {
      const t = setTimeout(() => { if (alive) setPhase("typing"); }, 60);
      return () => { alive = false; clearTimeout(t); };
    }
  }, [phase, idx, phrase]);

  return (
    <span
      className="block min-h-[1em] text-xs"
      style={{
        color: "var(--app-muted)",
        transition: "transform 0.2s ease, opacity 0.3s ease",
        transformOrigin: "left center",
        transform: phase === "nod" ? "scale(1.03)" : "scale(1)",
        opacity: phase === "leave" ? 0 : 1,
      }}
    >
      {text}
      <span
        style={{
          display: "inline-block",
          width: "1.5px",
          height: "0.72em",
          background: "var(--app-muted)",
          verticalAlign: "-0.04em",
          marginLeft: "1px",
          borderRadius: "1px",
          animation: "cursor-blink 0.8s step-start infinite",
        }}
      />
    </span>
  );
}

/* ─── WelcomeTyping (course name cycles) ────────────────────────── */
function WelcomeTyping({ courseName }: { courseName: string }) {
  // key={courseName} is set on this component in the parent, so React
  // remounts it (resetting all state) whenever the course changes.
  const full = `Welcome to ${courseName}`;
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "deleting">("typing");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (displayed.length < full.length) {
        t = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), 50);
      } else {
        t = setTimeout(() => setPhase("deleting"), 2000);
      }
    } else {
      if (displayed.length > 0) {
        t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
      } else {
        t = setTimeout(() => setPhase("typing"), 7000);
      }
    }
    return () => clearTimeout(t);
  }, [phase, displayed, full]);

  return (
    <p className="text-base font-bold" style={{ color: "#3B82F6", minHeight: "1.6em" }}>
      {displayed}
      <span
        style={{
          display: "inline-block",
          width: "2px",
          height: "1em",
          background: "#3B82F6",
          marginLeft: "1px",
          verticalAlign: "-0.12em",
          borderRadius: "1px",
          animation: "cursor-blink 0.8s step-start infinite",
        }}
      />
    </p>
  );
}

/* ─── OrbitalLoader ──────────────────────────────────────────────── */
function OrbitalLoader({ isLeaving }: { isLeaving: boolean }) {
  return (
    <div className="flex justify-start py-3 pl-2">
      <div
        className="relative flex h-[90px] w-[90px] items-center justify-center"
        style={{
          transition: "transform 0.3s ease, opacity 0.3s ease",
          transform: isLeaving ? "translateX(22px)" : "translateX(0)",
          opacity: isLeaving ? 0 : 1,
        }}
      >
        {LOADING_EMOJIS.map((emoji, i) => (
          <span
            key={emoji}
            className="absolute select-none text-[22px] leading-none"
            style={{
              top: "50%", left: "50%",
              marginTop: "-11px", marginLeft: "-11px",
              animation: "emoji-orbit 2.4s cubic-bezier(0.4,0,0.2,1) infinite",
              animationDelay: `${i * -0.6}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────────── */
function EmptyState({ courseCode }: { courseCode: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6 flex items-center justify-center">
        <div className="absolute rounded-full" style={{ inset: "-24px", background: "radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)", animation: "orb-pulse 2.4s ease-in-out infinite" }} />
        <div className="absolute rounded-full" style={{ inset: "-10px", background: "radial-gradient(circle, rgba(247,147,30,0.18) 0%, transparent 70%)", animation: "orb-pulse 2.4s ease-in-out infinite 0.4s" }} />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", boxShadow: "0 8px 32px rgba(255,107,53,0.35)" }}>
          <StarburstLogo size={34} white />
        </div>
      </div>
      <h3 className="text-base font-semibold text-[var(--app-text)]">Ready to study</h3>
      <p className="mt-1 text-sm text-[var(--app-muted)]">
        Ask me anything about{" "}
        <span className="font-mono font-bold" style={{ color: "#FF6B35" }}>{courseCode}</span>
      </p>
    </div>
  );
}

/* ─── MarkdownContent ────────────────────────────────────────────── */
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-3 mt-1 text-xl font-bold text-[#1a1a1a]">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-5 border-b border-black/[0.07] pb-1 text-sm font-bold uppercase tracking-wide text-[#1a1a1a] first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-bold text-[#1a1a1a] first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="mb-3 leading-[1.75] last:mb-0 text-[#1a1a1a]">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-[#1a1a1a]">{children}</strong>,
        em: ({ children }) => <em className="italic text-[#555]">{children}</em>,
        ul: ({ children }) => <ul className="mb-3 space-y-1.5 pl-5 last:mb-0" style={{ listStyleType: "disc" }}>{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 space-y-1.5 pl-5 last:mb-0" style={{ listStyleType: "decimal" }}>{children}</ol>,
        li: ({ children }) => <li className="leading-[1.75] text-[#1a1a1a]">{children}</li>,
        blockquote: ({ children }) => <blockquote className="my-3 border-l-[3px] border-orange-400 pl-4 italic text-[#666]">{children}</blockquote>,
        hr: () => <hr className="my-5 border-black/10" />,
        pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-xl bg-[#f6f6f6] p-4 last:mb-0">{children}</pre>,
        code: ({ className, children }) => {
          const isBlock = Boolean(className);
          return isBlock
            ? <code className="block font-mono text-xs leading-relaxed text-[#1a1a1a]">{children}</code>
            : <code className="rounded-md bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-xs text-[#FF6B35]">{children}</code>;
        },
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto rounded-xl border border-black/[0.07] last:mb-0">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[#fafafa]">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-black/[0.05]">{children}</tbody>,
        tr: ({ children }) => <tr className="transition-colors hover:bg-[#fafafa]">{children}</tr>,
        th: ({ children }) => <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#999]">{children}</th>,
        td: ({ children }) => <td className="px-4 py-3 text-sm text-[#1a1a1a]">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ─── MessageBubble ──────────────────────────────────────────────── */
function MessageBubble({ message, isNew }: { message: ChatMessage; isNew: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg,#FF6B35,#F7931E)",
            boxShadow: "0 2px 8px rgba(255,107,53,0.3)",
            animation: isNew ? "avatar-swipe-in 0.32s ease-out" : "none",
          }}
        >
          <StarburstLogo size={16} white />
        </div>
      )}
      <div
        className="max-w-[80%] text-sm leading-relaxed"
        style={
          isUser
            ? { background: "#1a1a1a", color: "#fff", padding: "12px 18px", borderRadius: "18px 18px 4px 18px" }
            : { background: "#ffffff", color: "#1a1a1a", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "14px 18px", borderRadius: "4px 18px 18px 18px" }
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownContent content={message.content} />
        )}
        <p className="mt-2 text-[11px]" style={{ opacity: 0.45, color: isUser ? "#fff" : "#bbb" }}>
          {formatMessageTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

/* ─── ChatList ───────────────────────────────────────────────────── */
function ChatList({
  activeConversation,
  conversationGroups,
  editingConvId,
  editingTitle,
  selectedCourseCode,
  setEditingConvId,
  setEditingTitle,
  onBeginRename,
  onRemoveConversation,
  onSelectConversation,
  onStartNewChat,
  onSubmitRename,
}: ChatListProps) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--app-muted)]">Chats</p>
          <p className="mt-0.5 font-mono text-xs font-bold text-[var(--app-muted-strong)]">
            {selectedCourseCode}
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNewChat}
          className="rounded-xl bg-[var(--app-text)] px-3 py-2 text-xs font-semibold text-[var(--app-bg)] transition hover:opacity-90"
        >
          New chat
        </button>
      </div>

      <div className="space-y-4">
        {conversationGroups.length === 0 && (
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 text-xs text-[var(--app-muted)]">
            No conversations yet. Start one above.
          </div>
        )}
        {conversationGroups.map((group) => (
          <div key={group.label}>
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.conversations.map((conv) => {
                const isActive  = conv.id === activeConversation?.id;
                const isEditing = conv.id === editingConvId;
                return (
                  <div
                    key={conv.id}
                    className={`rounded-xl border p-2 transition ${
                      isActive
                        ? "border-[var(--app-border-strong)] bg-[var(--app-surface-strong)]"
                        : "border-transparent hover:bg-[var(--app-surface-muted)]"
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")  onSubmitRename();
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
                    ) : (
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectConversation(conv.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm font-medium text-[var(--app-text)]">
                            {conv.title}
                          </span>
                          <span className="block text-[11px] text-[var(--app-muted)]">
                            {conv.messages.length} message{conv.messages.length !== 1 ? "s" : ""}
                          </span>
                        </button>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => onBeginRename(conv)} className="rounded-md px-1.5 py-1 text-[11px] text-[var(--app-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]">
                            Rename
                          </button>
                          <button type="button" onClick={() => onRemoveConversation(conv)} className="rounded-md px-1.5 py-1 text-[11px] text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-500">
                            Delete
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
      </div>
    </>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────── */
function Sidebar(props: SidebarProps) {
  const {
    isOpen, onClose, courses, selectedCourse, onChooseCourse,
    ...chatListProps
  } = props;

  const [pickerOpen, setPickerOpen] = useState(false);

  const handleClose = () => {
    setPickerOpen(false);
    onClose();
  };
  const [glowing, setGlowing] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const glow = () => {
      setGlowing(true);
      setStars(
        Array.from({ length: 6 }, (_, i) => ({
          id: i,
          x: 10 + 80 * Math.cos((i * Math.PI * 2) / 6),
          y: 10 + 80 * Math.sin((i * Math.PI * 2) / 6),
        }))
      );
      setTimeout(() => { setGlowing(false); setStars([]); }, 2000);
    };
    const first = setTimeout(glow, 3000);
    const loop  = setInterval(glow, 40000);
    return () => { clearTimeout(first); clearInterval(loop); };
  }, []);


  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.45)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
        onClick={onClose}
      />

      {/* sidebar panel — spring slide-in = nod effect via cubic-bezier */}
      <div
        className="fixed left-0 top-0 z-50 flex flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl"
        style={{
          width: "min(300px, 86vw)",
          height: "100dvh",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: isOpen
            ? "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)"  // spring → nod
            : "transform 0.26s ease-in",
        }}
      >
        {/* header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 py-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", boxShadow: "0 2px 8px rgba(255,107,53,0.35)" }}
          >
            <StarburstLogo size={18} white />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--app-text)]">Raghed</p>
            <TypingPhrase />
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
          >
            ✕
          </button>
        </div>

        {/* chat list */}
        <div className="flex-1 overflow-y-auto p-3">
          <ChatList {...chatListProps} />
        </div>

        {/* switch course footer */}
        <div className="relative shrink-0 border-t border-[var(--app-border)] p-3">
          {/* star particles */}
          {stars.map((s) => (
            <span
              key={s.id}
              className="pointer-events-none absolute text-[11px]"
              style={{
                left: `${s.x}%`, top: `${s.y}%`,
                animation: "star-ping 0.9s ease-out forwards",
                animationDelay: `${s.id * 55}ms`,
              }}
            >
              ✨
            </span>
          ))}

          {/* course picker — rises up with spring */}
          <div
            className="absolute bottom-full left-3 right-3 overflow-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl"
            style={{
              maxHeight: 280,
              transform: pickerOpen ? "translateY(0) scale(1)" : "translateY(14px) scale(0.97)",
              opacity: pickerOpen ? 1 : 0,
              pointerEvents: pickerOpen ? "auto" : "none",
              transition: pickerOpen
                ? "transform 0.34s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease"
                : "transform 0.18s ease-in, opacity 0.15s ease",
            }}
          >
            <div className="p-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                Switch Course
              </p>
              <div className="space-y-2">
                {courses.map((course) => (
                  <button
                    key={course.code}
                    type="button"
                    onClick={() => { onChooseCourse(course); setPickerOpen(false); }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedCourse?.code === course.code
                        ? "border-[var(--app-border-strong)] bg-[var(--app-surface-strong)]"
                        : "border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"
                    }`}
                  >
                    <span className="block font-mono text-xs font-bold" style={{ color: course.color }}>
                      {course.code}
                    </span>
                    <span className="block truncate text-xs text-[var(--app-text)]">{course.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* trigger button */}
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="w-full rounded-2xl px-3 py-3 text-left transition-all duration-300"
            style={{
              background: glowing ? "rgba(247,147,30,0.07)" : "var(--app-surface)",
              border: `1px solid ${glowing ? "#F7931E" : "var(--app-border)"}`,
              boxShadow: glowing ? "0 0 0 3px rgba(247,147,30,0.22),0 0 18px rgba(255,107,53,0.18)" : "none",
              transform: glowing ? "scale(1.04)" : "scale(1)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
              {pickerOpen ? "Close" : "Switch course"}
            </p>
            <p className="mt-0.5 truncate font-mono text-xs font-bold text-[var(--app-text)]">
              {courses.map((c) => c.code).join(" • ") || "No courses"}
            </p>
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── AITutor (main) ─────────────────────────────────────────────── */
export function AITutor({ major, courses, activeCourseCode, onActiveCourseChange }: AITutorProps) {
  const hydrated    = useHydrated();
  const [workspace, setWorkspace] = useStoredValue(KEYS.CHAT_WORKSPACE, EMPTY_CHAT_WORKSPACE);
  const [legacyMessages]          = useStoredValue(KEYS.CHAT_HISTORY, EMPTY_MESSAGES);

  const [selectedCourseCode, setSelectedCourseCode] = useState(() => {
    const req = courses.find((c) => c.code === activeCourseCode);
    return req?.code ?? courses[0]?.code ?? "";
  });

  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [orbitsLeaving,  setOrbitsLeaving]  = useState(false);
  const [newMsgId,       setNewMsgId]       = useState<string | null>(null);
  const [uploadedText,   setUploadedText]   = useState("");
  const [showUpload,     setShowUpload]     = useState(false);
  const [editingConvId,  setEditingConvId]  = useState<string | null>(null);
  const [editingTitle,   setEditingTitle]   = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedCourse =
    courses.find((c) => c.code === selectedCourseCode) ?? courses[0] ?? null;

  const courseConversations = selectedCourse
    ? getCourseConversations(workspace, selectedCourse.code) : [];

  const activeConversationId = selectedCourse
    ? workspace.activeByCourse[selectedCourse.code] : undefined;

  const activeConversation = activeConversationId
    ? workspace.conversationsById[activeConversationId] : undefined;

  const messages           = activeConversation?.messages ?? EMPTY_MESSAGES;
  const conversationGroups = groupConversationsByDate(courseConversations);

  /* migrate + close inactive */
  useEffect(() => {
    if (!hydrated) return;
    const m = migrateLegacyChatHistory(workspace, legacyMessages, courses, major);
    if (m !== workspace) setWorkspace(m);
  }, [courses, hydrated, legacyMessages, major, setWorkspace, workspace]);

  useEffect(() => {
    if (!hydrated || !selectedCourse) return;
    const c = closeInactiveConversation(workspace, selectedCourse.code);
    if (c !== workspace) setWorkspace(c);
  }, [hydrated, selectedCourse, setWorkspace, workspace]);

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* course actions */
  const chooseCourse = (course: SavedCourse) => {
    setSelectedCourseCode(course.code);
    setInput("");
    setSidebarOpen(false);
    onActiveCourseChange?.(course.code);
  };

  const startNewChat = () => {
    if (!selectedCourse) return;
    setWorkspace((cur) => addConversation(cur, createConversation(selectedCourse, major)));
    setInput("");
    setSidebarOpen(false);
  };

  const selectConversation = (id: string) => {
    setWorkspace((cur) => touchConversation(cur, id));
    setInput("");
    setSidebarOpen(false);
  };

  const beginRename = (conv: ChatConversation) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const submitRename = () => {
    if (!editingConvId) return;
    setWorkspace((cur) => renameConversation(cur, editingConvId, editingTitle));
    setEditingConvId(null);
    setEditingTitle("");
  };

  const removeConversation = (conv: ChatConversation) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${conv.title}"?`)) return;
    setWorkspace((cur) => deleteConversation(cur, conv.id));
    if (editingConvId === conv.id) { setEditingConvId(null); setEditingTitle(""); }
  };

  const sendMessage = async (overrideMessage?: string, action?: string) => {
    if (!selectedCourse || loading) return;
    const message = (overrideMessage ?? input).trim();
    if (!message) return;

    const withConv = ensureConversationForMessage(workspace, selectedCourse, major, message);
    const prev =
      withConv.workspace.conversationsById[withConv.conversationId]?.messages ?? EMPTY_MESSAGES;

    const userMsg  = createChatMessage("user", message, action);
    const withUser = appendMessagesToConversation(withConv.workspace, withConv.conversationId, [userMsg]);
    setWorkspace(withUser);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: uploadedText
            ? `Based on these materials:\n\n${uploadedText}\n\n${message}`
            : message,
          action:  action ?? "general",
          context: {
            major:         major.name,
            majorCode:     major.code,
            school:        major.school,
            course:        selectedCourse.name,
            courseCode:    selectedCourse.code,
            courseSection: selectedCourse.section,
          },
          history: prev.slice(-8),
        }),
      });

      const data = await res.json() as { response?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to get a response.");

      const aiMsg = createChatMessage("ai", data.response ?? "Something went wrong.");
      setNewMsgId(aiMsg.id);
      setTimeout(() => setNewMsgId(null), 700);
      setWorkspace((cur) =>
        appendMessagesToConversation(cur, withConv.conversationId, [aiMsg])
      );
    } catch {
      const errMsg = createChatMessage("ai", "Failed to get a response. Please try again.");
      setWorkspace((cur) =>
        appendMessagesToConversation(cur, withConv.conversationId, [errMsg])
      );
    } finally {
      setOrbitsLeaving(true);
      setTimeout(() => setOrbitsLeaving(false), 350);
      setLoading(false);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { setUploadedText(e.target?.result as string); setShowUpload(false); };
    reader.readAsText(file);
  };

  if (!hydrated) return <div className="min-h-[360px]" />;
  if (courses.length === 0 || !selectedCourse) {
    return (
      <div className="py-20 text-center">
        <p className="text-[var(--app-muted)]">Add courses first to use the AI Tutor.</p>
      </div>
    );
  }

  const showOrbits = loading || orbitsLeaving;

  return (
    /* fixed-height container — only the messages div inside scrolls */
    <div
      className="relative flex flex-col overflow-hidden"
      style={{ height: "calc(100dvh - 180px)", minHeight: "520px" }}
    >
      {/* ── sidebar overlay ──────────────────────────────────── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        courses={courses}
        selectedCourse={selectedCourse}
        onChooseCourse={chooseCourse}
        activeConversation={activeConversation}
        conversationGroups={conversationGroups}
        editingConvId={editingConvId}
        editingTitle={editingTitle}
        selectedCourseCode={selectedCourse.code}
        setEditingConvId={setEditingConvId}
        setEditingTitle={setEditingTitle}
        onBeginRename={beginRename}
        onRemoveConversation={removeConversation}
        onSelectConversation={selectConversation}
        onStartNewChat={startNewChat}
        onSubmitRename={submitRename}
      />

      {/* ── top bar: pulsing logo + welcome typing ────────────── */}
      <div className="shrink-0 mb-4 flex items-center gap-4">
        <div className="relative">
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: "rgba(255,107,53,0.35)", animation: "orb-pulse 1.8s ease-in-out infinite" }}
          />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
            style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", boxShadow: "0 2px 14px rgba(255,107,53,0.5)" }}
            title="Open chat history"
          >
            <StarburstLogo size={18} white />
          </button>
        </div>
        <WelcomeTyping key={selectedCourse.code} courseName={selectedCourse.name} />
      </div>


      {/* upload panel */}
      {showUpload && (
        <div className="shrink-0 mb-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
          <input type="file" accept=".txt" onChange={handleFileUpload} className="mb-3 block text-sm text-[var(--app-muted)]" />
          <textarea
            placeholder="Or paste your notes here..."
            value={uploadedText}
            onChange={(e) => setUploadedText(e.target.value)}
            className="h-24 w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
          />
          <button onClick={() => setShowUpload(false)} className="mt-2 text-xs text-[var(--app-muted)] hover:text-[var(--app-text)]">
            Done
          </button>
        </div>
      )}

      {/* ── MESSAGES — ONLY THIS SCROLLS ─────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-4 pr-1">
        {messages.length === 0 && !showOrbits && (
          <EmptyState courseCode={selectedCourse.code} />
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isNew={msg.id === newMsgId} />
        ))}
        {showOrbits && <OrbitalLoader isLeaving={orbitsLeaving} />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── floating input pill ───────────────────────────────── */}
      {
        <div
          className="shrink-0 mt-3 rounded-2xl border border-[var(--app-border)] px-2 py-2 shadow-lg"
          style={{ backdropFilter: "blur(12px)", background: "color-mix(in srgb, var(--app-surface) 90%, transparent)", position: "sticky", bottom: 0, zIndex: 10 }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUpload((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              title="Upload material"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <input
              placeholder={`Ask anything about ${selectedCourse.code}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
              }}
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      }
      <p className="shrink-0 mt-2 text-center text-[11px] text-[var(--app-muted)]">
        Raghed can make mistakes. Please check on important work.
      </p>
    </div>
  );
}
