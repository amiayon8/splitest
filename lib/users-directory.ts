import { FriendContact } from "@/types";

export interface PublicUserProfile extends FriendContact {
  bio?: string;
  location?: string;
  memberSince?: string;
}

export const PRESET_USERS_DIRECTORY: PublicUserProfile[] = [];

export function normalizeUsernameInput(rawInput: string): string {
  let cleaned = rawInput.trim().toLowerCase();

  if (cleaned.includes("/u/")) {
    const segments = cleaned.split("/u/");
    cleaned = segments[segments.length - 1] || "";
  } else if (cleaned.includes("/profile/")) {
    const segments = cleaned.split("/profile/");
    cleaned = segments[segments.length - 1] || "";
  }

  cleaned = cleaned.replace(/^[#@]+/, "");
  cleaned = cleaned.split("?")[0];
  cleaned = cleaned.split("#")[0];
  cleaned = cleaned.replace(/\/+$/, "");

  return cleaned.trim();
}

export function findUserByUsername(
  rawUsernameOrUrl: string,
  extraUsers: PublicUserProfile[] = [],
): PublicUserProfile | null {
  const normalized = normalizeUsernameInput(rawUsernameOrUrl);
  if (!normalized) return null;

  const combined = [...PRESET_USERS_DIRECTORY, ...extraUsers];

  const exactMatch = combined.find(
    (u) =>
      u.username.toLowerCase() === normalized ||
      (u.email ? u.email.toLowerCase() === normalized : false) ||
      u.name.toLowerCase() === normalized,
  );

  if (exactMatch) return exactMatch;

  const partialMatch = combined.find(
    (u) =>
      u.username.toLowerCase().includes(normalized) ||
      u.name.toLowerCase().includes(normalized),
  );

  return partialMatch || null;
}

export function buildProfileShareUrl(username: string): string {
  const normalized = normalizeUsernameInput(username);
  if (typeof window !== "undefined") {
    return `${window.location.origin}/u/${normalized}`;
  }
  return `https://splitest.thenicedev.xyz/u/${normalized}`;
}
