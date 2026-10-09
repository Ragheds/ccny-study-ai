"use client";

import { ChangeEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import type { StudyMode } from "@/lib/studyMode";
import { SpeechToolbar } from "@/components/SpeechToolbar";
import { DEFAULT_SPEECH_PREFERENCES, speakText, stopSpeech, type SpeechPreferences } from "@/lib/speech";
import { StarburstLogo } from "@/components/StarburstLogo";
import { MemoAIMessage, MemoUserMessage, MemoStreamingAIMessage } from "@/components/TutorMessages";

/* ── constants ──────────────────────────────────────────────────── */
const EMPTY_MESSAGES: ChatMessage[] = [];
const LOADING_EMOJIS = ["✏️", "📖", "📓", "🗂️"];
const TYPING_PHRASES = ["feel free to ask..", "what you need help with..", "is that all.."];

type AITutorProps = {
  major: SavedMajor;
  courses: SavedCourse[];
  activeCourseCode?: string | null;
};
type Toast = { id: string; msg: string; type: "success" | "error" };
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
type SidebarContentProps = ChatListProps & {
  onClose?: () => void;
};

/* ── PDF extraction via CDN pdf.js ──────────────────────────────── */
async function extractPDFText(file: File): Promise<string> {
  // Dynamically load pdf.js from CDN so we don't need to install a package
  if (!(window as unknown as Record<string, unknown>)["pdfjsLib"]) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        (window as unknown as Record<string, { GlobalWorkerOptions: { workerSrc: string } }>)[
          "pdfjsLib"
        ].GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const pdfjsLib = (window as unknown as Record<string, unknown>)["pdfjsLib"] as {
    getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }>;
    }> };
  };

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return text.trim();
}

/* ── icons ──────────────────────────────────────────────────────── */
function SidebarOpenIcon()  { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="1.5" width="5.5" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10 6l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function SidebarCloseIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="1.5" width="5.5" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M13 6l-3 3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function NewChatIcon()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function SendIcon({ active }: { active: boolean }) {
  const c = active ? "white" : "var(--app-muted)";
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function PaperclipIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05L12.25 20.24a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

/* ── toast ──────────────────────────────────────────────────────── */
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#FEF2F2" : "#F0FDF4",
          border: `1px solid ${t.type === "error" ? "#FCA5A5" : "#86EFAC"}`,
          color: t.type === "error" ? "#991B1B" : "#166534",
          padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,.08)",
          animation: "toast-in .18s ease-out",
        }}>
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
  const [phase, setPhase] = useState<"typing" | "pause" | "nod" | "leave" | "reset">("typing");
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
      return () => { alive = false; clearTimeout(t); };
    }
    const delays: Record<string, [() => void, number]> = {
      pause: [() => setPhase("nod"), 1000],
      nod:   [() => setPhase("leave"), 200],
      leave: [() => { cRef.current = 0; setText(""); setIdx(i => (i + 1) % TYPING_PHRASES.length); setPhase("reset"); }, 300],
      reset: [() => setPhase("typing"), 60],
    };
    const [fn, ms] = delays[phase] ?? [() => {}, 0];
    const t = setTimeout(() => { if (alive) fn(); }, ms);
    return () => { alive = false; clearTimeout(t); };
  }, [phase, idx, phrase]);

  return (
    <span className="block min-h-[1em] text-xs" style={{
      color: "var(--app-muted)", transition: "transform .2s, opacity .3s", transformOrigin: "left",
      transform: phase === "nod" ? "scale(1.03)" : "scale(1)",
      opacity: phase === "leave" ? 0 : 1,
    }}>
      {text}
      <span style={{
        display: "inline-block", width: "1.5px", height: ".72em",
        background: "var(--app-muted)", verticalAlign: "-.04em", marginLeft: "1px",
        borderRadius: "1px", animation: "cursor-blink .8s step-start infinite",
      }} />
    </span>
  );
}

