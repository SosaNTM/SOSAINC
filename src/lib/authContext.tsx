import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { addAuditEntry } from "./adminStore";
import {
  signInWithEmail,
  signOut as supabaseSignOut,
  onAuthStateChange,
  getUserPortalIds,
} from "@/lib/supabaseAuth";

// MOCK AUTH — DEVELOPMENT ONLY
// See src/lib/supabaseAuth.ts for the production auth module.
// Migration guide is in that file's header comment.
// Set VITE_USE_REAL_AUTH=true to switch to real Supabase Auth.

const USE_REAL_AUTH = import.meta.env.VITE_USE_REAL_AUTH === "true";

export type PortalId = "sosa" | "keylo" | "redx" | "trustme";
export const ALL_PORTAL_IDS: PortalId[] = ["sosa", "keylo", "redx", "trustme"];

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
  role: "owner" | "admin" | "manager" | "member";
  bio: string;
  createdAt: Date;
  /** Which portals this user can access. Owners have access to all. */
  portalAccess: PortalId[];
}

interface MockUser extends User {
  password: string;
}

const MOCK_USERS: MockUser[] = [
  {
    id: "usr_001", email: "owner@iconoff.com",
    password: import.meta.env.VITE_MOCK_PASSWORD_OWNER || "dev_only_owner",
    displayName: "Alessandro", role: "owner", avatar: null, bio: "Founder & CEO",
    createdAt: new Date("2024-01-01"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_002", email: "admin@iconoff.com",
    password: import.meta.env.VITE_MOCK_PASSWORD_ADMIN || "dev_only_admin",
    displayName: "Marco", role: "admin", avatar: null, bio: "Operations Manager",
    createdAt: new Date("2024-02-15"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_003", email: "sara@iconoff.com",
    password: import.meta.env.VITE_MOCK_PASSWORD_SARA || "dev_only_sara",
    displayName: "Sara", role: "member", avatar: null, bio: "Marketing Specialist",
    createdAt: new Date("2024-03-10"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_004", email: "elena@iconoff.com",
    password: import.meta.env.VITE_MOCK_PASSWORD_ELENA || "dev_only_elena",
    displayName: "Elena", role: "member", avatar: null, bio: "Designer",
    createdAt: new Date("2024-04-20"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_005", email: "denis@iconoff.com",
    password: import.meta.env.VITE_MOCK_PASSWORD_DENIS || "dev_only_denis",
    displayName: "Denis", role: "owner", avatar: null, bio: "",
    createdAt: new Date("2025-02-26"), portalAccess: [...ALL_PORTAL_IDS],
  },
];

// Export user list without passwords for profile lookups
export const ALL_USERS: User[] = MOCK_USERS.map(({ password, ...u }) => u);

export function getUserById(id: string): User | undefined {
  return ALL_USERS.find((u) => u.id === id);
}

/** Check if a user has access to a given portal. */
export function userCanAccessPortal(user: User | null, portalId: string): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  return user.portalAccess.includes(portalId as PortalId);
}

/** Delete a user account permanently. Returns false if user is an owner. */
export function deleteUser(userId: string): { success: boolean; error?: string } {
  const idx = MOCK_USERS.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: "User not found." };
  if (MOCK_USERS[idx].role === "owner") return { success: false, error: "Owner accounts cannot be deleted." };
  MOCK_USERS.splice(idx, 1);
  const pubIdx = ALL_USERS.findIndex(u => u.id === userId);
  if (pubIdx !== -1) ALL_USERS.splice(pubIdx, 1);
  return { success: true };
}

/** Reset a user's password. */
export function resetUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
  if (newPassword.length < 6) return { success: false, error: "Password must be at least 6 characters." };
  const idx = MOCK_USERS.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: "User not found." };
  MOCK_USERS[idx].password = newPassword;
  return { success: true };
}

/** Update a user's portal access (by owner/admin). */
export function updateUserPortalAccess(userId: string, portalAccess: PortalId[]) {
  const mockIdx = MOCK_USERS.findIndex(u => u.id === userId);
  if (mockIdx !== -1) MOCK_USERS[mockIdx].portalAccess = portalAccess;
  const pubIdx = ALL_USERS.findIndex(u => u.id === userId);
  if (pubIdx !== -1) ALL_USERS[pubIdx].portalAccess = portalAccess;
}

