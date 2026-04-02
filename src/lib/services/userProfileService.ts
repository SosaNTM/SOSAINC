import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { DbUserProfile, DbUserPreferences, UpdateDbUserProfile } from "@/types/database";

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<DbUserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return data ?? null;
  } catch {
    return null;
  }
}

export async function upsertProfile(
  userId: string,
  updates: UpdateDbUserProfile,
): Promise<DbUserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({ id: userId, ...updates })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function fetchPreferences(
  userId: string,
  portalId: string,
): Promise<DbUserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("portal_id", toPortalUUID(portalId))
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  } catch {
    return null;
  }
}

export async function upsertPreferences(
  userId: string,
  portalId: string,
  prefs: Partial<Omit<DbUserPreferences, "id" | "user_id" | "portal_id" | "created_at" | "updated_at">>,
): Promise<DbUserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(
        { user_id: userId, portal_id: toPortalUUID(portalId), ...prefs },
        { onConflict: "user_id,portal_id" },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}
