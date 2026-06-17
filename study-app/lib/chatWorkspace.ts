export type SavedCourse = {
  code: string;
  name: string;
  section: string;
  color: string;
};

export type SavedMajor = {
  code: string;
  name: string;
  school: string;
};

export type ChatRole = "user" | "ai";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  action?: string;
};

export type ChatConversation = {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  courseSection: string;
  majorCode: string;
  majorName: string;
  school: string;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
  messages: ChatMessage[];
};

export type ChatWorkspace = {
  version: 1;
  activeByCourse: Record<string, string | undefined>;
  conversationsById: Record<string, ChatConversation>;
  conversationIdsByCourse: Record<string, string[]>;
  legacyMigratedAt?: number;
};

export type ConversationGroup = {
  label: "Today" | "Yesterday" | "Last Week" | "Older";
  conversations: ChatConversation[];
};

export const CHAT_INACTIVITY_MS = 60 * 60 * 1000;

export const EMPTY_CHAT_WORKSPACE: ChatWorkspace = {
  version: 1,
  activeByCourse: {},
  conversationsById: {},
  conversationIdsByCourse: {},
};

export function getCurrentTimestamp(): number {
  return Date.now();
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneWorkspace(workspace: ChatWorkspace): ChatWorkspace {
  return {
    version: 1,
    activeByCourse: { ...workspace.activeByCourse },
    conversationsById: { ...workspace.conversationsById },
    conversationIdsByCourse: Object.fromEntries(
      Object.entries(workspace.conversationIdsByCourse).map(([courseCode, ids]) => [
        courseCode,
        [...ids],
      ])
    ),
    legacyMigratedAt: workspace.legacyMigratedAt,
  };
}

export function createChatMessage(
  role: ChatRole,
  content: string,
  action?: string
): ChatMessage {
  const timestamp = getCurrentTimestamp();
  return {
    id: createId(role === "user" ? "msg_user" : "msg_ai"),
    role,
    content,
    timestamp,
    action,
  };
}

export function createConversation(
  course: SavedCourse,
  major: SavedMajor,
  title = "New chat",
  messages: ChatMessage[] = []
): ChatConversation {
  const timestamp = getCurrentTimestamp();
  const lastMessageTimestamp = messages.at(-1)?.timestamp;

  return {
    id: createId("chat"),
    title,
    courseCode: course.code,
    courseName: course.name,
    courseSection: course.section,
    majorCode: major.code,
    majorName: major.name,
    school: major.school,
    createdAt: messages[0]?.timestamp ?? timestamp,
    updatedAt: lastMessageTimestamp ?? timestamp,
    lastActiveAt: lastMessageTimestamp ?? timestamp,
    messages,
  };
}

export function titleFromMessage(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 48 ? `${cleaned.slice(0, 45)}...` : cleaned;
}

export function addConversation(
  workspace: ChatWorkspace,
  conversation: ChatConversation
): ChatWorkspace {
  const next = cloneWorkspace(workspace);
  const ids = next.conversationIdsByCourse[conversation.courseCode] ?? [];

  next.conversationsById[conversation.id] = conversation;
  next.conversationIdsByCourse[conversation.courseCode] = [
    conversation.id,
    ...ids.filter((id) => id !== conversation.id),
  ];
  next.activeByCourse[conversation.courseCode] = conversation.id;

  return next;
}

export function appendMessagesToConversation(
  workspace: ChatWorkspace,
  conversationId: string,
  messages: ChatMessage[]
): ChatWorkspace {
  const conversation = workspace.conversationsById[conversationId];
  if (!conversation) return workspace;

  const next = cloneWorkspace(workspace);
  const timestamp = getCurrentTimestamp();

  next.conversationsById[conversationId] = {
    ...conversation,
    messages: [...conversation.messages, ...messages],
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  };
  next.activeByCourse[conversation.courseCode] = conversationId;

  return next;
}

export function touchConversation(
  workspace: ChatWorkspace,
  conversationId: string
): ChatWorkspace {
  const conversation = workspace.conversationsById[conversationId];
  if (!conversation) return workspace;

  const next = cloneWorkspace(workspace);
  next.conversationsById[conversationId] = {
    ...conversation,
    lastActiveAt: getCurrentTimestamp(),
  };
  next.activeByCourse[conversation.courseCode] = conversationId;

  return next;
}

export function renameConversation(
  workspace: ChatWorkspace,
  conversationId: string,
  title: string
): ChatWorkspace {
  const conversation = workspace.conversationsById[conversationId];
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (!conversation || !cleaned) return workspace;

  const next = cloneWorkspace(workspace);
  next.conversationsById[conversationId] = {
    ...conversation,
    title: cleaned,
    updatedAt: getCurrentTimestamp(),
  };

  return next;
}

export function deleteConversation(
  workspace: ChatWorkspace,
  conversationId: string
): ChatWorkspace {
  const conversation = workspace.conversationsById[conversationId];
  if (!conversation) return workspace;

  const next = cloneWorkspace(workspace);
  const courseCode = conversation.courseCode;

  delete next.conversationsById[conversationId];
  next.conversationIdsByCourse[courseCode] = (
    next.conversationIdsByCourse[courseCode] ?? []
  ).filter((id) => id !== conversationId);

  if (next.activeByCourse[courseCode] === conversationId) {
    delete next.activeByCourse[courseCode];
  }

  return next;
}

export function closeInactiveConversation(
  workspace: ChatWorkspace,
  courseCode: string
): ChatWorkspace {
  const activeId = workspace.activeByCourse[courseCode];
  if (!activeId) return workspace;

  const active = workspace.conversationsById[activeId];
  if (!active) {
    const next = cloneWorkspace(workspace);
    delete next.activeByCourse[courseCode];
    return next;
  }

  if (getCurrentTimestamp() - active.lastActiveAt < CHAT_INACTIVITY_MS) {
    return workspace;
  }

  const next = cloneWorkspace(workspace);
  delete next.activeByCourse[courseCode];
  return next;
}

export function getCourseConversations(
  workspace: ChatWorkspace,
  courseCode: string
): ChatConversation[] {
  return (workspace.conversationIdsByCourse[courseCode] ?? [])
    .map((id) => workspace.conversationsById[id])
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function groupConversationsByDate(
  conversations: ChatConversation[]
): ConversationGroup[] {
  const now = getCurrentTimestamp();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastWeek = today - 7 * 24 * 60 * 60 * 1000;

  const groups: ConversationGroup[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "Last Week", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  for (const conversation of conversations) {
    if (conversation.updatedAt >= today) {
      groups[0].conversations.push(conversation);
    } else if (conversation.updatedAt >= yesterday) {
      groups[1].conversations.push(conversation);
    } else if (conversation.updatedAt >= lastWeek) {
      groups[2].conversations.push(conversation);
    } else {
      groups[3].conversations.push(conversation);
    }
  }

  return groups.filter((group) => group.conversations.length > 0);
}

export function migrateLegacyChatHistory(
  workspace: ChatWorkspace,
  legacyMessages: ChatMessage[],
  courses: SavedCourse[],
  major: SavedMajor
): ChatWorkspace {
  const hasConversations = Object.keys(workspace.conversationsById).length > 0;
  if (workspace.legacyMigratedAt || hasConversations || legacyMessages.length === 0) {
    return workspace;
  }

  const firstCourse = courses[0];
  if (!firstCourse) return workspace;

  const conversation = createConversation(
    firstCourse,
    major,
    "Previous AI Tutor Chat",
    legacyMessages
  );
  const migrated = addConversation(workspace, conversation);

  return {
    ...migrated,
    legacyMigratedAt: getCurrentTimestamp(),
  };
}

export function ensureConversationForMessage(
  workspace: ChatWorkspace,
  course: SavedCourse,
  major: SavedMajor,
  message: string
): { workspace: ChatWorkspace; conversationId: string } {
  const activeId = workspace.activeByCourse[course.code];
  const active = activeId ? workspace.conversationsById[activeId] : undefined;

  if (active) {
    return { workspace: touchConversation(workspace, active.id), conversationId: active.id };
  }

  const conversation = createConversation(course, major, titleFromMessage(message));
  const next = addConversation(workspace, conversation);
  return { workspace: next, conversationId: conversation.id };
}