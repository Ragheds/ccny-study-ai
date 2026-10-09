import { openDB } from "idb";
import { getActiveAccountId } from "@/lib/storage";
import type { Lesson } from "@/lib/whiteboard/schema";
export type SavedLesson = {
  id: string;
  owner: string;
  courseCode: string;
  lesson: Lesson;
  at: number;
};
const db = () =>
  openDB("ccny-lessons-v1", 1, {
    upgrade(database) {
      database.createObjectStore("lessons", { keyPath: "id" });
    },
  });
export async function saveDeviceLesson(
  courseCode: string,
  lesson: Lesson,
  id = crypto.randomUUID(),
) {
  const owner = getActiveAccountId();
  if (!owner) return;
  await (
    await db()
  ).put("lessons", {
    id,
    owner,
    courseCode,
    lesson,
    at: Date.now(),
  });
}
export async function savedDeviceLessons(courseCode: string) {
  return ((await (await db()).getAll("lessons")) as SavedLesson[])
    .filter(
      (item) =>
        item.owner === getActiveAccountId() && item.courseCode === courseCode,
    )
    .sort((a, b) => b.at - a.at);
}

export async function allSavedDeviceLessons() {
  return ((await (await db()).getAll("lessons")) as SavedLesson[]).filter(
    (item) => item.owner === getActiveAccountId(),
  );
}
