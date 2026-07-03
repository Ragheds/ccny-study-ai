import { describe, it, expect } from "vitest";
import {
  isCompactAvatarUrl,
  getAccountInitials,
  isValidEmail,
  createAccountProfile,
  createAccountProfileFromAuthUser,
  updateAccountProfile,
  updateAccountAvatar,
  updateAccountBannerColor,
  formatAccountDate,
} from "@/lib/account";

describe("isCompactAvatarUrl", () => {
  it("returns true for a valid short URL", () => {
    expect(isCompactAvatarUrl("https://example.com/avatar.png")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isCompactAvatarUrl("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isCompactAvatarUrl(null)).toBe(false);
    expect(isCompactAvatarUrl(undefined)).toBe(false);
    expect(isCompactAvatarUrl(123)).toBe(false);
  });

  it("returns false for data: URIs", () => {
    expect(isCompactAvatarUrl("data:image/png;base64,abc123")).toBe(false);
  });

  it("returns false for strings longer than 2048 chars", () => {
    expect(isCompactAvatarUrl("x".repeat(2048))).toBe(false);
  });

  it("returns true for a string at exactly 2047 chars", () => {
    expect(isCompactAvatarUrl("x".repeat(2047))).toBe(true);
  });
});

describe("getAccountInitials", () => {
  it("returns first letters of first and last name", () => {
    expect(getAccountInitials("John Doe", "john@example.com")).toBe("JD");
  });

  it("returns first two chars of single-word name", () => {
    expect(getAccountInitials("John", "john@example.com")).toBe("JO");
  });

  it("falls back to first two chars of email when name is empty", () => {
    expect(getAccountInitials("", "test@example.com")).toBe("TE");
  });

  it("handles names with extra whitespace", () => {
    expect(getAccountInitials("  Jane   Smith  ", "jane@example.com")).toBe("JS");
  });

  it("handles multi-word names by using first two words", () => {
    expect(getAccountInitials("Anna Marie Smith", "anna@example.com")).toBe("AM");
  });

  it("uppercases the initials", () => {
    expect(getAccountInitials("alice bob", "alice@example.com")).toBe("AB");
  });
});

describe("isValidEmail", () => {
  it("returns true for valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("test.name@domain.co")).toBe(true);
  });

  it("returns false for invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("noatsign")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @example.com")).toBe(false);
  });

  it("trims whitespace before validation", () => {
    expect(isValidEmail("  user@example.com  ")).toBe(true);
  });
});

describe("createAccountProfile", () => {
  it("creates a profile with cleaned name and email", () => {
    const profile = createAccountProfile("  John   Doe  ", " Test@Example.COM ");
    expect(profile.name).toBe("John Doe");
    expect(profile.email).toBe("test@example.com");
    expect(profile.initials).toBe("JD");
    expect(profile.id).toMatch(/^acct_/);
    expect(profile.createdAt).toBeGreaterThan(0);
    expect(profile.updatedAt).toBe(profile.createdAt);
  });

  it("generates unique IDs", () => {
    const a = createAccountProfile("A", "a@test.com");
    const b = createAccountProfile("B", "b@test.com");
    expect(a.id).not.toBe(b.id);
  });
});

