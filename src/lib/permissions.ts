import { useAuth } from "./authContext";
import { usePortalDB } from "./portalContextDB";

export type Role = "owner" | "admin" | "manager" | "member" | "viewer";

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 100,
  admin: 75,
  manager: 50,
  member: 25,
  viewer: 10,
};

export const PERMISSIONS: Record<string, Role[]> = {
  // PROFILES
  "profile:view_own": ["owner", "admin", "manager", "member"],
  "profile:edit_own": ["owner", "admin", "manager", "member"],
  "profile:view_others": ["owner", "admin", "manager"],
  "profile:edit_others": ["owner"],

  // NOTES
  "notes:view_own": ["owner", "admin", "manager", "member"],
  "notes:create": ["owner", "admin", "manager", "member"],
  "notes:view_others": ["owner"],

  // TASKS
  "tasks:view_own": ["owner", "admin", "manager", "member"],
  "tasks:create": ["owner", "admin", "manager", "member"],
  "tasks:assign": ["owner", "admin", "manager", "member"],
  "tasks:delete": ["owner", "admin"],
  "tasks:view_all": ["owner", "admin", "manager", "member"],

  // CLOUD
  "cloud:view": ["owner", "admin", "manager", "member"],
  "cloud:upload": ["owner", "admin", "manager", "member"],
  "cloud:create_folder": ["owner", "admin", "manager", "member"],
  "cloud:delete": ["owner", "admin"],
  "cloud:manage_permissions": ["owner", "admin"],

  // VAULT
  "vault:view": ["owner", "admin", "member"],
  "vault:create": ["owner", "admin", "member"],
  "vault:manage": ["owner"],

  // GOALS
  "goals:view_own": ["owner", "admin", "manager", "member"],
  "goals:create": ["owner"],
  "goals:edit": ["owner"],
  "goals:assign": ["owner"],

  // FISCAL DATA & CV
  "fiscal:view_own": ["owner", "admin", "manager", "member"],
  "fiscal:edit_own": ["owner", "admin", "manager", "member"],
  "fiscal:view_others": ["owner"],
  "cv:view_own": ["owner", "admin", "manager", "member"],
  "cv:upload_own": ["owner", "admin", "manager", "member"],
  "cv:view_others": ["owner", "admin"],

  // FINANCE
  "finance:view": ["owner", "admin", "manager"],
  "finance:edit": ["owner", "admin"],

  // INVOICES
  "invoices:view": ["owner", "admin", "manager"],
  "invoices:create": ["owner", "admin"],
  "invoices:delete": ["owner"],

  // ADMINISTRATION
  "admin:access": ["owner", "admin"],
  "admin:manage_users": ["owner"],
  "admin:manage_roles": ["owner"],
  "admin:view_audit_log": ["owner", "admin"],

  // SETTINGS
  "settings:view": ["owner", "admin", "manager", "member"],
  "settings:edit_company": ["owner", "admin"],

  // SOCIAL
  "social:view": ["owner", "admin", "manager"],
  "social:manage": ["owner", "admin"],
};

export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  const { userRole } = usePortalDB();
  if (!user) return false;
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  // Source of truth: portal_members.role for the current portal.
  // Fall back to JWT meta role only outside any portal context (unlikely).
  const effectiveRole = (userRole ?? user.role) as Role;
  return allowedRoles.includes(effectiveRole);
}
