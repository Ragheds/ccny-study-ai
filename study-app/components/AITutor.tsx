"use client";

import { streamTutor } from "@/lib/tutorClient";
import { SidebarOpenIcon, SidebarCloseIcon, ToastContainer, OrbitalLoader, InputPill, UploadPanel, SidebarContent, PaperclipIcon, type SidebarContentProps, type Toast } from "@/components/tutor/TutorChrome";
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
import { useAutoNotes } from "@/hooks/useAutoNotes";
import { SpeechToolbar } from "@/components/SpeechToolbar";
import { DEFAULT_SPEECH_PREFERENCES, speakText, stopSpeech, type SpeechPreferences } from "@/lib/speech";
import { StarburstLogo } from "@/components/StarburstLogo";
import { MemoAIMessage, MemoUserMessage, MemoStreamingAIMessage } from "@/components/TutorMessages";

/* ── constants ──────────────────────────────────────────────────── */
const EMPTY_MESSAGES: ChatMessage[] = [];

type AITutorProps = {
  major: SavedMajor;
  courses: SavedCourse[];
  activeCourseCode?: string | null;
};
/* ── PDF extraction via CDN pdf.js ──────────────────────────────── */
async function extractPDFText(file: File): Promise<string> {
  if (!navigator.onLine) throw new Error("PDF extraction needs internet. Paste text instead.");
  if (file.size > 5000000) throw new Error("PDF limit is 5 MB.");
  const form = new FormData(); form.set("file", file);
  const response = await fetch("/api/material/text", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not read PDF.");
  return data.text;

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
  const captureNote = useAutoNotes(sel?.code ?? "");
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

    try {
      const fullText = await streamTutor({
        message: uploadDraft.text ? `Based on:\n\n${uploadDraft.text}\n\n${text}` : text,
        action: "general", studyMode,
        context: { major: major.name, majorCode: major.code, school: major.school, course: sel.name, courseCode: sel.code, courseSection: sel.section },
        history: prev.slice(-8),
      }, controller.signal, setStreamingContent);

      const aiMsg = createChatMessage("ai", fullText || "Something went wrong. Please try again.");
      if (studyMode === "audio" && speechPreferences.autoplay && fullText) {
        speakText(fullText, speechPreferences, aiMsg.id);
      }
      if(fullText) captureNote(aiMsg.id,fullText);
      setNewMsgId(aiMsg.id); setTimeout(() => setNewMsgId(null), 700);
      setWorkspace(cur => appendMessagesToConversation(cur, wc.conversationId, [aiMsg]));
    } catch (error) {
      if (controller.signal.aborted) return;
      const errMsg = createChatMessage("ai", error instanceof Error ? error.message : "Needs internet. Please reconnect to ask the tutor.");
      setWorkspace(cur => appendMessagesToConversation(cur, wc.conversationId, [errMsg]));
    } finally {
      setStreamingContent("");
      setOrbitsLeaving(true); setTimeout(() => { setOrbitsLeaving(false); }, 350);
      setLoading(false);
    }
  };

  /* ── file upload ─────────────────────────────────────────────── */
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 5000000) { addToast("File limit is 5 MB.", "error"); return; } // allow re-upload of same file

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsExtractingPDF(true);
      try {
        const text = await extractPDFText(file);
        setUploadDraft({ text, fileName: file.name });
        addToast(`PDF loaded — ${Math.round(text.length / 1000)}k chars extracted`);
      } catch (error) {
        addToast(error instanceof Error ? error.message : "Could not read PDF. Paste text instead.", "error");
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
