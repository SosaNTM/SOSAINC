export type VaultItemType = "credential" | "api_key" | "document" | "note";

export interface VaultItem {
  id: string;
  type: VaultItemType;
  name: string;
  category: string;
  isLocked: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date | null;
  expiresAt: Date | null;
  credential?: { username: string; password: string; url: string; notes: string };
  apiKey?: { key: string; service: string; environment: string; notes: string };
  document?: { filename: string; size: number; mimeType: string; data?: string };
  note?: { content: string };
}

function d(daysAgo: number, h = 10): Date {
  const dt = new Date(); dt.setDate(dt.getDate() - daysAgo); dt.setHours(h, 0, 0, 0); return dt;
}

export const LOCKED_FOLDER_PASSWORD = "vault2025";

// ── SEED DATA PER PORTAL ─────────────────────────────────────────────────────

const SEED_VAULT: Record<string, VaultItem[]> = {
  sosa: [],
  keylo: [],
  redx: [],
  trustme: [],
};

// ── STORE STATE ───────────────────────────────────────────────────────────────

let _portal = "sosa";
const _dataByPortal: Record<string, VaultItem[]> = {};
let _items: VaultItem[] = SEED_VAULT.sosa.map(v => ({ ...v }));
let listeners: (() => void)[] = [];

const notify = () => listeners.forEach(fn => fn());

function ensurePortal(id: string) {
  if (!_dataByPortal[id]) {
    _dataByPortal[id] = (SEED_VAULT[id] ?? SEED_VAULT.sosa).map(v => ({ ...v }));
  }
}

export function setActivePortal(id: string) {
  _dataByPortal[_portal] = _items;
  ensurePortal(id);
  _portal = id;
  _items = _dataByPortal[id];
  notify();
}

export function getVaultItems(): VaultItem[] { return _items; }

export function subscribeVault(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

// Keep backward-compatible export for components still using useState(INITIAL_VAULT_ITEMS)
export const INITIAL_VAULT_ITEMS: VaultItem[] = SEED_VAULT.sosa;
