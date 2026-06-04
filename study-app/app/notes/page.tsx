"use client";

import { useState } from "react";

export default function NotesPage() {
  const [notes, setNotes] = useState("");
const [summary, setSummary] = useState("");
const [loading, setLoading] = useState(false);
  return (
    <main className="min-h-screen max-w-4xl mx-auto p-8">
      <h1 className="text-5xl font-bold mb-4">
        Study Notes
      </h1>

      <p className="text-gray-600 mb-8">
        Paste your notes below and prepare them for AI analysis.
      </p>

      <textarea
        className="w-full h-64 border rounded-xl p-4"
        placeholder="Paste your notes here..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <button
        className="mt-4 bg-black text-white px-6 py-3 rounded-full"
onClick={() => {
  setLoading(true);

  setTimeout(() => {
    const words = notes.split(" ").slice(0, 25).join(" ");
    setSummary(words + "...");
    setLoading(false);
  }, 1500);
}}      >
        Summarize Notes
      </button>
{loading && (
  <div className="mt-8 border rounded-xl p-4">
    <p>Generating summary...</p>
  </div>
)}
{summary && (
            <div className="mt-8 border rounded-xl p-4">
        <h2 className="font-bold mb-2">
  AI Summary
</h2>

<p>
  This is a placeholder AI summary.
  In future versions, CCNY Study AI will
  generate real summaries using AI models.
</p>

<div className="mt-4 border-t pt-4">
  <h3 className="font-semibold mb-2">
    Original Notes
  </h3>

<p>{summary}</p>
</div>
        </div>
      )}
    </main>
  );
}