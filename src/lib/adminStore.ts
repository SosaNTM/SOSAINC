export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  category: "auth" | "vault" | "cloud" | "tasks" | "admin" | "profile";
  details: string;
  timestamp: Date;
  icon: string;
}

/* ── Live audit log store ── */
let _liveLog: AuditLogEntry[] = [];
let _auditListeners: Array<() => void> = [];
let _auditCounter = 1000;

export function addAuditEntry(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): void {
  _auditCounter++;
  _liveLog = [
    { ...entry, id: `al_live_${_auditCounter}`, timestamp: new Date() },
    ..._liveLog,
  ];
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

export const INITIAL_AUDIT_LOG: AuditLogEntry[] = _liveLog = [
  // Today
  { id: "al_01", userId: "usr_001", action: "Unlocked Vault Locked Folder", category: "vault", details: "Accessed locked folder via password", timestamp: d(0, 10, 23), icon: "🔓" },
  { id: "al_02", userId: "usr_002", action: "Uploaded Q4_Report.xlsx to Cloud", category: "cloud", details: "File uploaded to Finance folder", timestamp: d(0, 9, 45), icon: "📄" },
  { id: "al_03", userId: "usr_003", action: "Completed task 'Fix payment bug'", category: "tasks", details: "Task TSK-004 marked as done", timestamp: d(0, 9, 12), icon: "✅" },
  { id: "al_04", userId: "usr_001", action: "Viewed API Key 'Stripe Live Key'", category: "vault", details: "Credential revealed for 10 seconds", timestamp: d(0, 8, 30), icon: "🔑" },
  { id: "al_05", userId: "usr_004", action: "Logged in", category: "auth", details: "Successful login from 192.168.1.42", timestamp: d(0, 8, 15), icon: "👤" },
  // Yesterday
  { id: "al_06", userId: "usr_004", action: "Logged in", category: "auth", details: "Successful login from mobile device", timestamp: d(1, 18, 22), icon: "👤" },
  { id: "al_07", userId: "usr_002", action: "Created note 'Process Documentation'", category: "tasks", details: "New note created in personal workspace", timestamp: d(1, 16, 45), icon: "📝" },
  { id: "al_08", userId: "usr_001", action: "Created folder 'Q1 2025' in Cloud", category: "cloud", details: "New folder under Projects", timestamp: d(1, 14, 30), icon: "📁" },
  { id: "al_09", userId: "usr_003", action: "3 failed login attempts", category: "auth", details: "Failed attempts from IP 10.0.0.55", timestamp: d(1, 11, 15), icon: "⚠️" },
  { id: "al_10", userId: "usr_001", action: "Changed role for Sara to Member", category: "admin", details: "Role updated from Manager to Member", timestamp: d(1, 10, 0), icon: "🛡️" },
  // 2 days ago
  { id: "al_11", userId: "usr_002", action: "Downloaded Insurance_Policy_2025.pdf", category: "vault", details: "Document downloaded from Vault", timestamp: d(2, 15, 30), icon: "📥" },
  { id: "al_12", userId: "usr_001", action: "Created task 'Migrate database'", category: "tasks", details: "Task TSK-009 assigned to Marco", timestamp: d(2, 14, 0), icon: "✅" },
  { id: "al_13", userId: "usr_004", action: "Uploaded Brand_Assets.zip to Cloud", category: "cloud", details: "File uploaded to Marketing folder", timestamp: d(2, 11, 20), icon: "📄" },
  { id: "al_14", userId: "usr_001", action: "Viewed fiscal data for Marco", category: "profile", details: "Tax ID and IBAN accessed", timestamp: d(2, 10, 0), icon: "💰" },
  // 3 days ago
  { id: "al_15", userId: "usr_002", action: "Logged in", category: "auth", details: "Successful login", timestamp: d(3, 9, 0), icon: "👤" },
  { id: "al_16", userId: "usr_001", action: "Invited user elena@iconoff.com", category: "admin", details: "New user invitation sent", timestamp: d(3, 8, 30), icon: "📧" },
  { id: "al_17", userId: "usr_003", action: "Assigned task to Elena", category: "tasks", details: "Task 'Design email template' assigned", timestamp: d(3, 14, 15), icon: "✅" },
  // 5 days ago
  { id: "al_18", userId: "usr_001", action: "Updated company settings", category: "admin", details: "Timezone changed to Europe/Rome", timestamp: d(5, 10, 0), icon: "⚙️" },
  { id: "al_19", userId: "usr_001", action: "Set Vault locked folder password", category: "vault", details: "Password updated for locked folder", timestamp: d(5, 9, 0), icon: "🔐" },
  { id: "al_20", userId: "usr_002", action: "Downloaded CV for Sara Verdi", category: "profile", details: "Sara_Verdi_CV_2025.pdf downloaded", timestamp: d(5, 16, 0), icon: "📥" },
  // Older
  { id: "al_21", userId: "usr_001", action: "Added API Key 'SendGrid'", category: "vault", details: "New API key stored in Vault", timestamp: d(8, 11, 0), icon: "🔑" },
  { id: "al_22", userId: "usr_001", action: "Deactivated user test@iconoff.com", category: "admin", details: "Test account removed", timestamp: d(10, 9, 0), icon: "🚫" },
  { id: "al_23", userId: "usr_002", action: "Changed folder permissions on Finance", category: "cloud", details: "Sara set to read-only access", timestamp: d(12, 14, 0), icon: "🔒" },
  { id: "al_24", userId: "usr_001", action: "Created goal for Elena", category: "admin", details: "'Complete design system v2' goal added", timestamp: d(15, 10, 0), icon: "🎯" },
];

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
