// ── Leadgen skip tracking — in-memory only ───────────────────────────────────
// Per-portal map of leadId → skip timestamp. Ephemeral UI state used to hide
// leads the user clicked "skip" on for COLD_SKIP_TTL_MS. Lost on page reload
// by design — keeps state out of localStorage and out of Supabase.

export function coldSkipKey(portalId: string): string {
  return `cold:${portalId}`;
}

export function followUpSkipKey(portalId: string): string {
  return `followup:${portalId}`;
}

const _store: Map<string, Record<string, number>> = new Map();

export function getSkipMap(key: string): Record<string, number> {
  return _store.get(key) ?? {};
}

export function saveSkipMap(key: string, map: Record<string, number>): void {
  _store.set(key, map);
}
