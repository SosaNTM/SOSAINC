// ── Beta banner shown on every Social module page ──────────────────────────
// Marks the social analytics surface as beta until Phase-2 real-platform-API
// ingestion replaces the mock data layer.

import { AlertTriangle } from "lucide-react";

export function SocialBetaBanner() {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        marginBottom: 16,
        borderRadius: 8,
        border: "1px solid rgba(245, 158, 11, 0.32)",
        background: "rgba(245, 158, 11, 0.08)",
        color: "rgba(245, 158, 11, 0.95)",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
      }}
    >
      <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span>
        <strong style={{ fontWeight: 700 }}>BETA</strong>
        <span style={{ opacity: 0.85 }}> — analytics in this module use sample data. Real platform-graph ingestion (Instagram, TikTok, LinkedIn, Twitter/X, Facebook, YouTube) ships in Phase&nbsp;2.</span>
      </span>
    </div>
  );
}