describe("createAccountProfileFromAuthUser", () => {
  it("creates profile from auth user with full metadata", () => {
    const user = {
      id: "user-123",
      email: "test@example.com",
      created_at: "2024-01-01T00:00:00Z",
      user_metadata: {
        full_name: "John Doe",
        avatar_url: "https://example.com/avatar.png",
      },
    };
    const profile = createAccountProfileFromAuthUser(user);
    expect(profile.id).toBe("user-123");
    expect(profile.name).toBe("John Doe");
    expect(profile.email).toBe("test@example.com");
    expect(profile.initials).toBe("JD");
    expect(profile.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("falls back to email prefix for name when metadata missing", () => {
    const user = {
      id: "user-456",
      email: "jane.smith@example.com",
      user_metadata: null,
    };
    const profile = createAccountProfileFromAuthUser(user);
    expect(profile.name).toBe("jane smith");
    expect(profile.email).toBe("jane.smith@example.com");
  });

  it("handles user with no email", () => {
    const user = {
      id: "user-789",
      user_metadata: { name: "Test User" },
    };
    const profile = createAccountProfileFromAuthUser(user);
    expect(profile.name).toBe("Test User");
    expect(profile.email).toBe("");
  });

  it("uses user_metadata.name when full_name is missing", () => {
    const user = {
      id: "user-101",
      email: "test@test.com",
      user_metadata: { name: "Display Name" },
    };
    const profile = createAccountProfileFromAuthUser(user);
    expect(profile.name).toBe("Display Name");
  });

  it("falls back to CCNY Student when no email and no name", () => {
    const user = {
      id: "user-000",
      user_metadata: {},
    };
    const profile = createAccountProfileFromAuthUser(user);
    expect(profile.name).toBe("CCNY Student");
  });

  it("uses picture field when avatar_url is missing", () => {
    const user = {
      id: "user-pic",
      email: "t@t.com",
      user_metadata: { picture: "https://example.com/pic.jpg" },
    };
    const profile = createAccountProfileFromAuthUser(user);
    expect(profile.avatarUrl).toBe("https://example.com/pic.jpg");
  });

  it("reads banner_color from metadata", () => {
    const user = {
      id: "user-banner",
      email: "t@t.com",
      user_metadata: { banner_color: "#ff0000" },
    };
    const profile = createAccountProfileFromAuthUser(user);
    expect(profile.bannerColor).toBe("#ff0000");
  });
});

describe("updateAccountProfile", () => {
  it("updates name, email, and initials", () => {
    const original = createAccountProfile("Old Name", "old@test.com");
    const updated = updateAccountProfile(original, "New Name", "new@test.com");
    expect(updated.name).toBe("New Name");
    expect(updated.email).toBe("new@test.com");
    expect(updated.initials).toBe("NN");
    expect(updated.id).toBe(original.id);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(original.updatedAt);
  });

  it("preserves avatar when not specified", () => {
    const original = createAccountProfile("Test", "t@t.com");
    const withAvatar = { ...original, avatarUrl: "https://avatar.com/pic.png" };
    const updated = updateAccountProfile(withAvatar, "Test", "t@t.com");
    expect(updated.avatarUrl).toBe("https://avatar.com/pic.png");
  });

  it("can override avatar", () => {
    const original = createAccountProfile("Test", "t@t.com");
    const updated = updateAccountProfile(original, "Test", "t@t.com", "https://new-avatar.com");
    expect(updated.avatarUrl).toBe("https://new-avatar.com");
  });
});

describe("updateAccountAvatar", () => {
  it("sets avatar to a valid URL", () => {
    const original = createAccountProfile("Test", "t@t.com");
    const updated = updateAccountAvatar(original, "https://cdn.example.com/avatar.png");
    expect(updated.avatarUrl).toBe("https://cdn.example.com/avatar.png");
  });

  it("sets avatar to undefined for data: URIs", () => {
    const original = createAccountProfile("Test", "t@t.com");
    const updated = updateAccountAvatar(original, "data:image/png;base64,xxx");
    expect(updated.avatarUrl).toBeUndefined();
  });
});

describe("updateAccountBannerColor", () => {
  it("sets banner color", () => {
    const original = createAccountProfile("Test", "t@t.com");
    const updated = updateAccountBannerColor(original, "#3366ff");
    expect(updated.bannerColor).toBe("#3366ff");
    expect(updated.updatedAt).toBeGreaterThanOrEqual(original.updatedAt);
  });
});

describe("formatAccountDate", () => {
  it("formats a timestamp into a readable date string", () => {
    const timestamp = new Date("2024-03-15").getTime();
    const formatted = formatAccountDate(timestamp);
    expect(formatted).toContain("Mar");
    expect(formatted).toContain("15");
    expect(formatted).toContain("2024");
  });
});
