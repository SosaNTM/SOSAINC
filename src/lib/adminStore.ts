export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  category: "auth" | "vault" | "cloud" | "tasks" | "admin" | "profile" | "finance";
  details: string;
  timestamp: Date;
  icon: string;
  portalId?: string;
}

// Lazy import to avoid circular deps — bridged at call-site
let _supabaseAuditBridge: ((action: string, portalId: string, opts?: Record<string, unknown>) => Promise<void>) | null = null;
async function getAuditBridge() {
  if (!_supabaseAuditBridge) {
    const mod = await import("@/lib/services/auditLogService");
    _supabaseAuditBridge = mod.addAuditEntryForUser as typeof _supabaseAuditBridge;
  }
  return _supabaseAuditBridge;
}

const PORTAL_NAMES: Record<string, string> = {
  sosa:    "Sosa Inc",
  keylo:   "KEYLO",
  redx:    "REDX",
  trustme: "Trust Me",
};

export function getPortalName(portalId: string): string {
  return PORTAL_NAMES[portalId] ?? portalId;
}

/* ── Persistent audit log store ── */
import { STORAGE_AUDIT_LOG } from "@/constants/storageKeys";

const AUDIT_STORAGE_KEY = STORAGE_AUDIT_LOG;
const MAX_AUDIT_ENTRIES = 200;

function loadAuditLog(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditLogEntry[];
    return parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch { return []; }
}

function saveAuditLog(log: AuditLogEntry[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log.slice(0, MAX_AUDIT_ENTRIES)));
  } catch { /* quota exceeded — silently drop oldest entries */ }
}

let _liveLog: AuditLogEntry[] = loadAuditLog();
let _auditListeners: Array<() => void> = [];
let _auditCounter = _liveLog.length + 1000;

export function addAuditEntry(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): void {
  _auditCounter++;
  _liveLog = [
    { ...entry, id: `al_${_auditCounter}`, timestamp: new Date() },
    ..._liveLog,
  ].slice(0, MAX_AUDIT_ENTRIES);
  saveAuditLog(_liveLog);
  _auditListeners.forEach((cb) => cb());

  // Bridge to Supabase audit log (fire-and-forget — never throws)
  if (entry.portalId) {
    const portalId = entry.portalId;
    getAuditBridge().then((bridge) => {
      if (bridge) {
        void bridge(entry.action, portalId, {
          category: entry.category,
          details: { userId: entry.userId, icon: entry.icon, text: entry.details },
        });
      }
    }).catch(() => { /* audit failures must never propagate */ });
  }
}

export function getAuditLog(): AuditLogEntry[] {
  return _liveLog;
}

export function subscribeAudit(cb: () => void): () => void {
  _auditListeners.push(cb);
  return () => { _auditListeners = _auditListeners.filter((l) => l !== cb); };
}

function d(daysAgo: number, h: number, m = 0): Date {
  const dt = new Date(); dt.setDate(dt.getDate() - daysAgo); dt.setHours(h, m, 0, 0); return dt;
}

export const INITIAL_AUDIT_LOG: AuditLogEntry[] = _liveLog;

export interface CompanySettings {
  name: string;
  timezone: string;
  language: string;
  dateFormat: string;
  storageQuotaGb: number;
  maxUsers: number;
}

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  name: "SOSA INC",
  timezone: "Europe/Rome",
  language: "Italiano",
  dateFormat: "DD/MM/YYYY",
  storageQuotaGb: 10,
  maxUsers: 25,
};

export interface SecuritySettings {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  sessionTimeoutMin: number;
  maxActiveSessions: number;
  vaultAutoLockMin: number;
  vaultMaxFailedAttempts: number;
  requireMfa: boolean;
}

export const INITIAL_SECURITY_SETTINGS: SecuritySettings = {
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: false,
  sessionTimeoutMin: 30,
  maxActiveSessions: 3,
  vaultAutoLockMin: 10,
  vaultMaxFailedAttempts: 5,
  requireMfa: false,
};
