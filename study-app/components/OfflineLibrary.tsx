"use client";
import { OfflineLessons } from "@/components/whiteboard/OfflineLessons";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { StudyPack } from "@/lib/packs";
import {
  devicePacks,
  downloadPack,
  pendingEdits,
  queueEdit,
  removeDevicePack,
  syncEdits,
} from "@/lib/offline/db";
import { getActiveAccountId, STORAGE_CHANGE_EVENT } from "@/lib/storage";
import { speakText, stopSpeech } from "@/lib/speech";
export function OfflineLibrary() {
  const [account, setAccount] = useState<string | null>(null);
  const [packs, setPacks] = useState<StudyPack[]>([]);
  const [current, setCurrent] = useState<StudyPack | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const refresh = () => {
      setAccount(getActiveAccountId());
      setCurrent((old) => (old?.user_id === getActiveAccountId() ? old : null));
      devicePacks()
        .then((items) => {
          setPacks(items);
          const requested = items.find(
            (item) =>
              item.id ===
              new URLSearchParams(window.location.search).get("pack"),
          );
          if (requested) {
            setCurrent(requested);
            setNotes(requested.content.notes);
          }
        })
        .catch(() =>
          setStatus(
            "Device storage unavailable. Check browser storage settings.",
          ),
        );
      pendingEdits()
        .then(setPending)
        .catch(() => {});
    };
    refresh();
    window.addEventListener("packs-changed", refresh);
    window.addEventListener(STORAGE_CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("packs-changed", refresh);
      window.removeEventListener(STORAGE_CHANGE_EVENT, refresh);
      stopSpeech();
    };
  }, []);
  async function refreshOnline() {
    setBusy(true);
    try {
      await syncEdits();
      const response = await fetch("/api/packs");
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      for (const pack of data.packs) {
        if (pack.is_deleted) await removeDevicePack(pack.id);
        else await downloadPack(pack);
      }
      setStatus("Packs downloaded for this account.");
      setPending(await pendingEdits());
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Needs internet. Use a downloaded pack below.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveNotes() {
    if (!current) return;
    try {
      await queueEdit(current, "notes", notes);
      setCurrent({ ...current, content: { ...current.content, notes } });
      setStatus("Saved on this device; queued for sync.");
      await syncEdits();
      setPending(await pendingEdits());
    } catch {
      setStatus("Could not save. Check available device storage.");
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-5">
      <Link href="/dashboard">← Study home</Link>
      <h1 className="text-2xl font-semibold">Downloaded study packs</h1><OfflineLessons />
      <p>
        Download before you leave. AI needs internet; saved notes, cards,
        quizzes and captions work offline.
      </p>
      <button
        disabled={busy}
        onClick={refreshOnline}
        className="rounded-xl border p-3"
      >
        {busy ? "Downloading…" : "Download / sync my packs"}
      </button>
      <p role="status">
        {status} {pending ? `${pending} edits waiting to sync.` : ""}
      </p>
      {!account && (
        <p>Sign in online first to access your account’s downloads.</p>
      )}
      {!packs.length && (
        <p>
          No packs on this device. Create one from a course on Study home while
          online.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {packs.map((pack) => (
          <button
            key={pack.id}
            onClick={() => {
              setCurrent(pack);
              setNotes(pack.content.notes);
            }}
            className="rounded-xl border p-3"
          >
            {pack.course_code} · {pack.title} ·{" "}
            {Math.ceil(new Blob([JSON.stringify(pack)]).size / 1024)} KB
          </button>
        ))}
      </div>
      {current && (
        <section className="space-y-5">
          <h2 className="text-xl font-semibold">{current.title}</h2>
          <p className="whitespace-pre-wrap">{current.content.summary}</p>
          <div className="flex gap-2">
            <button
              onClick={() => speakText(current.content.summary)}
              className="rounded-lg border p-2"
            >
              Listen (device voice)
            </button>
            <button onClick={stopSpeech} className="rounded-lg border p-2">
              Stop
            </button>
          </div>
          <p>
            Offline speech depends on downloaded device voices. Captions remain
            available.
          </p>
          <label className="block">
            Pack notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={20000}
              className="block min-h-40 w-full rounded-xl border p-3"
            />
          </label>
          <button onClick={saveNotes} className="rounded-lg border p-2">
            Save notes
          </button>
          <details>
            <summary>Source excerpts</summary>
            {current.source_chunks?.map((chunk) => (
              <p key={chunk.id} className="my-3 whitespace-pre-wrap text-sm">
                {chunk.id}: {chunk.text}
              </p>
            ))}
          </details>
          <h3 id="cards">Flashcards</h3>
          {current.content.cards.map((card, index) => (
            <details key={index} className="rounded-xl border p-3">
              <summary>{card.front}</summary>
              <p>{card.back}</p>
              <button
                onClick={async () => {
                  try {
                    await queueEdit(current, "review", { card: index });
                    setStatus("Review saved for sync.");
                  } catch {
                    setStatus("Review could not save.");
                  }
                }}
              >
                Mark reviewed
              </button>
            </details>
          ))}
          <h3 id="quiz">Practice quiz</h3>
          {current.content.quiz.map((question, index) => (
            <fieldset
              key={`${current.id}:${index}`}
              className="space-y-2 rounded-xl border p-3"
            >
              <legend>{question.question}</legend>
              {question.options.map((option, answer) => (
                <button
                  key={answer}
                  onClick={async () => {
                    try {
                      await queueEdit(current, "quiz", {
                        question: index,
                        answer,
                        correct: answer === question.answer,
                      });
                      setStatus(
                        `${answer === question.answer ? "Correct" : "Try again"}. ${question.explanation}`,
                      );
                    } catch {
                      setStatus("Answer could not save.");
                    }
                  }}
                  className="block rounded-lg border p-2"
                >
                  {option}
                </button>
              ))}
            </fieldset>
          ))}
          <button
            onClick={async () => {
              await removeDevicePack(current.id);
              setCurrent(null);
            }}
            className="rounded-xl border p-3"
          >
            Remove from this device
          </button>
          <button
            className="rounded-xl border p-3"
            onClick={async () => {
              try {
                if (
                  !window.confirm(
                    "Delete this pack and its source material from your account?",
                  )
                )
                  return;
                const response = await fetch("/api/packs", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: current.id }),
                });
                if (!response.ok) throw Error();
                await removeDevicePack(current.id);
                setCurrent(null);
                setStatus(
                  "Pack removed from your account. Other devices should sync and remove their copy.",
                );
              } catch {
                setStatus("Needs internet to delete from your account.");
              }
            }}
          >
            Delete from account
          </button>
        </section>
      )}
    </main>
  );
}
