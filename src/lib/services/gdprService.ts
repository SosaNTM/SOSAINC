import { supabase } from "@/lib/supabase";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1`;

async function getJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function exportUserData(): Promise<void> {
  const jwt = await getJwt();
  if (!jwt) throw new Error("Non autenticato");

  const res = await fetch(`${FUNCTIONS_URL}/gdpr-export`, {
    method: "GET",
    headers: { Authorization: `Bearer ${jwt}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Errore ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sosa-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function deleteAccount(): Promise<void> {
  const jwt = await getJwt();
  if (!jwt) throw new Error("Non autenticato");

  const res = await fetch(`${FUNCTIONS_URL}/gdpr-delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Errore ${res.status}`);
  }
}
