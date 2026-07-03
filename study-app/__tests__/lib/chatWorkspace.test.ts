import { describe, it, expect } from "vitest";
import {
  createChatMessage,
  createConversation,
  titleFromMessage,
  addConversation,
  appendMessagesToConversation,
  touchConversation,
  renameConversation,
  deleteConversation,
  closeInactiveConversation,
  getCourseConversations,
  groupConversationsByDate,
  migrateLegacyChatHistory,
  ensureConversationForMessage,
  EMPTY_CHAT_WORKSPACE,
  CHAT_INACTIVITY_MS,
} from "@/lib/chatWorkspace";

const mockCourse = { code: "CSC 101", name: "Intro to CS", section: "A", color: "#000" };
const mockMajor = { code: "CMPSC-BS", name: "Computer Science", school: "Grove School" };

describe("createChatMessage", () => {
  it("creates a user message", () => {
    const msg = createChatMessage("user", "Hello world");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello world");
    expect(msg.id).toMatch(/^msg_user_/);
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it("creates an AI message", () => {
    const msg = createChatMessage("ai", "Hi there");
    expect(msg.role).toBe("ai");
    expect(msg.id).toMatch(/^msg_ai_/);
  });

  it("includes optional action", () => {
    const msg = createChatMessage("ai", "Quiz", "quiz");
    expect(msg.action).toBe("quiz");
  });
});

describe("createConversation", () => {
  it("creates a conversation with course and major info", () => {
    const convo = createConversation(mockCourse, mockMajor);
    expect(convo.id).toMatch(/^chat_/);
    expect(convo.title).toBe("New chat");
    expect(convo.courseCode).toBe("CSC 101");
    expect(convo.majorCode).toBe("CMPSC-BS");
    expect(convo.messages).toEqual([]);
  });

  it("accepts a custom title", () => {
    const convo = createConversation(mockCourse, mockMajor, "My Topic");
    expect(convo.title).toBe("My Topic");
  });

  it("accepts initial messages and uses their timestamps", () => {
    const msgs = [
      createChatMessage("user", "First"),
      createChatMessage("ai", "Reply"),
    ];
    const convo = createConversation(mockCourse, mockMajor, "Chat", msgs);
    expect(convo.messages).toHaveLength(2);
    expect(convo.createdAt).toBe(msgs[0].timestamp);
    expect(convo.lastActiveAt).toBe(msgs[1].timestamp);
  });
});

describe("titleFromMessage", () => {
  it("returns cleaned message as title", () => {
    expect(titleFromMessage("Hello world")).toBe("Hello world");
  });

  it("truncates long messages to 48 chars", () => {
    const long = "a".repeat(60);
    const title = titleFromMessage(long);
    expect(title.length).toBeLessThanOrEqual(48);
    expect(title).toContain("...");
  });

  it("normalizes whitespace", () => {
    expect(titleFromMessage("  hello   world  ")).toBe("hello world");
  });

  it("returns 'New chat' for empty input", () => {
    expect(titleFromMessage("")).toBe("New chat");
    expect(titleFromMessage("   ")).toBe("New chat");
  });
});

describe("addConversation", () => {
  it("adds conversation and sets it as active", () => {
    const convo = createConversation(mockCourse, mockMajor);
    const ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);

    expect(ws.conversationsById[convo.id]).toBeDefined();
    expect(ws.conversationIdsByCourse[mockCourse.code]).toContain(convo.id);
    expect(ws.activeByCourse[mockCourse.code]).toBe(convo.id);
  });

  it("places new conversation at beginning of list", () => {
    const c1 = createConversation(mockCourse, mockMajor, "First");
    const c2 = createConversation(mockCourse, mockMajor, "Second");

    let ws = addConversation(EMPTY_CHAT_WORKSPACE, c1);
    ws = addConversation(ws, c2);

    expect(ws.conversationIdsByCourse[mockCourse.code][0]).toBe(c2.id);
  });
});

describe("appendMessagesToConversation", () => {
  it("appends messages to an existing conversation", () => {
    const convo = createConversation(mockCourse, mockMajor);
    let ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);

    const msgs = [createChatMessage("user", "New message")];
    ws = appendMessagesToConversation(ws, convo.id, msgs);

    expect(ws.conversationsById[convo.id].messages).toHaveLength(1);
    expect(ws.conversationsById[convo.id].messages[0].content).toBe("New message");
  });

  it("returns unchanged workspace for nonexistent conversation", () => {
    const ws = EMPTY_CHAT_WORKSPACE;
    const result = appendMessagesToConversation(ws, "fake-id", []);
    expect(result).toBe(ws);
  });

  it("updates activeByCourse for the conversation's course", () => {
    const convo = createConversation(mockCourse, mockMajor);
    let ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);
    ws = appendMessagesToConversation(ws, convo.id, [createChatMessage("user", "hi")]);
    expect(ws.activeByCourse[mockCourse.code]).toBe(convo.id);
  });
});

