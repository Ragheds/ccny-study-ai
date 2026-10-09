import { z } from "zod";
export const PackContent = z.object({
  summary: z.string().max(12000),
  notes: z.string().max(20000),
  cards: z
    .array(
      z.object({ front: z.string().max(1000), back: z.string().max(2000) }),
    )
    .min(1)
    .max(20),
  quiz: z
    .array(
      z.object({
        question: z.string().max(1000),
        options: z.array(z.string().max(500)).length(4),
        answer: z.number().int().min(0).max(3),
        explanation: z.string().max(2000),
      }),
    )
    .min(1)
    .max(10),
  lessons: z.array(z.unknown()).max(30).default([]),
});
export type StudyPack = {
  id: string;
  user_id: string;
  course_code: string;
  title: string;
  content: z.infer<typeof PackContent>;
  updated_at: string;
  is_deleted?: boolean;
};
export const PACK_PROMPT =
  "Return only JSON with summary, notes, cards (20 front/back objects), quiz (10 question/options array of four strings/answer zero-based index/explanation objects), lessons empty array. Teach the selected CCNY course. Be accurate; say when unsure. No markdown fences.";
