"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  allSavedDeviceLessons,
  type SavedLesson,
} from "@/lib/whiteboard/deviceLessons";
import { STORAGE_CHANGE_EVENT } from "@/lib/storage";
const Tutor = dynamic(() =>
  import("./WhiteboardTutor").then((module) => module.WhiteboardTutor),
);
export function OfflineLessons() {
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [selected, setSelected] = useState<SavedLesson | null>(null);
  useEffect(() => {
    const refresh = () => {
      allSavedDeviceLessons()
        .then((items) => {
          setLessons(items);
          setSelected(
            (old) => items.find((item) => item.id === old?.id) ?? null,
          );
        })
        .catch(() => {});
    };
    refresh();
    window.addEventListener(STORAGE_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, refresh);
  }, []);
  return (
    <details className="rounded-xl border p-3">
      <summary>Saved whiteboard lessons ({lessons.length})</summary>
      {lessons.map((item) => (
        <button
          key={item.id}
          onClick={() => setSelected(item)}
          className="m-2 rounded-lg border p-2"
        >
          {item.courseCode}: {item.lesson.title}
        </button>
      ))}
      {selected && (
        <Tutor
          key={selected.id}
          courseCode={selected.courseCode}
          initialLesson={selected.lesson}
        />
      )}
    </details>
  );
}
