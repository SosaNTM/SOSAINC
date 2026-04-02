/**
 * useMigration — runs the one-time localStorage→Supabase migration for the current user+portal.
 * Only activates when VITE_USE_REAL_AUTH=true (real Supabase session available).
 * Safe to include in every app render — skips immediately if already done.
 */

import { useEffect } from "react";
import { usePortal } from "@/lib/portalContext";
import { runMigration } from "@/lib/migration/migrateLocalToSupabase";
import { supabase } from "@/lib/supabase";

const USE_REAL_AUTH = import.meta.env.VITE_USE_REAL_AUTH === "true";

export function useMigration(): void {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  useEffect(() => {
    if (!USE_REAL_AUTH) return; // Skip in mock auth mode

    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) return;
      const userId = data.user.id;

      runMigration(userId, portalId).then((result) => {
        if (!result) return; // already migrated
        const total = result.transactions + result.goals + result.investments + result.budgetLimits;
        if (total > 0) {
          // eslint-disable-next-line no-console
          console.info(`[Migration] ${portalId}: migrated ${total} records to Supabase`, result);
        }
        if (result.errors.length > 0) {
          console.warn(`[Migration] ${portalId}: ${result.errors.length} errors`, result.errors);
        }
      }).catch((err) => {
        console.warn("[Migration] Failed:", err);
      });
    });
  }, [portalId]);
}
