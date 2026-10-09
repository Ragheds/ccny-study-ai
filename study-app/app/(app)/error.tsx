"use client";
import { useEffect } from "react";
import { trackEvent } from "@/lib/telemetry";
export default function StudyErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    trackEvent("client_error");
  }, []);
  return (
    <section className="space-y-4 p-6" role="alert">
      <h1 className="text-xl font-semibold">This workspace couldn’t load.</h1>
      <p>
        Your saved work stays on this device. Retry, or open your downloaded
        packs.
      </p>
      <button onClick={reset} className="rounded-xl border p-3">
        Try again
      </button>
      <a href="/offline" className="block underline">
        Open downloaded packs
      </a>
    </section>
  );
}
