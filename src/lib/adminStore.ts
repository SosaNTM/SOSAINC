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
  keylo:   "KEYLOW",
  redx:    "REDX",
  trustme: "Trust Me",
};

export function getPortalName(portalId: string): string {
  return PORTAL_NAMES[portalId] ?? portalId;
}

/* ── In-memory audit log (Supabase is source of truth via auditLogService) ── */

const MAX_AUDIT_ENTRIES = 200;

let _liveLog: AuditLogEntry[] = [];
let _auditListeners: Array<() => void> = [];
let _auditCounter = 1000;

export function addAuditEntry(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): void {
  _auditCounter++;
  _liveLog = [
    { ...entry, id: `al_${_auditCounter}`, timestamp: new Date() },
    ..._liveLog,
  ].slice(0, MAX_AUDIT_ENTRIES);
  _auditListeners.forEach((cb) => cb());

  // Persist to Supabase audit_log (fire-and-forget — never throws)
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
