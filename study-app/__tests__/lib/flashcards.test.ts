import { describe, it, expect } from "vitest";
import {
  parseFlashcardsFromText,
  createFlashcardSet,
  normalizeFlashcardStore,
  addFlashcardSet,
  selectFlashcardSet,
  clearActiveFlashcardSet,
  renameFlashcardSet,
  deleteFlashcardSet,
  getCourseFlashcardSets,
  getActiveFlashcardSet,
  groupFlashcardSetsByDate,
  formatFlashcardDate,
  EMPTY_FLASHCARD_STORE,
  FLASHCARD_TARGET_COUNT,
  FlashcardSet,
  FlashcardStore,
} from "@/lib/flashcards";

const mockCourse = { code: "CSC 101", name: "Intro to CS", section: "A", color: "#000" };
const mockMajor = { code: "CMPSC-BS", name: "Computer Science", school: "Grove School" };

describe("parseFlashcardsFromText", () => {
  it("returns empty array for empty input", () => {
    expect(parseFlashcardsFromText("")).toEqual([]);
    expect(parseFlashcardsFromText("   ")).toEqual([]);
  });

  it("parses simple FRONT/BACK pairs", () => {
    const raw = `FRONT: What is 2+2?
BACK: 4

---

FRONT: Capital of France?
BACK: Paris`;

    const cards = parseFlashcardsFromText(raw);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("What is 2+2?");
    expect(cards[0].back).toBe("4");
    expect(cards[1].front).toBe("Capital of France?");
    expect(cards[1].back).toBe("Paris");
  });

  it("handles bold markers on FRONT/BACK", () => {
    const raw = `**FRONT**: What is OOP?
**BACK**: Object-Oriented Programming`;

    const cards = parseFlashcardsFromText(raw);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("What is OOP?");
    expect(cards[0].back).toBe("Object-Oriented Programming");
  });

  it("handles numbered cards", () => {
    const raw = `1) FRONT: Question one
BACK: Answer one

2) FRONT: Question two
BACK: Answer two`;

    const cards = parseFlashcardsFromText(raw);
    expect(cards).toHaveLength(2);
  });

  it("strips leading bullet markers from card text", () => {
    const raw = `FRONT: - List item one
- List item two
BACK: - Answer item`;

    const cards = parseFlashcardsFromText(raw);
    expect(cards[0].front).not.toMatch(/^[-*]\s/);
  });

  it("limits output to FLASHCARD_TARGET_COUNT cards", () => {
    const lines = Array.from({ length: 25 }, (_, i) =>
      `FRONT: Q${i + 1}\nBACK: A${i + 1}\n---`
    ).join("\n");

    const cards = parseFlashcardsFromText(lines);
    expect(cards.length).toBeLessThanOrEqual(FLASHCARD_TARGET_COUNT);
  });

  it("skips cards with empty front or back", () => {
    const raw = `FRONT:
BACK: Answer

FRONT: Question
BACK:`;

    const cards = parseFlashcardsFromText(raw);
    expect(cards).toHaveLength(0);
  });

  it("normalizes Windows line endings", () => {
    const raw = "FRONT: Question\r\nBACK: Answer";
    const cards = parseFlashcardsFromText(raw);
    expect(cards).toHaveLength(1);
  });
});

describe("createFlashcardSet", () => {
  it("creates a flashcard set with correct metadata", () => {
    const drafts = [{ front: "Q1", back: "A1" }, { front: "Q2", back: "A2" }];
    const set = createFlashcardSet(mockCourse, mockMajor, drafts, "Generate flashcards");

    expect(set.id).toMatch(/^flashcard_set_/);
    expect(set.courseCode).toBe("CSC 101");
    expect(set.courseName).toBe("Intro to CS");
    expect(set.majorCode).toBe("CMPSC-BS");
    expect(set.school).toBe("Grove School");
    expect(set.sourcePrompt).toBe("Generate flashcards");
    expect(set.cards).toHaveLength(2);
    expect(set.cards[0].front).toBe("Q1");
    expect(set.cards[0].back).toBe("A1");
  });

  it("uses focus as title when provided", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [], "prompt", { focus: "Arrays" });
    expect(set.title).toBe("Arrays");
    expect(set.focus).toBe("Arrays");
  });

  it("uses default title when no focus", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [], "prompt");
    expect(set.title).toBe("Course review");
  });

  it("uses material title when materialIncluded is true", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [], "prompt", {
      materialIncluded: true,
    });
    expect(set.title).toBe("Uploaded material review");
  });

  it("limits cards to FLASHCARD_TARGET_COUNT", () => {
    const drafts = Array.from({ length: 30 }, (_, i) => ({ front: `Q${i}`, back: `A${i}` }));
    const set = createFlashcardSet(mockCourse, mockMajor, drafts, "prompt");
    expect(set.cards.length).toBeLessThanOrEqual(FLASHCARD_TARGET_COUNT);
  });

  it("assigns unique card IDs", () => {
    const drafts = [{ front: "Q1", back: "A1" }, { front: "Q2", back: "A2" }];
    const set = createFlashcardSet(mockCourse, mockMajor, drafts, "prompt");
    expect(set.cards[0].id).not.toBe(set.cards[1].id);
  });
});

