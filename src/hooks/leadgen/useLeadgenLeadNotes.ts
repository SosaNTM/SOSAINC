import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenLeadNote } from "@/types/leadgen";

export function useLeadgenLeadNotes(leadId: string | undefined) {
  const { currentPortalId } = usePortalDB();
  const [notes, setNotes] = useState<LeadgenLeadNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!leadId || !currentPortalId) { setLoading(false); return; }
    const { data } = await supabase
      .from("leadgen_lead_notes")
      .select("*")
      .eq("lead_id", leadId)
      .eq("portal_id", currentPortalId)
      .order("created_at", { ascending: false });
    setNotes((data ?? []) as LeadgenLeadNote[]);
    setLoading(false);
  }, [leadId, currentPortalId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addNote = useCallback(async (content: string) => {
    if (!leadId || !currentPortalId) return { error: "Nessun portale" };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non autenticato" };
    const { data, error } = await supabase
      .from("leadgen_lead_notes")
      .insert({ portal_id: currentPortalId, lead_id: leadId, author_id: user.id, content })
      .select()
      .single();
    if (!error && data) setNotes((prev) => [data as LeadgenLeadNote, ...prev]);
    return { error: error?.message ?? null };
  }, [leadId, currentPortalId]);

  const deleteNote = useCallback(async (noteId: string) => {
    const { error } = await supabase.from("leadgen_lead_notes").delete().eq("id", noteId);
    if (!error) setNotes((prev) => prev.filter((n) => n.id !== noteId));
    return { error: error?.message ?? null };
  }, []);

  const updateNote = useCallback(async (noteId: string, content: string) => {
    if (!currentPortalId) return { error: "Nessun portale" };
    const { error } = await supabase
      .from("leadgen_lead_notes")
      .update({ content })
      .eq("id", noteId)
      .eq("portal_id", currentPortalId);
    if (!error) setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, content } : n));
    return { error: error?.message ?? null };
  }, [currentPortalId]);

  return { notes, loading, addNote, deleteNote, updateNote };
}
