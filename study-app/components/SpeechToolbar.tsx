"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getEnglishVoices, getServerSpeechState, getSpeechState, pauseSpeech, resumeSpeech, speechSupported, stopSpeech, subscribeSpeech, subscribeVoices, type SpeechPreferences } from "@/lib/speech";

export function SpeechToolbar({ preferences, onChange }: { preferences: SpeechPreferences; onChange: (next: SpeechPreferences) => void }) {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechState, getServerSpeechState);
  useEffect(() => {
    const refresh = () => setVoices(getEnglishVoices());
    refresh();
    return subscribeVoices(refresh);
  }, []);
  return <div className="relative ml-auto flex shrink-0 items-center gap-1 text-xs">
    {speech.status !== "idle" && <>
      <button type="button" onClick={speech.status === "paused" ? resumeSpeech : pauseSpeech} className="rounded-lg border border-[var(--app-border)] px-3 py-2">{speech.status === "paused" ? "Resume" : "Pause"}</button>
      <button type="button" onClick={stopSpeech} className="rounded-lg border border-[var(--app-border)] px-3 py-2">Stop</button>
    </>}
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-lg border border-[var(--app-border)] px-3 py-2">Voice settings</button>
    {open && <div className="absolute right-0 top-full z-30 mt-2 w-64 space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xl">
      {!speechSupported() && <p role="status">Speech playback is unavailable in this browser.</p>}
      <label className="block">Voice
        <select value={voices.some((voice) => voice.voiceURI === preferences.voiceURI) ? preferences.voiceURI : ""} onChange={(event) => onChange({ ...preferences, voiceURI: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2">
          <option value="">Recommended voice</option>
          {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
        </select>
      </label>
      <label className="block">Speed
        <select value={preferences.rate} onChange={(event) => onChange({ ...preferences, rate: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2">
          {[0.8, 0.9, 1, 1.1, 1.2, 1.3].map((rate) => <option key={rate} value={rate}>{rate.toFixed(1)}x</option>)}
        </select>
      </label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={preferences.autoplay} onChange={(event) => onChange({ ...preferences, autoplay: event.target.checked })} />Auto-play in Audio mode</label>
      <p className="text-[11px] text-[var(--app-muted)]">Changes apply the next time you listen.</p>
    </div>}
  </div>;
}
