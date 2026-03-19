import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { addAuditEntry } from "./adminStore";

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
    id: "usr_001", email: "owner@iconoff.com", password: "owner123",
    displayName: "Alessandro", role: "owner", avatar: null, bio: "Founder & CEO",
    createdAt: new Date("2024-01-01"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_002", email: "admin@iconoff.com", password: "admin123",
    displayName: "Marco", role: "admin", avatar: null, bio: "Operations Manager",
    createdAt: new Date("2024-02-15"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_003", email: "sara@iconoff.com", password: "sara123",
    displayName: "Sara", role: "member", avatar: null, bio: "Marketing Specialist",
    createdAt: new Date("2024-03-10"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_004", email: "elena@iconoff.com", password: "elena123",
    displayName: "Elena", role: "member", avatar: null, bio: "Designer",
    createdAt: new Date("2024-04-20"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_005", email: "denis@iconoff.com", password: "Parola!1603",
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

const STORAGE_KEY = "iconoff_auth_user";

function getStoredUser(): User | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Re-sync portalAccess from MOCK_USERS in case it was updated this session
      const live = MOCK_USERS.find(u => u.id === parsed.id);
      return { ...parsed, createdAt: new Date(parsed.createdAt), portalAccess: live?.portalAccess ?? parsed.portalAccess ?? ALL_PORTAL_IDS };
    }
  } catch {}
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

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    await new Promise((r) => setTimeout(r, 800));
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) throw new Error("Invalid email or password");
    const { password: _, ...userData } = found;
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(`iconoff_last_login_${found.id}`, new Date().toISOString());
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
    const stored = localStorage.getItem(`iconoff_last_login_${userId}`);
    return stored ? new Date(stored) : null;
  } catch {
    return null;
  }
}
