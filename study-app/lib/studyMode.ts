export type StudyMode = "visual" | "audio" | "active";

export const STUDY_MODES: { id: StudyMode; emoji: string; label: string; description: string }[] = [
  { id: "visual", emoji: "👀", label: "Visual", description: "Diagrams, structure, and color" },
  { id: "audio", emoji: "🎧", label: "Audio", description: "Spoken explanations, hands-free" },
  { id: "active", emoji: "🛠️", label: "Hands-on", description: "Practice problems first" },
];

export function isStudyMode(value: unknown): value is StudyMode {
  return value === "visual" || value === "audio" || value === "active";
}

export function studyModeInstruction(mode: StudyMode | null): string {
  switch (mode) {
    case "visual":
      return "Default to a visual teaching style: short lines, labeled steps, simple text diagrams, and clear structure. Describe what a diagram would show when useful.";
    case "audio":
      return "Use short, natural spoken sentences. Avoid markdown, tables, and long formulas read symbol by symbol. Make the explanation work when heard aloud.";
    case "active":
      return "Lead with one practice problem. Give a small first hint, then a stronger hint, then a worked step only when asked. Explain the full solution after the student tries.";
    default:
      return "";
  }
}