describe("touchConversation", () => {
  it("updates lastActiveAt and sets as active", () => {
    const convo = createConversation(mockCourse, mockMajor);
    let ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);

    const before = ws.conversationsById[convo.id].lastActiveAt;
    ws = touchConversation(ws, convo.id);
    expect(ws.conversationsById[convo.id].lastActiveAt).toBeGreaterThanOrEqual(before);
  });

  it("returns unchanged workspace for nonexistent conversation", () => {
    const ws = EMPTY_CHAT_WORKSPACE;
    expect(touchConversation(ws, "nonexistent")).toBe(ws);
  });
});

describe("renameConversation", () => {
  it("renames with cleaned title", () => {
    const convo = createConversation(mockCourse, mockMajor);
    let ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);
    ws = renameConversation(ws, convo.id, "  New  Name  ");
    expect(ws.conversationsById[convo.id].title).toBe("New Name");
  });

  it("returns unchanged workspace for empty title", () => {
    const convo = createConversation(mockCourse, mockMajor);
    const ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);
    expect(renameConversation(ws, convo.id, "   ")).toBe(ws);
  });

  it("returns unchanged workspace for nonexistent conversation", () => {
    const ws = EMPTY_CHAT_WORKSPACE;
    expect(renameConversation(ws, "fake", "Title")).toBe(ws);
  });
});

describe("deleteConversation", () => {
  it("removes conversation from workspace", () => {
    const convo = createConversation(mockCourse, mockMajor);
    let ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);
    ws = deleteConversation(ws, convo.id);

    expect(ws.conversationsById[convo.id]).toBeUndefined();
    expect(ws.conversationIdsByCourse[mockCourse.code]).not.toContain(convo.id);
  });

  it("clears active when deleting active conversation", () => {
    const convo = createConversation(mockCourse, mockMajor);
    const ws = deleteConversation(
      addConversation(EMPTY_CHAT_WORKSPACE, convo),
      convo.id
    );
    expect(ws.activeByCourse[mockCourse.code]).toBeUndefined();
  });

  it("returns unchanged workspace for nonexistent conversation", () => {
    const ws = EMPTY_CHAT_WORKSPACE;
    expect(deleteConversation(ws, "fake")).toBe(ws);
  });
});

describe("closeInactiveConversation", () => {
  it("closes conversation that has been inactive longer than threshold", () => {
    const convo = createConversation(mockCourse, mockMajor);
    const ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);

    // Manually set lastActiveAt to past the threshold
    ws.conversationsById[convo.id] = {
      ...ws.conversationsById[convo.id],
      lastActiveAt: Date.now() - CHAT_INACTIVITY_MS - 1000,
    };

    const result = closeInactiveConversation(ws, mockCourse.code);
    expect(result.activeByCourse[mockCourse.code]).toBeUndefined();
  });

  it("keeps conversation open if still within threshold", () => {
    const convo = createConversation(mockCourse, mockMajor);
    const ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);
    const result = closeInactiveConversation(ws, mockCourse.code);
    expect(result.activeByCourse[mockCourse.code]).toBe(convo.id);
  });

  it("returns unchanged workspace if no active conversation", () => {
    const ws = EMPTY_CHAT_WORKSPACE;
    expect(closeInactiveConversation(ws, mockCourse.code)).toBe(ws);
  });
});

