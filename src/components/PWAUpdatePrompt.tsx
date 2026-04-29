import { useRegisterSW } from "virtual:pwa-register/react";

export function PWAUpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      if (r) setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, zIndex: 9999,
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-lg)", padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        New version available
      </span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          background: "var(--accent-primary)", color: "#0a0a0a",
          border: "none", borderRadius: "var(--radius-md)", padding: "4px 12px",
        }}
      >
        Update
      </button>
    </div>
  );
}