describe("normalizeFlashcardStore", () => {
  it("returns same structure for version 2 store", () => {
    const store: FlashcardStore = {
      version: 2,
      activeSetByCourse: { "CSC 101": "set1" },
      setsById: {},
      setIdsByCourse: { "CSC 101": ["set1"] },
    };
    const normalized = normalizeFlashcardStore(store);
    expect(normalized.version).toBe(2);
    expect(normalized.activeSetByCourse["CSC 101"]).toBe("set1");
  });

  it("migrates legacy setsByCourse format", () => {
    const legacySet: FlashcardSet = {
      id: "legacy-set-1",
      title: "Old Set",
      courseCode: "CSC 101",
      courseName: "Intro to CS",
      courseSection: "A",
      majorCode: "CMPSC-BS",
      majorName: "Computer Science",
      school: "Grove School",
      sourcePrompt: "test",
      focus: "test",
      materialIncluded: false,
      cards: [],
      createdAt: 1000,
      updatedAt: 2000,
    };

    const legacy = {
      setsByCourse: { "CSC 101": legacySet },
    };

    const normalized = normalizeFlashcardStore(legacy);
    expect(normalized.version).toBe(2);
    expect(normalized.setsById["legacy-set-1"]).toBeDefined();
    expect(normalized.setIdsByCourse["CSC 101"]).toContain("legacy-set-1");
    expect(normalized.activeSetByCourse["CSC 101"]).toBe("legacy-set-1");
  });
});

describe("addFlashcardSet", () => {
  it("adds a set and makes it active", () => {
    const drafts = [{ front: "Q", back: "A" }];
    const set = createFlashcardSet(mockCourse, mockMajor, drafts, "prompt");
    const store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set);

    expect(store.setsById[set.id]).toBeDefined();
    expect(store.setIdsByCourse[set.courseCode]).toContain(set.id);
    expect(store.activeSetByCourse[set.courseCode]).toBe(set.id);
  });

  it("places new set at beginning of list", () => {
    const set1 = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q1", back: "A1" }], "p1");
    const set2 = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q2", back: "A2" }], "p2");

    let store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set1);
    store = addFlashcardSet(store, set2);

    expect(store.setIdsByCourse[mockCourse.code][0]).toBe(set2.id);
  });
});

describe("selectFlashcardSet", () => {
  it("selects an existing set as active", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q", back: "A" }], "p");
    const store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set);
    const updated = selectFlashcardSet(store, mockCourse.code, set.id);
    expect(updated.activeSetByCourse[mockCourse.code]).toBe(set.id);
  });

  it("returns unchanged store if set does not exist", () => {
    const store = EMPTY_FLASHCARD_STORE;
    const updated = selectFlashcardSet(store, "CSC 101", "nonexistent");
    expect(updated).toBe(store);
  });
});

describe("clearActiveFlashcardSet", () => {
  it("removes active set for course", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q", back: "A" }], "p");
    const store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set);
    const cleared = clearActiveFlashcardSet(store, mockCourse.code);
    expect(cleared.activeSetByCourse[mockCourse.code]).toBeUndefined();
  });
});

