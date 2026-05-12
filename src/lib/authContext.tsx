import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { addAuditEntry } from "./adminStore";
import {
  signInWithEmail,
  signOut as supabaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChange,
  getUserPortalIds,
} from "@/lib/supabaseAuth";
import { STORAGE_AUTH_USER, STORAGE_LAST_LOGIN_PREFIX } from "@/constants/storageKeys";

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
  portalAccess: PortalId[];
}

// Static directory for UI member pickers (assignees, mentions).
// No passwords — display data only.
// TODO: replace with live portal_members Supabase query once assignee pickers are wired.
export const ALL_USERS: User[] = [
  {
    id: "usr_001", email: "owner@sosainc.com",
    displayName: "Alessandro", role: "owner", avatar: null, bio: "Founder & CEO",
    createdAt: new Date("2024-01-01"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_002", email: "admin@sosainc.com",
    displayName: "Marco", role: "admin", avatar: null, bio: "Operations Manager",
    createdAt: new Date("2024-02-15"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_003", email: "sara@sosainc.com",
    displayName: "Sara", role: "member", avatar: null, bio: "Marketing Specialist",
    createdAt: new Date("2024-03-10"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_004", email: "elena@sosainc.com",
    displayName: "Elena", role: "member", avatar: null, bio: "Designer",
    createdAt: new Date("2024-04-20"), portalAccess: [...ALL_PORTAL_IDS],
  },
  {
    id: "usr_005", email: "denis@sosainc.com",
    displayName: "Denis", role: "owner", avatar: null, bio: "",
    createdAt: new Date("2025-02-26"), portalAccess: [...ALL_PORTAL_IDS],
  },
];

export function getUserById(id: string): User | undefined {
  return ALL_USERS.find((u) => u.id === id);
}

export function userCanAccessPortal(user: User | null, portalId: string): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  return user.portalAccess.includes(portalId as PortalId);
}

// ── User management stubs ────────────────────────────────────────────────────
// Full implementation requires a server-side Edge Function with service_role key.
// Until then, direct admins to Supabase Dashboard → Authentication.

export function deleteUser(_userId: string): { success: boolean; error?: string } {
  return { success: false, error: "Usa Supabase Dashboard → Authentication → Users per eliminare utenti." };
}

export function resetUserPassword(userId: string, _newPassword: string): { success: boolean; error?: string } {
  const user = ALL_USERS.find((u) => u.id === userId);
  if (!user) return { success: false, error: "Utente non trovato." };
  // Fire-and-forget — sends a password reset email via Supabase Auth
  sendPasswordResetEmail(user.email).catch(() => {});
  return { success: true };
}

export function updateUserPortalAccess(userId: string, portalAccess: PortalId[]) {
  const idx = ALL_USERS.findIndex((u) => u.id === userId);
  if (idx !== -1) ALL_USERS[idx].portalAccess = portalAccess;
}

export function createUser(params: {
  displayName: string;
  email: string;
  password: string;
  role: User["role"];
  bio?: string;
  portalAccess?: PortalId[];
}): { success: boolean; error?: string } {
  return {
    success: false,
    error: "Creazione utenti richiede Supabase Dashboard → Authentication → Users. Crea l'account lì, poi assegna il ruolo via portal_members.",
  };
}

// ── Dev-only mock auth (tree-shaken out of production builds) ─────────────────
const DEV_USERS = import.meta.env.DEV ? [
  { email: "owner@sosainc.com",  password: "dev123", id: "usr_001", displayName: "Alessandro", role: "owner"  as const, avatar: null, bio: "Founder & CEO",        createdAt: new Date("2024-01-01"), portalAccess: [...ALL_PORTAL_IDS] },
  { email: "admin@sosainc.com",  password: "dev123", id: "usr_002", displayName: "Marco",      role: "admin"  as const, avatar: null, bio: "Operations Manager",   createdAt: new Date("2024-02-15"), portalAccess: [...ALL_PORTAL_IDS] },
  { email: "sara@sosainc.com",   password: "dev123", id: "usr_003", displayName: "Sara",       role: "member" as const, avatar: null, bio: "Marketing Specialist", createdAt: new Date("2024-03-10"), portalAccess: [...ALL_PORTAL_IDS] },
] : [];

// ── Auth Context ─────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = STORAGE_AUTH_USER;

function getStoredUser(): User | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as User & { createdAt: string };
    return { ...parsed, createdAt: new Date(parsed.createdAt), portalAccess: parsed.portalAccess ?? [] };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    setIsLoading(false);
  }, []);

  useEffect(() => {
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
    // Dev-only shortcut — eliminated from production bundle by Vite
    if (import.meta.env.DEV) {
      const mock = DEV_USERS.find(u => u.email === email && u.password === password);
      if (mock) {
        const { password: _, ...userData } = mock;
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEY, JSON.stringify(userData));
        setUser(userData);
        return;
      }
    }

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
  }, []);

  const logout = useCallback(() => {
    supabaseSignOut().catch(() => {});
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as { id?: string }) : null;
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

export function getLastLogin(userId: string): Date | null {
  try {
    const stored =
      localStorage.getItem(`${STORAGE_LAST_LOGIN_PREFIX}${userId}`) ||
      sessionStorage.getItem(`${STORAGE_LAST_LOGIN_PREFIX}${userId}`);
    return stored ? new Date(stored) : null;
  } catch {
    return null;
  }
}