/* ── orbital loader ─────────────────────────────────────────────── */
function OrbitalLoader({ leaving }: { leaving: boolean }) {
  return (
    <div className="px-6 py-4 max-w-3xl mx-auto w-full flex items-center gap-4" style={{
      transition: "opacity .3s, transform .3s",
      opacity: leaving ? 0 : 1,
      transform: leaving ? "translateX(16px)" : "none",
    }}>
      <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
        {LOADING_EMOJIS.map((e, i) => (
          <span key={e} className="absolute select-none text-lg leading-none" style={{
            top: "50%", left: "50%", marginTop: "-9px", marginLeft: "-9px",
            animation: "emoji-orbit 2.4s cubic-bezier(.4,0,.2,1) infinite",
            animationDelay: `${i * -0.6}s`,
          }}>{e}</span>
        ))}
      </div>
      <span className="text-sm text-[var(--app-muted)]" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>Thinking…</span>
    </div>
  );
}

/* ── input pill ─────────────────────────────────────────────────── */
function InputPill({ input, loading, courseCode, uploadedFileName, onChange, onKeyDown, onSend, onUploadToggle }: {
  input: string; loading: boolean; courseCode: string; uploadedFileName: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onUploadToggle: () => void;
}) {
  const canSend = Boolean(input.trim()) && !loading;
  return (
    <div className="flex items-center gap-2 rounded-2xl px-3 py-3" style={{
      background: "var(--app-surface)",
      boxShadow: "0 2px 18px rgba(0,0,0,.06), 0 0 0 1px var(--app-border)",
    }}>
      <button
        type="button"
        onClick={onUploadToggle}
        title={uploadedFileName ? `Using: ${uploadedFileName}` : "Attach file"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-[var(--app-surface-muted)]"
        style={{ color: uploadedFileName ? "#FF6B35" : "var(--app-muted)" }}
      >
        <PaperclipIcon />
      </button>
      <input
        placeholder={uploadedFileName ? `Ask about "${uploadedFileName}"…` : `Ask anything about ${courseCode}…`}
        value={input}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={loading}
        className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] disabled:opacity-60"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40"
        style={{ background: canSend ? "linear-gradient(135deg,#FF6B35,#F7931E)" : "var(--app-surface-muted)" }}
      >
        <SendIcon active={canSend} />
      </button>
    </div>
  );
}

/* ── file upload panel ──────────────────────────────────────────── */
function UploadPanel({
  uploadedFileName, uploadedText, onFileChange, onPasteChange, onClear, onClose,
}: {
  uploadedFileName: string; uploadedText: string;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onPasteChange: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--app-muted)]">Attach material</p>
        <button onClick={onClose} className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text)]">Done</button>
      </div>

      <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-[var(--app-border)] px-4 py-3 transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-muted)]">
        <PaperclipIcon />
        <span className="text-sm text-[var(--app-muted)]">{uploadedFileName || "Choose .txt or .pdf file"}</span>
        <input type="file" accept=".txt,.pdf" onChange={onFileChange} className="hidden" />
      </label>

      <textarea
        placeholder="…or paste your notes here"
        value={uploadedText}
        onChange={e => onPasteChange(e.target.value)}
        className="h-20 w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
      />

      {uploadedText && (
        <button onClick={onClear} className="text-xs text-[var(--app-muted)] hover:text-red-500 transition">
          Clear material
        </button>
      )}
    </div>
  );
}