/** Create a new user account (admin only — no public signup). */
export function createUser(params: {
  displayName: string;
  email: string;
  password: string;
  role: User["role"];
  bio?: string;
  portalAccess?: PortalId[];
}): { success: boolean; error?: string } {
  const emailTaken = MOCK_USERS.some(u => u.email.toLowerCase() === params.email.toLowerCase());
  if (emailTaken) return { success: false, error: "Email already in use." };
  const newUser: MockUser = {
    id: `usr_${Date.now()}`,
    email: params.email.trim().toLowerCase(),
    password: params.password,
    displayName: params.displayName.trim(),
    role: params.role,
    avatar: null,
    bio: params.bio?.trim() ?? "",
    createdAt: new Date(),
    portalAccess: params.portalAccess ?? [],
  };
  MOCK_USERS.push(newUser);
  const { password: _, ...pub } = newUser;
  ALL_USERS.push(pub);
  return { success: true };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

import { STORAGE_AUTH_USER, STORAGE_LAST_LOGIN_PREFIX } from "@/constants/storageKeys";

const STORAGE_KEY = STORAGE_AUTH_USER;

function getStoredUser(): User | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (USE_REAL_AUTH) {
      // Real auth: trust persisted portalAccess. Source of truth is portal_members in DB.
      return { ...parsed, createdAt: new Date(parsed.createdAt), portalAccess: parsed.portalAccess ?? [] };
    }
    // Mock auth: re-sync portalAccess from MOCK_USERS in case it was updated this session
    const live = MOCK_USERS.find(u => u.id === parsed.id);
    return { ...parsed, createdAt: new Date(parsed.createdAt), portalAccess: live?.portalAccess ?? parsed.portalAccess ?? ALL_PORTAL_IDS };
  } catch (err) {
    console.warn("Failed to parse stored user:", err);
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    setIsLoading(false);
  }, []);

  // Real Supabase Auth — listen for external sign-out and token expiry
  useEffect(() => {
    if (!USE_REAL_AUTH) return;

    const unsub = onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    });

    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    if (USE_REAL_AUTH) {
      const { user: supaUser } = await signInWithEmail(email, password);
      if (!supaUser) throw new Error("Login failed");

      const portalIds = await getUserPortalIds(supaUser.id);

      const meta = supaUser.user_metadata ?? {};
      const userData: User = {
        id: supaUser.id,
        email: supaUser.email ?? "",
        displayName:
          (meta.full_name as string | undefined) ??
          (meta.name as string | undefined) ??
          (meta.display_name as string | undefined) ??
          (supaUser.email ? supaUser.email.split("@")[0] : ""),
        role: ((meta.role as User["role"] | undefined) ?? "member"),
        portalAccess: portalIds.length > 0 ? (portalIds as PortalId[]) : [...ALL_PORTAL_IDS],
        avatar: (meta.avatar_url as string | undefined) ?? null,
        bio: (meta.bio as string | undefined) ?? "",
        createdAt: new Date(supaUser.created_at),
      };

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(userData));
      storage.setItem(`${STORAGE_LAST_LOGIN_PREFIX}${userData.id}`, new Date().toISOString());
      setUser(userData);
      addAuditEntry({
        userId: userData.id,
        action: "Logged in",
        category: "auth",
        details: `Successful login — ${remember ? "remembered session" : "session only"}`,
        icon: "👤",
      });
      return;
    }

    // Mock auth path
    await new Promise((r) => setTimeout(r, 800));
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) throw new Error("Invalid email or password");
    const { password: _, ...userData } = found;
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(userData));
    const timestampStorage = remember ? localStorage : sessionStorage;
    timestampStorage.setItem(`${STORAGE_LAST_LOGIN_PREFIX}${found.id}`, new Date().toISOString());
    setUser(userData);
    addAuditEntry({
      userId: found.id,
      action: "Logged in",
      category: "auth",
      details: `Successful login — ${remember ? "remembered session" : "session only"}`,
      icon: "👤",
    });
  }, []);

  const logout = useCallback(() => {
    if (USE_REAL_AUTH) {
      supabaseSignOut().catch(() => {});
    }
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || "null");
    if (stored?.id) {
      addAuditEntry({
        userId: stored.id,
        action: "Logged out",
        category: "auth",
        details: "Session ended",
        icon: "🚪",
      });
    }
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Get the last login timestamp for a user. */
export function getLastLogin(userId: string): Date | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_LAST_LOGIN_PREFIX}${userId}`)
      || sessionStorage.getItem(`${STORAGE_LAST_LOGIN_PREFIX}${userId}`);
    return stored ? new Date(stored) : null;
  } catch {
    return null;
  }
}
