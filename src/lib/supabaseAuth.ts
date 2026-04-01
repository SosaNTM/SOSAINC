/**
 * REAL SUPABASE AUTH MODULE
 *
 * This module replaces the mock auth system in authContext.tsx.
 *
 * MIGRATION STEPS:
 * 1. Enable Email provider in Supabase Auth settings
 * 2. Set VITE_USE_REAL_AUTH=true in .env
 * 3. Create initial users via Supabase dashboard or seed script
 * 4. Update authContext.tsx to use these functions instead of MOCK_USERS lookup
 * 5. Remove mock user array and hardcoded portal fallbacks
 */
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signUp(
  email: string,
  password: string,
  metadata?: { full_name?: string; portal_id?: string; role?: string }
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

/**
 * Get portal_id for the authenticated user from portal_members table.
 * Call this after successful login to resolve which portals the user belongs to.
 */
export async function getUserPortalIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("portal_members")
    .select("portal_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row: { portal_id: string }) => row.portal_id);
}
