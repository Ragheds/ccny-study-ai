"use client";

import { useState, useEffect, useRef } from "react";
import { saveToStorage, loadFromStorage, KEYS } from "@/lib/storage";

type Course = { code: string; name: string; section: string; color: string };
type Major = { code: string; name: string; school: string };

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: number;
  action?: string;
};

const ACTIONS = [
  { id: "studyguide", label: "📝 Study Guide", description: "Get a full summary" },
  { id: "quiz", label: "❓ Quiz Me", description: "5 practice questions" },
  { id: "flashcards", label: "🎴 Flashcards", description: "Key concepts to review" },
  { id: "explain", label: "💬 Ask a Question", description: "Get a specific answer" },
];

export function AITutor({ major, courses }: { major: Major; courses: Course[] }) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(
    courses.length > 0 ? courses[0] : null
  );
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedText, setUploadedText] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage<Message[]>(KEYS.CHAT_HISTORY, []);
    if (saved.length > 0) setMessages(saved);
  }, []);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveToStorage(KEYS.CHAT_HISTORY, messages);
    }
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearHistory = () => {
    setMessages([]);
    saveToStorage(KEYS.CHAT_HISTORY, []);
  };

  const sendMessage = async (overrideMessage?: string, action?: string) => {
    if (!selectedCourse) return;
    const message = overrideMessage || input.trim();
    if (!message) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: Date.now(),
      action,
    };

    setMessages((prev) => [...prev, userMessage]);
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
          major: major.name,
          majorCode: major.code,
          school: major.school,
          course: selectedCourse.name,
          courseCode: selectedCourse.code,
          action: action || "general",
        }),
      });

      const data = await res.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.response || "Something went wrong.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: "Failed to get a response. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (actionId: string) => {
    setActiveAction(actionId);
    if (actionId === "explain") return;
    const prompts: Record<string, string> = {
      studyguide: `Generate a study guide for ${selectedCourse?.name} (${selectedCourse?.code})`,
      quiz: `Generate a 5-question quiz for ${selectedCourse?.name} (${selectedCourse?.code})`,
      flashcards: `Generate flashcards for ${selectedCourse?.name} (${selectedCourse?.code})`,
    };
    sendMessage(prompts[actionId], actionId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedText(ev.target?.result as string);
      setShowUpload(false);
    };
    reader.readAsText(file);
  };

  if (courses.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Add courses first to use the AI Tutor.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Course selector */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Studying for</p>
        <div className="flex gap-2 flex-wrap">
          {courses.map((course) => (
            <button
              key={course.code}
              onClick={() => {
                setSelectedCourse(course);
                setActiveAction(null);
              }}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                selectedCourse?.code === course.code
                  ? "border-white bg-white text-black"
                  : "border-white/10 text-gray-400 hover:text-white hover:border-white/30"
              }`}
            >
              <span
                className="font-mono text-xs mr-2"
                style={{
                  color: selectedCourse?.code === course.code ? "black" : course.color,
                }}
              >
                {course.code}
              </span>
              {course.name}
            </button>
          ))}
        </div>
      </div>

      {/* Upload material */}
      <div className="mb-6">
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition border border-white/10 hover:border-white/30 px-4 py-2 rounded-xl"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {uploadedText ? "✓ Material uploaded — change" : "Upload lecture notes or material"}
        </button>
        {showUpload && (
          <div className="mt-3 p-4 border border-white/10 rounded-2xl bg-white/3">
            <p className="text-sm text-gray-400 mb-3">Upload a .txt file or paste notes below:</p>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="text-sm text-gray-400 mb-3 block"
            />
            <textarea
              placeholder="Or paste your lecture notes here..."
              value={uploadedText}
              onChange={(e) => setUploadedText(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 outline-none resize-none h-32"
            />
            <button onClick={() => setShowUpload(false)} className="mt-2 text-xs text-gray-500 hover:text-white transition">
              Done
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            className={`p-4 rounded-2xl border text-left transition ${
              activeAction === action.id
                ? "border-white/40 bg-white/10"
                : "border-white/10 bg-white/3 hover:bg-white/8 hover:border-white/20"
            }`}
          >
            <p className="text-sm font-semibold mb-1">{action.label}</p>
            <p className="text-xs text-gray-500">{action.description}</p>
          </button>
        ))}
      </div>

      {/* Chat history header */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Conversation</p>
          <button
            onClick={clearHistory}
            className="text-xs text-gray-600 hover:text-red-400 transition"
          >
            Clear conversation
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-white text-black"
                  : "bg-white/5 border border-white/10 text-gray-200"
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              <p className="text-xs opacity-40 mt-2">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {(activeAction === "explain" || activeAction === null) && (
        <div className="flex gap-3">
          <input
            placeholder={`Ask anything about ${selectedCourse?.code}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-white/25 transition placeholder:text-gray-600"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-white text-black font-semibold px-5 py-3 rounded-2xl hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            Send
          </button>
        </div>
      )}

    </div>
  );
}