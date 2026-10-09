"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import { trackEvent } from "@/lib/telemetry";
export function BetaTools() {
  const [consent, setConsent] = useStoredValue(KEYS.ANALYTICS_CONSENT, false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (consent) trackEvent("session");
  }, [consent]);
  async function feedback() {
    setBusy(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setMessage(data.error ?? data.message);
      if (response.ok) setText("");
    } catch {
      setMessage("Needs internet to send feedback.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <footer className="space-y-3 border-t p-4 text-sm">
      <p>
        AI can be wrong. Check with your professor. Independent student project;
        not affiliated with CCNY or CUNY.
      </p>
      <div className="flex gap-4">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/plans">Plans / invite</Link>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        Share anonymous-looking activity counts (linked to your account; no
        study text)
      </label>
      <details>
        <summary>Send feedback</summary>
        <p>
          Tell us what broke. Do not include passwords, private class material
          or other people’s details.
        </p>
        <label>
          Feedback
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={1000}
            className="block w-full rounded-lg border p-3"
          />
        </label>
        <button
          disabled={busy || text.trim().length < 5}
          onClick={feedback}
          className="rounded-lg border p-2"
        >
          {busy ? "Sending…" : "Send feedback"}
        </button>
        <p role="status">{message}</p>
      </details>
    </footer>
  );
}
