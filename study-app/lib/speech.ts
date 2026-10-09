// Browser speech adapter. UI code uses this interface so a server voice can replace it later.
export type SpeechPreferences = { voiceURI: string; rate: number; autoplay: boolean };
export const DEFAULT_SPEECH_PREFERENCES: SpeechPreferences = { voiceURI: "", rate: 1, autoplay: false };
export type SpeechState = { status: "idle" | "playing" | "paused"; replyId: string | null };
const IDLE: SpeechState = { status: "idle", replyId: null };
let state = IDLE;
let generation = 0;
let activeUtterance: SpeechSynthesisUtterance | null = null;
const listeners = new Set<() => void>();
const NOVELTY = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph)\b/i;
const PREFERRED = ["Premium", "Enhanced", "Natural", "Neural", "Google US English", "Samantha", "Ava", "Allison", "Daniel"];

export function rankEnglishVoices<T extends { name: string; lang: string; voiceURI: string }>(voices: T[]): T[] {
  const score = (voice: T) => PREFERRED.reduce((total, name, index) => total + (voice.name.toLowerCase().includes(name.toLowerCase()) ? 100 - index * 5 : 0), 0) + (/^en[-_]US$/i.test(voice.lang) ? 10 : 0);
  return voices.filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang) && !NOVELTY.test(voice.name))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name) || a.voiceURI.localeCompare(b.voiceURI));
}

export function speechSupported() { return typeof window !== "undefined" && "speechSynthesis" in window; }
export function getEnglishVoices(): SpeechSynthesisVoice[] { return speechSupported() ? rankEnglishVoices(window.speechSynthesis.getVoices()) : []; }
export function subscribeVoices(change: () => void) {
  if (!speechSupported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", change);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", change);
}

export function textForSpeech(markdown: string): string {
  return markdown
    .replace(/^```[a-zA-Z0-9_-]*\s*$/gm, "").replace(/```/g, "")
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,}|\|?[\s:|-]+\|)\s*$/gm, "")
    .replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^\s*(?:#{1,6}\s+|[-*+•]\s+|\d+[.)]\s+|>\s*)/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(?<!\w)\*(?=\S)([^*\n]*\S)\*/g, "$1")
    .replace(/[`_#$]/g, "")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 divided by $2")
    .replace(/\\sqrt\{([^}]+)\}/g, "square root of $1")
    .replace(/\\(?:times|cdot)/g, " times ").replace(/\\div/g, " divided by ")
    .replace(/\\(?:leq|le)/g, " less than or equal to ").replace(/\\(?:geq|ge)/g, " greater than or equal to ")
    .replace(/\\pi\b/g, "pi").replace(/\\theta\b/g, "theta")
    .replace(/\^\{?2\}?(?![\w.])/g, " squared ").replace(/\^\{?3\}?(?![\w.])/g, " cubed ")
    .replace(/\^\{?([\w.-]+)\}?/g, " to the power of $1 ")
    .replace(/²/g, " squared ").replace(/³/g, " cubed ")
    .replace(/√/g, " square root of ").replace(/π/g, " pi ").replace(/θ/g, " theta ")
    .replace(/≤/g, " less than or equal to ").replace(/≥/g, " greater than or equal to ")
    .replace(/≠/g, " not equal to ").replace(/≈/g, " approximately equals ")
    .replace(/±/g, " plus or minus ").replace(/∞/g, " infinity ")
    .replace(/=/g, " equals ").replace(/</g, " less than ").replace(/>/g, " greater than ")
    .replace(/[×*]/g, " times ").replace(/[÷/]/g, " divided by ")
    .replace(/\+/g, " plus ").replace(/−/g, " minus ")
    .replace(/\b([a-zA-Z0-9])-(?=[a-zA-Z0-9]\b)/g, "$1 minus ")
    .replace(/(^|\s)-(?=\s|\d|\()/g, "$1 minus ")
    .replace(/%/g, " percent ").replace(/\|/g, ", ")
    .replace(/[{}\\]/g, " ").replace(/\s+/g, " ").trim();
}

export function speechSentences(text: string): string[] {
  const plain = textForSpeech(text);
  if (!plain) return [];
  return Array.from(new Intl.Segmenter("en", { granularity: "sentence" }).segment(plain), (item) => item.segment.trim()).filter(Boolean);
}

function publish(next: SpeechState) { state = next; listeners.forEach((change) => change()); }
export function getSpeechState() { return state; }
export function getServerSpeechState() { return IDLE; }
export function subscribeSpeech(change: () => void) { listeners.add(change); return () => { listeners.delete(change); }; }
export function stopSpeech() {
  generation++;
  if (speechSupported()) window.speechSynthesis.cancel();
  activeUtterance = null;
  publish(IDLE);
}
export function pauseSpeech() {
  if (speechSupported() && state.status === "playing") { window.speechSynthesis.pause(); publish({ ...state, status: "paused" }); }
}
export function resumeSpeech() {
  if (speechSupported() && state.status === "paused") { window.speechSynthesis.resume(); publish({ ...state, status: "playing" }); }
}
export function speakText(text: string, preferences: SpeechPreferences = DEFAULT_SPEECH_PREFERENCES, replyId: string | null = null, onComplete?: () => void) {
  stopSpeech();
  if (!speechSupported()) return;
  const sentences = speechSentences(text);
  if (!sentences.length) return;
  const token = generation;
  const voices = getEnglishVoices();
  const voice = voices.find((item) => item.voiceURI === preferences.voiceURI) ?? voices[0] ?? null;
  let index = 0;
  publish({ status: "playing", replyId });
  function next() {
    if (token !== generation) return;
    if (index >= sentences.length) { activeUtterance = null; publish(IDLE); onComplete?.(); return; }
    const utterance = new SpeechSynthesisUtterance(sentences[index++]);
    utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-US";
    utterance.rate = Math.min(1.3, Math.max(0.75, preferences.rate || 1));
    utterance.onend = next;
    utterance.onerror = () => { if (token === generation) stopSpeech(); };
    activeUtterance = utterance;
    window.speechSynthesis.speak(activeUtterance);
  }
  next();
}

// Optional quiz voice input is also isolated behind the browser adapter.
export function listenForChoice(onChoice: (letter: string) => void, onStatus: (message: string) => void): { stop: () => void } | null {
  type Recognition = { lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };
  const voiceWindow = window as typeof window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Constructor = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
  if (!Constructor) { onStatus("Voice answers are unavailable in this browser. Tap an answer instead."); return null; }
  stopSpeech();
  const recognition = new Constructor();
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    const heard = event.results[0]?.[0]?.transcript.trim().toLowerCase().replace(/[.!,]/g, "") ?? "";
    const words: Record<string, string> = { a: "A", ay: "A", b: "B", bee: "B", c: "C", see: "C", d: "D", dee: "D" };
    if (words[heard]) onChoice(words[heard]);
    else onStatus(`Heard “${heard}”. Say A, B, C, or D, or tap an answer.`);
  };
  recognition.onerror = () => onStatus("Voice input stopped. Tap an answer or try again.");
  try { recognition.start(); onStatus("Listening for A, B, C, or D…"); return recognition; }
  catch { onStatus("Voice input couldn't start. Tap an answer instead."); return null; }
}
