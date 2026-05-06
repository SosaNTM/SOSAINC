export function coldSkipKey(portalId: string): string {
  return `leadgen_skipped_${portalId}`;
}

export function followUpSkipKey(portalId: string): string {
  return `leadgen_followup_skipped_${portalId}`;
}

export function getSkipMap(key: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); }
  catch { return {}; }
}

export function saveSkipMap(key: string, map: Record<string, number>): void {
  try { localStorage.setItem(key, JSON.stringify(map)); } catch { /**/ }
}
