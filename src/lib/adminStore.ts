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
const AUDIT_STORAGE_KEY = "iconoff_audit_log";
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
  name: "ICONOFF",
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
