"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { devicePacks, downloadPack } from "@/lib/offline/db";
export function PackDownload({ courseCode }: { courseCode: string }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () =>
      devicePacks()
        .then((packs) => {
          const pack = packs.find((item) => item.course_code === courseCode);
          setSize(
            pack
              ? Math.ceil(new Blob([JSON.stringify(pack)]).size / 1024)
              : null,
          );
        })
        .catch(() => {});
    refresh();
    window.addEventListener("packs-changed", refresh);
    return () => window.removeEventListener("packs-changed", refresh);
  }, [courseCode]);
  async function create() {
    setBusy(true);
    try {
      if (!navigator.onLine)
        throw Error(
          "Needs internet to prepare a pack. Open your downloaded packs below.",
        );
      const response = await fetch("/api/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      await downloadPack(data.pack);
      setStatus("Ready for your commute.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not download. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2 rounded-xl border p-3">
      <p>
        {courseCode}: {size ? `Downloaded · ${size} KB` : "Not downloaded"}
      </p>
      <button
        disabled={busy}
        onClick={create}
        className="rounded-lg border p-2"
      >
        {busy ? "Preparing pack…" : "Make available offline"}
      </button>{" "}
      <Link href="/offline">Open packs →</Link>
      <p role="status">{status}</p>
    </div>
  );
}