describe("renameFlashcardSet", () => {
  it("renames a set with cleaned title", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q", back: "A" }], "p");
    const store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set);
    const renamed = renameFlashcardSet(store, set.id, "  New  Title  ");
    expect(renamed.setsById[set.id].title).toBe("New Title");
  });

  it("returns unchanged store for empty title", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q", back: "A" }], "p");
    const store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set);
    const result = renameFlashcardSet(store, set.id, "   ");
    expect(result).toBe(store);
  });

  it("returns unchanged store for nonexistent set", () => {
    const result = renameFlashcardSet(EMPTY_FLASHCARD_STORE, "fake", "Title");
    expect(result).toBe(EMPTY_FLASHCARD_STORE);
  });
});

describe("deleteFlashcardSet", () => {
  it("removes a set from the store", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q", back: "A" }], "p");
    const store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set);
    const deleted = deleteFlashcardSet(store, set.id);

    expect(deleted.setsById[set.id]).toBeUndefined();
    expect(deleted.setIdsByCourse[mockCourse.code]).not.toContain(set.id);
  });

  it("promotes next set to active when deleting active", () => {
    const set1 = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q1", back: "A1" }], "p1");
    const set2 = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q2", back: "A2" }], "p2");

    let store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set1);
    store = addFlashcardSet(store, set2);
    const deleted = deleteFlashcardSet(store, set2.id);

    expect(deleted.activeSetByCourse[mockCourse.code]).toBe(set1.id);
  });

  it("returns unchanged store for nonexistent set", () => {
    const result = deleteFlashcardSet(EMPTY_FLASHCARD_STORE, "fake");
    expect(result).toBe(EMPTY_FLASHCARD_STORE);
  });
});

describe("getCourseFlashcardSets", () => {
  it("returns sets sorted by updatedAt descending", () => {
    const set1 = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q1", back: "A1" }], "p1");
    const set2 = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q2", back: "A2" }], "p2");

    let store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set1);
    store = addFlashcardSet(store, set2);

    const sets = getCourseFlashcardSets(store, mockCourse.code);
    expect(sets[0].updatedAt).toBeGreaterThanOrEqual(sets[1].updatedAt);
  });

  it("returns empty array for unknown course", () => {
    expect(getCourseFlashcardSets(EMPTY_FLASHCARD_STORE, "UNKNOWN")).toEqual([]);
  });
});

describe("getActiveFlashcardSet", () => {
  it("returns the active set for a course", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q", back: "A" }], "p");
    const store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set);
    const active = getActiveFlashcardSet(store, mockCourse.code);
    expect(active?.id).toBe(set.id);
  });

  it("falls back to most recent set if no active set", () => {
    const set = createFlashcardSet(mockCourse, mockMajor, [{ front: "Q", back: "A" }], "p");
    let store = addFlashcardSet(EMPTY_FLASHCARD_STORE, set);
    store = clearActiveFlashcardSet(store, mockCourse.code);

    const active = getActiveFlashcardSet(store, mockCourse.code);
    expect(active?.id).toBe(set.id);
  });

  it("returns undefined for unknown course", () => {
    expect(getActiveFlashcardSet(EMPTY_FLASHCARD_STORE, "UNKNOWN")).toBeUndefined();
  });
});

describe("groupFlashcardSetsByDate", () => {
  it("groups sets into time-based buckets", () => {
    const now = Date.now();
    const sets: FlashcardSet[] = [
      { id: "1", title: "T", courseCode: "C", courseName: "N", courseSection: "S", majorCode: "M", majorName: "MN", school: "S", sourcePrompt: "", focus: "", materialIncluded: false, cards: [], createdAt: now, updatedAt: now },
      { id: "2", title: "T", courseCode: "C", courseName: "N", courseSection: "S", majorCode: "M", majorName: "MN", school: "S", sourcePrompt: "", focus: "", materialIncluded: false, cards: [], createdAt: now - 2 * 86400000, updatedAt: now - 2 * 86400000 },
    ];

    const groups = groupFlashcardSetsByDate(sets);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].label).toBe("Today");
  });

  it("returns empty array for no sets", () => {
    expect(groupFlashcardSetsByDate([])).toEqual([]);
  });
});

describe("formatFlashcardDate", () => {
  it("formats a timestamp to readable date", () => {
    const timestamp = new Date("2024-06-15T14:30:00").getTime();
    const formatted = formatFlashcardDate(timestamp);
    expect(formatted).toContain("Jun");
    expect(formatted).toContain("15");
  });
});
