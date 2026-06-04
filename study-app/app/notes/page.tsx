"use client";

import { useState } from "react";

export default function NotesPage() {
  const [notes, setNotes] = useState("");
  const [submittedNotes, setSubmittedNotes] = useState("");

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
        onClick={() => setSubmittedNotes(notes)}
      >
        Summarize Notes
      </button>

      {submittedNotes && (
        <div className="mt-8 border rounded-xl p-4">
          <h2 className="font-bold mb-2">
            Submitted Notes
          </h2>

          <p>{submittedNotes}</p>
        </div>
      )}
    </main>
  );
}