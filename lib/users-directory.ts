import { FriendContact } from "@/types";

export interface PublicUserProfile extends FriendContact {
  bio?: string;
  location?: string;
  memberSince?: string;
}

export const PRESET_USERS_DIRECTORY: PublicUserProfile[] = [
  {
    id: "user-alex-rivera",
    name: "Alex Rivera",
    username: "alex.rivera",
    email: "alex@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=160&q=80",
    bio: "Digital nomad, trip coordinator & shared expenses enthusiast",
    location: "Bali / Singapore",
    memberSince: "Joined Sep 2024",
  },
  {
    id: "user-maya-chen",
    name: "Maya Chen",
    username: "maya.chen",
    email: "maya@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80",
    bio: "Photographer & foodie. Always ready for group dinners and adventures",
    location: "Tokyo / Taipei",
    memberSince: "Joined Aug 2024",
  },
  {
    id: "user-liam-vance",
    name: "Liam Vance",
    username: "liam.vance",
    email: "liam@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
    bio: "Software developer, trail runner, and roommate organizer",
    location: "San Francisco, CA",
    memberSince: "Joined Jan 2025",
  },
  {
    id: "user-sophia-taylor",
    name: "Sophia Taylor",
    username: "sophia.taylor",
    email: "sophia@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    bio: "UX Designer & weekend traveler. Keeping tabs fair and clear",
    location: "London, UK",
    memberSince: "Joined Mar 2025",
  },
  {
    id: "user-chloe-patel",
    name: "Chloe Patel",
    username: "chloe.patel",
    email: "chloe@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=80",
    bio: "Fintech specialist & apartment ledger manager",
    location: "New York, NY",
    memberSince: "Joined Nov 2024",
  },
  {
    id: "user-sarah-jenkins",
    name: "Sarah Jenkins",
    username: "sarah.jenkins",
    email: "sarah@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
    bio: "Apartment 4B co-tenant & coffee lover",
    location: "Brooklyn, NY",
    memberSince: "Joined Feb 2025",
  },
  {
    id: "user-marcus-brody",
    name: "Marcus Brody",
    username: "marcus.brody",
    email: "marcus@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    bio: "Audio engineer & festival camper",
    location: "Austin, TX",
    memberSince: "Joined May 2025",
  },
  {
    id: "user-elena-rostova",
    name: "Elena Rostova",
    username: "elena.rostova",
    email: "elena@example.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80",
    bio: "Architect & European roadtrip explorer",
    location: "Berlin, Germany",
    memberSince: "Joined Jun 2025",
  },
];

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
  extraUsers: PublicUserProfile[] = []
): PublicUserProfile | null {
  const normalized = normalizeUsernameInput(rawUsernameOrUrl);
  if (!normalized) return null;

  const combined = [...PRESET_USERS_DIRECTORY, ...extraUsers];

  const exactMatch = combined.find(
    (u) =>
      u.username.toLowerCase() === normalized ||
      (u.email ? u.email.toLowerCase() === normalized : false) ||
      u.name.toLowerCase() === normalized
  );

  if (exactMatch) return exactMatch;

  const partialMatch = combined.find(
    (u) =>
      u.username.toLowerCase().includes(normalized) ||
      u.name.toLowerCase().includes(normalized)
  );

  return partialMatch || null;
}

export function buildProfileShareUrl(username: string): string {
  const normalized = normalizeUsernameInput(username);
  if (typeof window !== "undefined") {
    return `${window.location.origin}/u/${normalized}`;
  }
  return `https://splitest.app/u/${normalized}`;
}
