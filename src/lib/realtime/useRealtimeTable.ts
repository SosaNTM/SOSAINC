/**
 * useRealtimeTable — subscribes to Supabase Postgres Changes for a given table.
 * Calls `onInsert`, `onUpdate`, `onDelete` when rows change in the portal.
 *
 * Usage:
 *   useRealtimeTable("financial_goals", portalId, {
 *     onInsert: (row) => setGoals(prev => [row, ...prev]),
 *     onUpdate: (row) => setGoals(prev => prev.map(g => g.id === row.id ? row : g)),
 *     onDelete: (id)  => setGoals(prev => prev.filter(g => g.id !== id)),
 *   });
 */

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";

export interface RealtimeTableCallbacks<T extends { id: string }> {
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (id: string) => void;
}

/**
 * Subscribe to Postgres Changes for `table` filtered to a specific portal.
 * Returns a cleanup function — use in useEffect.
 */
export function subscribeRealtimeTable<T extends { id: string }>(
  table: string,
  portalId: string,
  callbacks: RealtimeTableCallbacks<T>,
): () => void {
  const portalUUID = toPortalUUID(portalId);
  const channelName = `rt-${table}-${portalUUID}-${Math.random().toString(36).slice(2, 8)}`;

  const channel = supabase
    .channel(channelName)
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table,
        filter: `portal_id=eq.${portalUUID}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => callbacks.onInsert?.(payload.new as T),
    )
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "UPDATE",
        schema: "public",
        table,
        filter: `portal_id=eq.${portalUUID}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => callbacks.onUpdate?.(payload.new as T),
    )
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "DELETE",
        schema: "public",
        table,
        filter: `portal_id=eq.${portalUUID}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => callbacks.onDelete?.((payload.old as { id: string }).id),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/**
 * React hook that subscribes to Postgres Changes for a table.
 * Automatically re-subscribes when `portalId` changes.
 * Cleans up the channel on unmount.
 */
export function useRealtimeTable<T extends { id: string }>(
  table: string,
  portalId: string,
  callbacks: RealtimeTableCallbacks<T>,
): void {
  useEffect(() => {
    const cleanup = subscribeRealtimeTable(table, portalId, callbacks);
    return cleanup;
    // callbacks reference is intentionally excluded — callers should memoize with useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, portalId]);
}
