"use client";
import { useState } from "react";
import { downloadPack } from "@/lib/offline/db";
export function MaterialUpload({ courseCode }: { courseCode: string }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function create() {
    setBusy(true);
    try {
      if (!navigator.onLine)
        throw Error(
          "Needs internet to build a pack; downloaded packs work offline.",
        );
      const form = new FormData();
      form.set("courseCode", courseCode);
      form.set("text", text);
      if (file) form.set("file", file);
      const response = await fetch("/api/packs/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      await downloadPack(data.pack);
      setStatus(
        "Private source pack downloaded. Open packs to study it offline.",
      );
      setText("");
      setFile(null);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Upload failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border p-3">
      <summary>Make a pack from class material</summary>
      <p className="my-2 text-sm">
        Private to your account. PDF text only, up to 5 MB. Shorter excerpts
        give better results.
      </p>
      <label className="block">
        Lecture PDF
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full"
        />
      </label>
      <label className="block">
        Or paste text
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={12000}
          className="block min-h-24 w-full rounded-lg border p-2"
        />
      </label>
      <button
        disabled={busy || (!text.trim() && !file)}
        onClick={create}
        className="mt-2 rounded-lg border p-2"
      >
        {busy ? "Preparing source pack…" : "Create private pack"}
      </button>
      <p role="status">{status}</p>
    </details>
  );
}
