export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  initials: string;
  createdAt: number;
  updatedAt: number;
};

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

export function updateAccountProfile(
  account: AccountProfile,
  name: string,
  email: string
): AccountProfile {
  const cleanName = name.replace(/\s+/g, " ").trim();
  const cleanEmail = email.trim().toLowerCase();

  return {
    ...account,
    name: cleanName,
    email: cleanEmail,
    initials: getAccountInitials(cleanName, cleanEmail),
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
