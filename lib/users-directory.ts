import { FriendContact, UserProfile } from "@/types";
import { getSupabaseClient } from "@/lib/supabase";

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

export function validateUsernameFormat(rawInput: string): { valid: boolean; error?: string } {
  const cleaned = normalizeUsernameInput(rawInput);
  if (!cleaned) {
    return { valid: false, error: "Username is required" };
  }
  if (cleaned.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (cleaned.length > 30) {
    return { valid: false, error: "Username cannot exceed 30 characters" };
  }
  if (!/^[a-z0-9._]+$/.test(cleaned)) {
    return { valid: false, error: "Only letters, numbers, periods, and underscores allowed" };
  }
  if (cleaned.startsWith(".") || cleaned.startsWith("_")) {
    return { valid: false, error: "Username cannot start with a period or underscore" };
  }
  if (cleaned.endsWith(".") || cleaned.endsWith("_")) {
    return { valid: false, error: "Username cannot end with a period or underscore" };
  }
  if (cleaned.includes("..")) {
    return { valid: false, error: "Username cannot contain consecutive periods" };
  }
  return { valid: true };
}

export async function checkUsernameAvailability(
  rawUsername: string,
  currentUserId?: string
): Promise<{ available: boolean; error?: string }> {
  const formatCheck = validateUsernameFormat(rawUsername);
  if (!formatCheck.valid) {
    return { available: false, error: formatCheck.error };
  }

  const normalized = normalizeUsernameInput(rawUsername);
  const client = getSupabaseClient();
  if (!client) {
    return { available: true };
  }

  try {
    let query = client
      .from("profiles")
      .select("id, username")
      .ilike("username", normalized);

    if (currentUserId) {
      query = query.neq("id", currentUserId);
    }

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== "PGRST116") {
      return { available: true };
    }

    if (data) {
      return { available: false, error: `@${normalized} is already taken` };
    }

    return { available: true };
  } catch {
    return { available: true };
  }
}

export function findUserByUsername(
  rawUsernameOrUrl: string,
  extraUsers: PublicUserProfile[] = [],
  currentUser?: UserProfile
): PublicUserProfile | null {
  const normalized = normalizeUsernameInput(rawUsernameOrUrl);
  if (!normalized) return null;

  if (currentUser) {
    const userHandle = (currentUser.username || "").toLowerCase();
    const userEmail = (currentUser.email || "").toLowerCase();
    const userName = (currentUser.fullName || "").toLowerCase();
    if (userHandle === normalized || userEmail === normalized || userName === normalized) {
      return {
        id: currentUser.id,
        name: currentUser.fullName,
        username: currentUser.username || normalized,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl || "",
        netBalance: 0,
        groupCount: 0,
        addedVia: "link",
      };
    }
  }

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

export async function fetchUserProfileFromDatabase(
  rawUsernameOrUrl: string
): Promise<PublicUserProfile | null> {
  const normalized = normalizeUsernameInput(rawUsernameOrUrl);
  if (!normalized) return null;

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: byUsername } = await client
      .from("profiles")
      .select("*")
      .ilike("username", normalized)
      .maybeSingle();

    const record = byUsername || null;

    if (!record) {
      const { data: byId } = await client
        .from("profiles")
        .select("*")
        .eq("id", normalized)
        .maybeSingle();

      if (byId) {
        return mapDatabaseProfile(byId, normalized);
      }

      const { data: byEmail } = await client
        .from("profiles")
        .select("*")
        .ilike("email", normalized)
        .maybeSingle();

      if (byEmail) {
        return mapDatabaseProfile(byEmail, normalized);
      }

      if (rawUsernameOrUrl.includes("@") && rawUsernameOrUrl.includes(".")) {
        const cleanEmail = rawUsernameOrUrl.trim().toLowerCase();
        const prefix = cleanEmail.split("@")[0] || "user";
        const displayName = prefix
          .split(/[._-]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
        const handle = prefix.toLowerCase().replace(/[^a-z0-9]/g, ".");
        return {
          id: `stub-${cleanEmail}`,
          name: displayName,
          username: handle,
          email: cleanEmail,
          avatarUrl: `https://www.gravatar.com/avatar/${handle}?s=160&d=mp`,
          netBalance: 0,
          groupCount: 0,
          addedVia: "directory",
        };
      }

      return null;
    }

    return mapDatabaseProfile(record, normalized);
  } catch {
    return null;
  }
}

function mapDatabaseProfile(data: Record<string, any>, fallbackUsername: string): PublicUserProfile {
  return {
    id: data.id,
    name: data.full_name || data.username || "User",
    username: data.username || fallbackUsername,
    email: data.email || "",
    avatarUrl: data.avatar_url || "",
    bio: data.bio || undefined,
    netBalance: 0,
    groupCount: 0,
    addedVia: "directory",
    memberSince: data.created_at
      ? new Date(data.created_at).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        })
      : undefined,
  };
}

export function buildProfileShareUrl(username: string): string {
  const normalized = normalizeUsernameInput(username);
  if (typeof window !== "undefined") {
    return `${window.location.origin}/u/${normalized}`;
  }
  return `https://splitest.thenicedev.xyz/u/${normalized}`;
}
