import { useEffect } from "react";
import { usePortal } from "@/lib/portalContext";
import { runMigration } from "@/lib/migration/migrateLocalToSupabase";
import { supabase } from "@/lib/supabase";

export function useMigration(): void {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  useEffect(() => {
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
