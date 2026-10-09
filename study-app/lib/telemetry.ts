import { KEYS, loadFromStorage } from "@/lib/storage";
export type StudyEvent = "session" | "pack_download" | "client_error";
export async function trackEvent(event: StudyEvent) {
  if (!loadFromStorage(KEYS.ANALYTICS_CONSENT, false) || !navigator.onLine)
    return;
  const key = `study-event:${event}:${new Date().toISOString().slice(0, 13)}`;
  if (sessionStorage.getItem(key)) return;
  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });
    if (response.ok) sessionStorage.setItem(key, "1");
  } catch {
    /* counters never block studying */
  }
}