/* ── chat list ──────────────────────────────────────────────────── */
function ChatList({
  activeConversation, conversationGroups, editingConvId, editingTitle,
  selectedCourseCode, confirmDeleteId,
  setEditingConvId, setEditingTitle, setConfirmDeleteId,
  onBeginRename, onRemoveConversation, onSelectConversation, onStartNewChat, onSubmitRename,
}: ChatListProps) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">{selectedCourseCode}</p>
        <button type="button" onClick={onStartNewChat} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--app-muted-strong)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]">
          <NewChatIcon /> New
        </button>
      </div>

      {conversationGroups.length === 0 && (
        <p className="px-3 text-xs text-[var(--app-muted)]">No conversations yet.</p>
      )}

      {conversationGroups.map(group => (
        <div key={group.label} className="mb-5">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">{group.label}</p>
          <div className="space-y-px">
            {group.conversations.map(conv => {
              const isActive  = conv.id === activeConversation?.id;
              const isEditing = conv.id === editingConvId;
              const isConfirming = conv.id === confirmDeleteId;
              return (
                <div key={conv.id} className={`group rounded-xl px-3 py-2.5 transition ${isActive ? "bg-[var(--app-surface-strong)]" : "hover:bg-[var(--app-surface-muted)]"}`}>
                  {isEditing ? (
                    <div className="flex gap-1.5">
                      <input
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") onSubmitRename(); if (e.key === "Escape") setEditingConvId(null); }}
                        className="min-w-0 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-xs text-[var(--app-text)] outline-none"
                        autoFocus
                      />
                      <button type="button" onClick={onSubmitRename} className="rounded-lg bg-[var(--app-text)] px-2 py-1 text-xs font-semibold text-[var(--app-bg)]">Save</button>
                    </div>
                  ) : isConfirming ? (
                    /* Inline delete confirm — no window.confirm() */
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--app-muted)] truncate">Delete this chat?</span>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => { onRemoveConversation(conv); setConfirmDeleteId(null); }}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 transition">Delete</button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text)] transition">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => onSelectConversation(conv.id)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm text-[var(--app-text)]">{conv.title}</span>
                        <span className="block text-[11px] text-[var(--app-muted)]">{conv.messages.length} messages</span>
                      </button>
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={() => onBeginRename(conv)}
                          className="rounded-md p-1 text-[var(--app-muted)] hover:text-[var(--app-text)]" title="Rename">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(conv.id)}
                          className="rounded-md p-1 text-[var(--app-muted)] hover:text-red-500" title="Delete">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
function SidebarContent(props: SidebarContentProps) {
  const { onClose, ...chatListProps } = props;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", boxShadow: "0 2px 8px rgba(255,107,53,.28)" }}>
          <StarburstLogo size={16} white />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--app-text)]">AI Tutor</p>
          <TypingPhrase />
        </div>
        {onClose && (
          <button type="button" onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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

/* ── Main ───────────────────────────────────────────────────────── */
export function AITutor({ major, courses, activeCourseCode }: AITutorProps) {
  const hydrated = useHydrated();
  const [workspace, setWorkspace]    = useStoredValue(KEYS.CHAT_WORKSPACE, EMPTY_CHAT_WORKSPACE);
  const [legacyMsgs]                 = useStoredValue(KEYS.CHAT_HISTORY, EMPTY_MESSAGES);
  const [uploadDraft, setUploadDraft] = useStoredValue<{ text: string; fileName: string }>(KEYS.UPLOAD_DRAFT, { text: "", fileName: "" });
  const [studyMode] = useStoredValue<StudyMode | null>(KEYS.STUDY_MODE, null);
  const [speechPreferences, setSpeechPreferences] = useStoredValue<SpeechPreferences>(KEYS.SPEECH_PREFERENCES, DEFAULT_SPEECH_PREFERENCES);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebar, setMobileSidebar]       = useState(false);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [orbitsLeaving, setOrbitsLeaving] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [newMsgId, setNewMsgId]       = useState<string | null>(null);
  const [showUpload, setShowUpload]   = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle]   = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toasts, setToasts]           = useState<Toast[]>([]);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);
  const requestAbort = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  // Measure exactly how much viewport space is actually left below this
  // component (navbar + tab bar height varies by device/zoom), instead of
  // guessing with a fixed "100dvh - 180px" — a wrong guess is what let the
  // whole page scroll to reveal empty space under the sidebar/chat.
  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const top = containerRef.current.getBoundingClientRect().top;
      setContainerHeight(window.innerHeight - top);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [hydrated]);

  const fixedHeight = containerHeight !== null ? `${containerHeight}px` : "calc(100dvh - 180px)";

  const addToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = `t_${Date.now()}`;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  }, []);

  const sel    = courses.find(c => c.code === activeCourseCode) ?? courses[0] ?? null;
  const convs  = sel ? getCourseConversations(workspace, sel.code) : [];
  const aConvId = sel ? workspace.activeByCourse[sel.code] : undefined;
  const aConv   = aConvId ? workspace.conversationsById[aConvId] : undefined;
  const msgs    = aConv?.messages ?? EMPTY_MESSAGES;
  const groups  = groupConversationsByDate(convs);

  useEffect(() => {
    if (!hydrated) return;
    const m = migrateLegacyChatHistory(workspace, legacyMsgs, courses, major);
    if (m !== workspace) setWorkspace(m);
  }, [courses, hydrated, legacyMsgs, major, setWorkspace, workspace]);

  useEffect(() => {
    if (!hydrated || !sel) return;
    const c = closeInactiveConversation(workspace, sel.code);
    if (c !== workspace) setWorkspace(c);
  }, [hydrated, sel, setWorkspace, workspace]);

  useLayoutEffect(() => {
    const element = chatScrollRef.current;
    if (element && followLatest.current) element.scrollTop = element.scrollHeight;
  }, [msgs, loading, streamingContent]);

  useEffect(() => () => { stopSpeech(); requestAbort.current?.abort(); }, []);

  const listenToReply = useCallback((msg: ChatMessage) => {
    speakText(msg.content, speechPreferences, msg.id);
  }, [speechPreferences]);

  const handleChatScroll = () => {
    const element = chatScrollRef.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 80;
    followLatest.current = nearBottom;
    setShowJump(!nearBottom);
  };
  const jumpToLatest = () => {
    followLatest.current = true;
    const element = chatScrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
    setShowJump(false);
  };

  const startNewChat  = () => { if (!sel) return; requestAbort.current?.abort(); stopSpeech(); followLatest.current = true; setShowJump(false); setWorkspace(cur => addConversation(cur, createConversation(sel, major))); setInput(""); setMobileSidebar(false); };
  const selectConv    = (id: string) => { requestAbort.current?.abort(); stopSpeech(); followLatest.current = true; setShowJump(false); setWorkspace(cur => touchConversation(cur, id)); setInput(""); setMobileSidebar(false); };
  const beginRename   = (conv: ChatConversation) => { setEditingConvId(conv.id); setEditingTitle(conv.title); };
  const submitRename  = () => {
    if (!editingConvId) return;
    setWorkspace(cur => renameConversation(cur, editingConvId, editingTitle));
    setEditingConvId(null); setEditingTitle("");
    addToast("Conversation renamed");
  };
  const removeConv    = (conv: ChatConversation) => {
    setWorkspace(cur => deleteConversation(cur, conv.id));
    if (editingConvId === conv.id) { setEditingConvId(null); setEditingTitle(""); }
    addToast("Conversation deleted");
  };

  /* ── STREAMING send ─────────────────────────────────────────── */
  const sendMessage = async (overrideMsg?: string) => {
    if (!sel || loading) return;
    const text = (overrideMsg ?? input).trim();
    if (!text) return;

    // Read the position before adding text, including a scroll event still pending in the browser.
    handleChatScroll();
    stopSpeech();
    const controller = new AbortController();
    requestAbort.current = controller;
    const wc   = ensureConversationForMessage(workspace, sel, major, text);
    const prev = wc.workspace.conversationsById[wc.conversationId]?.messages ?? EMPTY_MESSAGES;
    const uMsg = createChatMessage("user", text);
    setWorkspace(appendMessagesToConversation(wc.workspace, wc.conversationId, [uMsg]));
    setInput(""); setLoading(true); setStreamingContent("");
    let pendingFrame = 0;

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: uploadDraft.text ? `Based on:\n\n${uploadDraft.text}\n\n${text}` : text,
          action: "general",
          studyMode,
          context: {
            major: major.name, majorCode: major.code, school: major.school,
            course: sel.name, courseCode: sel.code, courseSection: sel.section,
          },
          history: prev.slice(-8),
        }),
      });

      if (!res.ok || !res.body) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "The tutor is unavailable. Please try again.");
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        if (!pendingFrame) pendingFrame = requestAnimationFrame(() => {
          pendingFrame = 0;
          setStreamingContent(fullText);
        });
      }
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      setStreamingContent(fullText);

      const aiMsg = createChatMessage("ai", fullText || "Something went wrong. Please try again.");
      if (studyMode === "audio" && speechPreferences.autoplay && fullText) {
        speakText(fullText, speechPreferences, aiMsg.id);
      }
      setNewMsgId(aiMsg.id); setTimeout(() => setNewMsgId(null), 700);
      setWorkspace(cur => appendMessagesToConversation(cur, wc.conversationId, [aiMsg]));
    } catch (error) {
      if (controller.signal.aborted) return;
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      const errMsg = createChatMessage("ai", error instanceof Error ? error.message : "Needs internet. Please reconnect to ask the tutor.");
      setWorkspace(cur => appendMessagesToConversation(cur, wc.conversationId, [errMsg]));
    } finally {
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      setStreamingContent("");
      setOrbitsLeaving(true); setTimeout(() => { setOrbitsLeaving(false); }, 350);
      setLoading(false);
    }
  };

  /* ── file upload ─────────────────────────────────────────────── */
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-upload of same file

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsExtractingPDF(true);
      try {
        const text = await extractPDFText(file);
        setUploadDraft({ text, fileName: file.name });
        addToast(`PDF loaded — ${Math.round(text.length / 1000)}k chars extracted`);
      } catch {
        addToast("Couldn't read PDF. Try copy-pasting your notes instead.", "error");
      } finally {
        setIsExtractingPDF(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        setUploadDraft({ text, fileName: file.name });
        addToast(`File loaded — ${Math.round(text.length / 1000)}k chars`);
      };
      reader.readAsText(file);
    }
  };

  const clearUpload = () => { setUploadDraft({ text: "", fileName: "" }); setShowUpload(false); };

  const inputProps = {
    input, loading: loading || isExtractingPDF,
    courseCode: sel?.code ?? "",
    uploadedFileName: uploadDraft.fileName,
    onChange: setInput,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
    },
    onSend: () => void sendMessage(),
    onUploadToggle: () => setShowUpload(v => !v),
  };

  const sidebarProps: SidebarContentProps = {
    activeConversation: aConv, conversationGroups: groups,
    editingConvId, editingTitle, selectedCourseCode: sel?.code ?? "",
    confirmDeleteId,
    setEditingConvId, setEditingTitle, setConfirmDeleteId,
    onBeginRename: beginRename, onRemoveConversation: removeConv,
    onSelectConversation: selectConv, onStartNewChat: startNewChat, onSubmitRename: submitRename,
  };

  if (!hydrated) return <div ref={containerRef} style={{ height: fixedHeight }} />;
  if (courses.length === 0 || !sel) return <div className="py-20 text-center text-[var(--app-muted)]">Add courses to use the AI Tutor.</div>;

  const hasMessages = msgs.length > 0 || loading || orbitsLeaving;

  return (
    <div ref={containerRef} className="flex overflow-hidden" style={{ height: fixedHeight }}>
      <ToastContainer toasts={toasts} />

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col shrink-0 overflow-hidden border-r border-[var(--app-border)]"
        style={{ width: sidebarCollapsed ? 0 : 260, transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)", background: "var(--app-surface)", minWidth: 0 }}>
        <div style={{ width: 260, minWidth: 260, height: "100%", display: "flex", flexDirection: "column" }}>
          <SidebarContent {...sidebarProps} />
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ────────────────────────────── */}
      <div className="fixed inset-0 z-40 lg:hidden"
        style={{ background: "rgba(0,0,0,.45)", opacity: mobileSidebar ? 1 : 0, pointerEvents: mobileSidebar ? "auto" : "none", transition: "opacity .28s ease" }}
        onClick={() => setMobileSidebar(false)} />
      <div className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[var(--app-border)] lg:hidden"
        style={{ width: 260, background: "var(--app-surface)", transform: mobileSidebar ? "translateX(0)" : "translateX(-100%)", transition: mobileSidebar ? "transform .38s cubic-bezier(.34,1.56,.64,1)" : "transform .25s ease-in" }}>
        <SidebarContent {...sidebarProps} onClose={() => setMobileSidebar(false)} />
      </div>

      {/* ── Main area ────────────────────────────────────────────── */}
      <main className="flex flex-1 min-w-0 flex-col" style={{ background: "var(--app-bg)" }}>

        {/* top bar */}
        <div className="shrink-0 flex items-center gap-3 px-3 py-2">
          <button type="button" onClick={() => setSidebarCollapsed(v => !v)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
            title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}>
            {sidebarCollapsed ? <SidebarOpenIcon /> : <SidebarCloseIcon />}
          </button>
          <button type="button" onClick={() => setMobileSidebar(true)}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]">
            <SidebarOpenIcon />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm font-bold" style={{ color: sel.color }}>{sel.code}</span>
            <span className="hidden sm:block truncate text-sm text-[var(--app-muted)]">{sel.name}</span>
          </div>
          {uploadDraft.fileName && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
              style={{ background: "rgba(255,107,53,.1)", color: "#FF6B35", border: "1px solid rgba(255,107,53,.2)" }}>
              <PaperclipIcon />
              {uploadDraft.fileName}
              <button onClick={clearUpload} className="ml-1 hover:opacity-70">×</button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 px-3 pb-2"><SpeechToolbar preferences={speechPreferences} onChange={setSpeechPreferences} /></div>

        {!hasMessages ? (
          /* ── empty state ───────────────────────────────────── */
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-6">
            <div className="w-full max-w-2xl flex flex-col items-center gap-8">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#F7931E)", boxShadow: "0 4px 24px rgba(255,107,53,.32)" }}>
                  <StarburstLogo size={24} white />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[var(--app-text)]">Where should we start?</h2>
                <p className="mt-2.5 text-sm text-[var(--app-muted)]">
                  Studying{" "}<span className="font-mono font-semibold" style={{ color: "#FF6B35" }}>{sel.code}</span>{" · "}{sel.name}
                </p>
              </div>
              <div className="w-full space-y-3">
                {showUpload && (
                  <UploadPanel
                    uploadedFileName={uploadDraft.fileName}
                    uploadedText={uploadDraft.text}
                    onFileChange={handleFile}
                    onPasteChange={t => setUploadDraft(prev => ({ ...prev, text: t, fileName: prev.fileName || "pasted notes" }))}
                    onClear={clearUpload}
                    onClose={() => setShowUpload(false)}
                  />
                )}
                {isExtractingPDF && <p className="text-center text-xs text-[var(--app-muted)]">Extracting PDF text…</p>}
                <InputPill {...inputProps} />
                {/* ← FIXED: no longer says "Raghed can make mistakes" */}
                <p className="text-center text-[11px] text-[var(--app-muted)]">AI can make mistakes. Always verify important information.</p>
              </div>
            </div>
          </div>
        ) : (
          /* ── chat area ────────────────────────────────────── */
          <>
            <div className="relative flex-1 min-h-0">
            <div ref={chatScrollRef} onScroll={handleChatScroll} className="h-full overflow-y-auto" style={{ overflowAnchor: "none" }}>
              <div className="py-4">
                {msgs.map(msg =>
                  msg.role === "user"
                    ? <MemoUserMessage key={msg.id} msg={msg} isNew={msg.id === newMsgId} />
                    : <MemoAIMessage key={msg.id} msg={msg} isNew={msg.id === newMsgId} onListen={listenToReply} />
                )}
                {/* streaming content replaces the loader once first chunk arrives */}
                {loading && streamingContent && (
                  <MemoStreamingAIMessage content={streamingContent} />
                )}
                {loading && !streamingContent && <OrbitalLoader leaving={false} />}
                {orbitsLeaving && !loading && <OrbitalLoader leaving={true} />}
              </div>
            </div>

            {showJump && <button type="button" onClick={jumpToLatest} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-xs font-semibold shadow-lg">Jump to latest ↓</button>}
            </div>

            <div className="shrink-0 border-t border-[var(--app-border)] px-4 py-4" style={{ background: "var(--app-bg)" }}>
              {showUpload && (
                <UploadPanel
                  uploadedFileName={uploadDraft.fileName}
                  uploadedText={uploadDraft.text}
                  onFileChange={handleFile}
                  onPasteChange={t => setUploadDraft(prev => ({ ...prev, text: t, fileName: prev.fileName || "pasted notes" }))}
                  onClear={clearUpload}
                  onClose={() => setShowUpload(false)}
                />
              )}
              {isExtractingPDF && <p className="text-xs text-[var(--app-muted)] mb-2 text-center">Extracting PDF…</p>}
              <div className="mx-auto max-w-3xl space-y-2">
                <InputPill {...inputProps} />
                <p className="text-center text-[11px] text-[var(--app-muted)]">AI can make mistakes. Always verify important information.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
