import { trackEvent } from "@/lib/telemetry";
import { openDB } from "idb";
import type { StudyPack } from "@/lib/packs";
import { getActiveAccountId } from "@/lib/storage";
export type StudyEdit = {
  id: string;
  user_id: string;
  pack_id: string;
  kind: "notes" | "quiz" | "review";
  data: unknown;
  updated_at: string;
};
const database = () =>
  openDB("ccny-study-device-v1", 1, {
    upgrade(db) {
      db.createObjectStore("packs", { keyPath: "id" });
      db.createObjectStore("edits", { keyPath: "id" });
    },
  });
export async function devicePacks(): Promise<StudyPack[]> {
  const db = await database();
  return (await db.getAll("packs")).filter(
    (pack) => pack.user_id === getActiveAccountId(),
  );
}
export async function downloadPack(pack: StudyPack) {
  if (pack.user_id !== getActiveAccountId())
    throw new Error("Switch back to the pack's account.");
  const db = await database();
  const tx = db.transaction(["packs", "edits"], "readwrite");
  const queued = await tx.objectStore("edits").get(`${pack.id}:notes`);
  // A refresh must preserve a local edit whose sync has not succeeded.
  const next = queued?.user_id === pack.user_id && typeof queued.data === "string"
    ? { ...pack, content: { ...pack.content, notes: queued.data }, updated_at: queued.updated_at }
    : pack;
  await tx.objectStore("packs").put(next);
  await tx.done;
  trackEvent("pack_download");
  window.dispatchEvent(new Event("packs-changed"));
}
export async function removeDevicePack(id: string) {
  const db = await database();
  const pack = await db.get("packs", id);
  if (pack?.user_id === getActiveAccountId()) await db.delete("packs", id);
  window.dispatchEvent(new Event("packs-changed"));
}
export async function queueEdit(
  pack: StudyPack,
  kind: StudyEdit["kind"],
  data: unknown,
) {
  if (pack.user_id !== getActiveAccountId())
    throw new Error("Sign in to this pack's account.");
  const db = await database();
  const id = kind === "notes" ? `${pack.id}:notes` : crypto.randomUUID();
  const tx = db.transaction(["packs", "edits"], "readwrite");
  const previous = await tx.objectStore("edits").get(id);
  const updated_at = new Date(Math.max(Date.now(), (Date.parse(previous?.updated_at ?? "") || 0) + 1)).toISOString();
  if (kind === "notes")
    await tx
      .objectStore("packs")
      .put({ ...pack, content: { ...pack.content, notes: data }, updated_at });
  await tx.objectStore("edits").put({
    id,
    user_id: pack.user_id,
    pack_id: pack.id,
    kind,
    data,
    updated_at,
  });
  await tx.done;
  window.dispatchEvent(new Event("packs-changed"));
}
let syncing = false;
export async function syncEdits() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const db = await database();
    const edits: StudyEdit[] = (await db.getAll("edits")).filter(
      (edit) => edit.user_id === getActiveAccountId(),
    );
    for (const edit of edits) {
      if (edit.user_id !== getActiveAccountId()) break;
      const response = await fetch("/api/offline/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      if (response.status === 410) {
        await db.delete("edits", edit.id);
        continue;
      }
      if (!response.ok) break;
      const current = await db.get("edits", edit.id);
      if (current?.updated_at === edit.updated_at)
        await db.delete("edits", edit.id);
    }
  } finally {
    syncing = false;
  }
}
export async function pendingEdits() {
  const db = await database();
  return (await db.getAll("edits")).filter(
    (edit) => edit.user_id === getActiveAccountId(),
  ).length;
}
