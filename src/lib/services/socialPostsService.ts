import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { DbSocialPost, NewDbSocialPost } from "@/types/database";

export async function fetchPosts(
  portalId: string,
  status?: DbSocialPost["status"],
): Promise<DbSocialPost[]> {
  try {
    let query = supabase
      .from("social_posts")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function fetchScheduledPosts(portalId: string): Promise<DbSocialPost[]> {
  try {
    const { data, error } = await supabase
      .from("social_posts")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createPost(
  post: Omit<NewDbSocialPost, "portal_id">,
  portalId: string,
): Promise<DbSocialPost | null> {
  try {
    const { data, error } = await supabase
      .from("social_posts")
      .insert({ ...post, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function updatePost(
  id: string,
  updates: Partial<DbSocialPost>,
  portalId?: string,
): Promise<DbSocialPost | null> {
  try {
    let q = supabase.from("social_posts").update(updates).eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { data, error } = await q.select().single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deletePost(id: string, portalId?: string): Promise<boolean> {
  try {
    let q = supabase.from("social_posts").update({ status: "deleted" }).eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { error } = await q;
    return !error;
  } catch {
    return false;
  }
}

export async function publishPost(id: string, portalId?: string): Promise<boolean> {
  try {
    let q = supabase
      .from("social_posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { error } = await q;
    return !error;
  } catch {
    return false;
  }
}
