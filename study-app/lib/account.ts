export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  bannerColor?: string;
  createdAt: number;
  updatedAt: number;
};

type AuthUserLike = {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: {
    full_name?: unknown;
    name?: unknown;
    email?: unknown;
    avatar_url?: unknown;
    picture?: unknown;
  } | null;
};

export function isCompactAvatarUrl(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length < 2048 && !value.startsWith("data:");
}

function createId(): string {
  return `acct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getAccountInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function createAccountProfile(name: string, email: string): AccountProfile {
  const timestamp = Date.now();
  const cleanName = name.replace(/\s+/g, " ").trim();
  const cleanEmail = email.trim().toLowerCase();

  return {
    id: createId(),
    name: cleanName,
    email: cleanEmail,
    initials: getAccountInitials(cleanName, cleanEmail),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createAccountProfileFromAuthUser(user: AuthUserLike): AccountProfile {
  const email = typeof user.email === "string"
    ? user.email
    : typeof user.user_metadata?.email === "string"
      ? user.user_metadata.email
      : "";
  const metadataName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "";
  const fallbackName = email ? email.split("@")[0].replace(/[._-]+/g, " ") : "CCNY Student";
  const cleanName = (metadataName || fallbackName).replace(/\s+/g, " ").trim();
  const cleanEmail = email.trim().toLowerCase();
  const metadataAvatar = isCompactAvatarUrl(user.user_metadata?.avatar_url)
    ? user.user_metadata.avatar_url
    : isCompactAvatarUrl(user.user_metadata?.picture)
      ? user.user_metadata.picture
      : undefined;
  const metadataAny = user.user_metadata as any | undefined;
  const metadataBanner = typeof metadataAny?.banner_color === "string"
    ? metadataAny.banner_color
    : typeof metadataAny?.bannerColor === "string"
      ? metadataAny.bannerColor
      : undefined;
  const createdAt = user.created_at ? Date.parse(user.created_at) : Date.now();
  const timestamp = Number.isFinite(createdAt) ? createdAt : Date.now();

  return {
    id: user.id,
    name: cleanName,
    email: cleanEmail,
    initials: getAccountInitials(cleanName, cleanEmail),
    avatarUrl: metadataAvatar,
    bannerColor: metadataBanner,
    createdAt: timestamp,
    updatedAt: Date.now(),
  };
}

export function updateAccountProfile(
  account: AccountProfile,
  name: string,
  email: string,
  avatarUrl = account.avatarUrl
): AccountProfile {
  const cleanName = name.replace(/\s+/g, " ").trim();
  const cleanEmail = email.trim().toLowerCase();

  return {
    ...account,
    name: cleanName,
    email: cleanEmail,
    initials: getAccountInitials(cleanName, cleanEmail),
    avatarUrl,
    updatedAt: Date.now(),
  };
}

export function updateAccountAvatar(
  account: AccountProfile,
  avatarUrl: string
): AccountProfile {
  return {
    ...account,
    avatarUrl: isCompactAvatarUrl(avatarUrl) ? avatarUrl : undefined,
    updatedAt: Date.now(),
  };
}

export function updateAccountBannerColor(
  account: AccountProfile,
  bannerColor: string
): AccountProfile {
  return {
    ...account,
    bannerColor,
    updatedAt: Date.now(),
  };
}

export function formatAccountDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
