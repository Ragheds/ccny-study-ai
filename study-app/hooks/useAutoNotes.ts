"use client";
import { useCallback } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { KEYS } from "@/lib/storage";
import {
  captureTaughtNote,
  type AutoNote,
  type AutoNotesStore,
} from "@/lib/autoNotes";
export function useAutoNotes(courseCode: string) {
  const [, setStore] = useStoredValue<AutoNotesStore>(KEYS.NOTES_V2, {});
  return useCallback(
    (sourceId: string, text: string, source: AutoNote["source"] = "chat") => {
      setStore((current) =>
        captureTaughtNote(current, courseCode, sourceId, text, source),
      );
    },
    [courseCode, setStore],
  );
}
