import { usePortalMembers } from "@/hooks/usePortalMembers";
import type { User } from "@/lib/authContext";

// Maps live portal_members → User[] shape used by pickers throughout the app.
// Replaces ALL_USERS static mock. Falls back to empty array while loading.
export function usePortalUsers(): { users: User[]; loading: boolean } {
  const { members, loading } = usePortalMembers();

  const users: User[] = members.map((m) => ({
    id: m.user_id,
    email: m.email,
    displayName: m.display_name || m.email,
    avatar: m.avatar_url,
    role: (["owner", "admin", "manager", "member"].includes(m.role) ? m.role : "member") as User["role"],
    bio: "",
    createdAt: new Date(),
    portalAccess: [],
  }));

  return { users, loading };
}
