import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const REQUIRED_TABLES = ["notes", "note_folders", "cloud_folders", "cloud_files"] as const;

export function useSchemaCheck() {
  useEffect(() => {
    async function check() {
      const missing: string[] = [];
      await Promise.all(
        REQUIRED_TABLES.map(async (table) => {
          const { error } = await supabase.from(table).select("id").limit(1);
          if (error?.message?.includes("does not exist") || error?.code === "42P01") {
            missing.push(table);
          }
        })
      );
      if (missing.length > 0) {
        toast.error(`DB migrations missing: ${missing.join(", ")}. Contact your admin.`, {
          duration: Infinity,
          id: "schema-check",
        });
      }
    }
    void check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