describe("getCourseConversations", () => {
  it("returns conversations sorted by updatedAt descending", () => {
    const c1 = createConversation(mockCourse, mockMajor, "First");
    const c2 = createConversation(mockCourse, mockMajor, "Second");

    let ws = addConversation(EMPTY_CHAT_WORKSPACE, c1);
    ws = addConversation(ws, c2);

    const convos = getCourseConversations(ws, mockCourse.code);
    expect(convos[0].updatedAt).toBeGreaterThanOrEqual(convos[1].updatedAt);
  });

  it("returns empty array for unknown course", () => {
    expect(getCourseConversations(EMPTY_CHAT_WORKSPACE, "FAKE")).toEqual([]);
  });
});

describe("groupConversationsByDate", () => {
  it("groups conversations by time buckets", () => {
    const convo = createConversation(mockCourse, mockMajor);
    const groups = groupConversationsByDate([convo]);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].label).toBe("Today");
  });

  it("returns empty array for no conversations", () => {
    expect(groupConversationsByDate([])).toEqual([]);
  });
});

describe("migrateLegacyChatHistory", () => {
  it("migrates legacy messages into a conversation", () => {
    const msgs = [createChatMessage("user", "Old msg")];
    const result = migrateLegacyChatHistory(
      EMPTY_CHAT_WORKSPACE,
      msgs,
      [mockCourse],
      mockMajor
    );

    const ids = result.conversationIdsByCourse[mockCourse.code];
    expect(ids).toHaveLength(1);
    expect(result.conversationsById[ids[0]].title).toBe("Previous AI Tutor Chat");
    expect(result.legacyMigratedAt).toBeGreaterThan(0);
  });

  it("does not re-migrate if already migrated", () => {
    const msgs = [createChatMessage("user", "Old msg")];
    const migrated = migrateLegacyChatHistory(
      EMPTY_CHAT_WORKSPACE,
      msgs,
      [mockCourse],
      mockMajor
    );
    const result = migrateLegacyChatHistory(migrated, msgs, [mockCourse], mockMajor);
    expect(result).toBe(migrated);
  });

  it("returns unchanged workspace if no legacy messages", () => {
    const result = migrateLegacyChatHistory(EMPTY_CHAT_WORKSPACE, [], [mockCourse], mockMajor);
    expect(result).toBe(EMPTY_CHAT_WORKSPACE);
  });

  it("returns unchanged workspace if no courses", () => {
    const msgs = [createChatMessage("user", "msg")];
    const result = migrateLegacyChatHistory(EMPTY_CHAT_WORKSPACE, msgs, [], mockMajor);
    expect(result).toBe(EMPTY_CHAT_WORKSPACE);
  });
});

describe("ensureConversationForMessage", () => {
  it("creates new conversation if none active", () => {
    const { workspace, conversationId } = ensureConversationForMessage(
      EMPTY_CHAT_WORKSPACE,
      mockCourse,
      mockMajor,
      "Hello"
    );

    expect(conversationId).toBeDefined();
    expect(workspace.conversationsById[conversationId]).toBeDefined();
    expect(workspace.conversationsById[conversationId].title).toBe("Hello");
  });

  it("reuses active conversation if one exists", () => {
    const convo = createConversation(mockCourse, mockMajor);
    const ws = addConversation(EMPTY_CHAT_WORKSPACE, convo);

    const { conversationId } = ensureConversationForMessage(
      ws,
      mockCourse,
      mockMajor,
      "New message"
    );

    expect(conversationId).toBe(convo.id);
  });
});
