"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
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

const EMPTY_MESSAGES: ChatMessage[] = [];

const ACTIONS = [
  { id: "studyguide", label: "Study Guide", description: "Generate a structured review" },
  { id: "quiz", label: "Quiz Me", description: "Create 5 practice questions" },
  { id: "flashcards", label: "Flashcards", description: "Build terms and definitions" },
  { id: "explain", label: "Ask a Question", description: "Get a focused explanation" },
];

type AITutorProps = {
  major: SavedMajor;
  courses: SavedCourse[];
  activeCourseCode?: string | null;
  onActiveCourseChange?: (courseCode: string) => void;
};

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPromptForAction(actionId: string, course: SavedCourse): string {
  const prompts: Record<string, string> = {
    studyguide: `Generate a study guide for ${course.name} (${course.code})`,
    quiz: `Generate a 5-question quiz for ${course.name} (${course.code})`,
    flashcards: `Generate flashcards for ${course.name} (${course.code})`,
  };

  return prompts[actionId] ?? "";
}

export function AITutor({
  major,
  courses,
  activeCourseCode,
  onActiveCourseChange,
}: AITutorProps) {
  const hydrated = useHydrated();
  const [workspace, setWorkspace] = useStoredValue(KEYS.CHAT_WORKSPACE, EMPTY_CHAT_WORKSPACE);
  const [legacyMessages] = useStoredValue(KEYS.CHAT_HISTORY, EMPTY_MESSAGES);
  const [selectedCourseCode, setSelectedCourseCode] = useState(() => {
    const requestedCourse = courses.find((course) => course.code === activeCourseCode);
    return requestedCourse?.code ?? courses[0]?.code ?? "";
  });
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedText, setUploadedText] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedCourse =
    courses.find((course) => course.code === selectedCourseCode) ?? courses[0] ?? null;
  const courseConversations = selectedCourse
    ? getCourseConversations(workspace, selectedCourse.code)
    : [];
  const activeConversationId = selectedCourse
    ? workspace.activeByCourse[selectedCourse.code]
    : undefined;
  const activeConversation = activeConversationId
    ? workspace.conversationsById[activeConversationId]
    : undefined;
  const messages = activeConversation?.messages ?? EMPTY_MESSAGES;
  const conversationGroups = groupConversationsByDate(courseConversations);

  useEffect(() => {
    if (!hydrated) return;
    const migrated = migrateLegacyChatHistory(workspace, legacyMessages, courses, major);
    if (migrated !== workspace) setWorkspace(migrated);
  }, [courses, hydrated, legacyMessages, major, setWorkspace, workspace]);

  useEffect(() => {
    if (!hydrated || !selectedCourse) return;
    const closed = closeInactiveConversation(workspace, selectedCourse.code);
    if (closed !== workspace) setWorkspace(closed);
  }, [hydrated, selectedCourse, setWorkspace, workspace]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chooseCourse = (course: SavedCourse) => {
    setSelectedCourseCode(course.code);
    setActiveAction(null);
    setInput("");
    onActiveCourseChange?.(course.code);
  };

  const startNewChat = () => {
    if (!selectedCourse) return;
    const conversation = createConversation(selectedCourse, major);
    setWorkspace((current) => addConversation(current, conversation));
    setActiveAction(null);
    setInput("");
  };

  const selectConversation = (conversationId: string) => {
    setWorkspace((current) => touchConversation(current, conversationId));
    setActiveAction(null);
    setInput("");
  };

  const beginRename = (conversation: ChatConversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const submitRename = () => {
    if (!editingConversationId) return;
    setWorkspace((current) => renameConversation(current, editingConversationId, editingTitle));
    setEditingConversationId(null);
    setEditingTitle("");
  };

  const removeConversation = (conversation: ChatConversation) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${conversation.title}"? Messages in this chat will be removed.`)
    ) {
      return;
    }

    setWorkspace((current) => deleteConversation(current, conversation.id));

    if (editingConversationId === conversation.id) {
      setEditingConversationId(null);
      setEditingTitle("");
    }
  };

  const sendMessage = async (overrideMessage?: string, action?: string) => {
    if (!selectedCourse || loading) return;

    const message = (overrideMessage ?? input).trim();
    if (!message) return;

    const withConversation = ensureConversationForMessage(
      workspace,
      selectedCourse,
      major,
      message
    );

    const previousMessages =
      withConversation.workspace.conversationsById[withConversation.conversationId]?.messages ??
      EMPTY_MESSAGES;

    const userMessage = createChatMessage("user", message, action);
    const workspaceWithUser = appendMessagesToConversation(
      withConversation.workspace,
      withConversation.conversationId,
      [userMessage]
    );

    setWorkspace(workspaceWithUser);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: uploadedText
            ? `Based on these materials:\n\n${uploadedText}\n\n${message}`
            : message,
          action: action ?? "general",
          context: {
            major: major.name,
            majorCode: major.code,
            school: major.school,
            course: selectedCourse.name,
            courseCode: selectedCourse.code,
            courseSection: selectedCourse.section,
          },
          history: previousMessages.slice(-8),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to get a response.");
      }

      const aiMessage = createChatMessage(
        "ai",
        data.response || "Something went wrong."
      );

      setWorkspace((current) =>
        appendMessagesToConversation(current, withConversation.conversationId, [aiMessage])
      );
    } catch {
      const errorMessage = createChatMessage(
        "ai",
        "Failed to get a response. Please try again."
      );

      setWorkspace((current) =>
        appendMessagesToConversation(current, withConversation.conversationId, [errorMessage])
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (actionId: string) => {
    setActiveAction(actionId);
    if (!selectedCourse || actionId === "explain") return;
    void sendMessage(getPromptForAction(actionId, selectedCourse), actionId);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      setUploadedText(readerEvent.target?.result as string);
      setShowUpload(false);
    };
    reader.readAsText(file);
  };

  if (!hydrated) {
    return <div className="min-h-[360px]" />;
  }

  if (courses.length === 0 || !selectedCourse) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Add courses first to use the AI Tutor.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Studying for</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-300">
                {selectedCourse.code}
              </span>
              <span className="text-white font-semibold">{selectedCourse.name}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {major.name} · {selectedCourse.section}
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-2xl">
            {courses.map((course) => (
              <button
                key={course.code}
                onClick={() => chooseCourse(course)}
                className={`shrink-0 px-3 py-2 rounded-xl border text-left transition ${
                  selectedCourse.code === course.code
                    ? "border-white bg-white text-black"
                    : "border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                }`}
              >
                <span
                  className="block font-mono text-xs font-bold"
                  style={{
                    color: selectedCourse.code === course.code ? "black" : course.color,
                  }}
                >
                  {course.code}
                </span>
                <span className="block max-w-44 truncate text-xs">{course.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/10 bg-zinc-950/80 p-3 lg:min-h-[650px]">
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Chats</p>
              <p className="text-xs text-gray-400 font-mono mt-1">{selectedCourse.code}</p>
            </div>

            <button
              onClick={startNewChat}
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-gray-100"
            >
              New chat
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {conversationGroups.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-500">
                No conversations for this course yet.
              </div>
            )}

            {conversationGroups.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-600">
                  {group.label}
                </p>

                <div className="space-y-1">
                  {group.conversations.map((conversation) => {
                    const isActive = conversation.id === activeConversation?.id;
                    const isEditing = conversation.id === editingConversationId;

                    return (
                      <div
                        key={conversation.id}
                        className={`rounded-xl border p-2 transition ${
                          isActive
                            ? "border-white/20 bg-white/10"
                            : "border-transparent hover:bg-white/5"
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") submitRename();
                                if (event.key === "Escape") setEditingConversationId(null);
                              }}
                              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black px-2 py-1 text-xs text-white outline-none"
                              autoFocus
                            />

                            <button
                              onClick={submitRename}
                              className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-black"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => selectConversation(conversation.id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="block truncate text-sm font-medium text-gray-200">
                                {conversation.title}
                              </span>
                              <span className="block text-[11px] text-gray-600">
                                {conversation.messages.length} message
                                {conversation.messages.length !== 1 ? "s" : ""}
                              </span>
                            </button>

                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => beginRename(conversation)}
                                className="rounded-md px-1.5 py-1 text-[11px] text-gray-500 hover:bg-white/10 hover:text-white"
                              >
                                Rename
                              </button>

                              <button
                                onClick={() => removeConversation(conversation)}
                                className="rounded-md px-1.5 py-1 text-[11px] text-gray-500 hover:bg-red-500/10 hover:text-red-300"
                              >
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
        </aside>

        <section className="min-w-0">
          <div className="mb-6">
            <button
              onClick={() => setShowUpload((value) => !value)}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 transition hover:border-white/30 hover:text-white"
            >
              {uploadedText ? "Material uploaded - change" : "Upload lecture notes or material"}
            </button>

            {showUpload && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-sm text-gray-400">
                  Upload a .txt file or paste course material below.
                </p>

                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="mb-3 block text-sm text-gray-400"
                />

                <textarea
                  placeholder="Or paste your lecture notes here..."
                  value={uploadedText}
                  onChange={(event) => setUploadedText(event.target.value)}
                  className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-gray-600"
                />

                <button
                  onClick={() => setShowUpload(false)}
                  className="mt-2 text-xs text-gray-500 transition hover:text-white"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                disabled={loading}
                className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  activeAction === action.id
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <p className="mb-1 text-sm font-semibold">{action.label}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </button>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Conversation</p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {activeConversation?.title ?? "Start a course chat"}
              </h2>
            </div>

            {!activeConversation && courseConversations.length > 0 && (
              <p className="text-right text-xs text-gray-500">
                Pick a previous chat or start a new one.
              </p>
            )}
          </div>

          <div className="mb-6 min-h-[300px] space-y-4">
            {messages.length === 0 && !loading && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-400">
                Ask about {selectedCourse.code}, generate a study guide, or continue one of
                this course&apos;s saved conversations.
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-gray-200"
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                  <p className="mt-2 text-xs opacity-40">
                    {formatMessageTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {(activeAction === "explain" || activeAction === null) && (
            <div className="flex gap-3">
              <input
                placeholder={`Ask anything about ${selectedCourse.code}...`}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-white/25"
              />

              <button
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}