import { useState } from "react";
import { MOCK_FISCAL } from "@/lib/profileData";
import { useAuth } from "@/lib/authContext";
import { Eye, EyeOff, Lock, Upload, FileText } from "lucide-react";

function MaskedField({ label, value }: { label: string; value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <input
          className="glass-input w-full"
          value={visible ? value : value ? "••••••••••••••" : "—"}
          readOnly
          style={{ fontSize: 14, padding: "10px 40px 10px 14px", fontFamily: value ? "monospace" : "inherit" }}
        />
        {value && (
          <button type="button"
            onClick={() => setVisible((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function ProfileFiscalTab({ userId }: { userId: string }) {
  const { user } = useAuth();
  const isOwn = user?.id === userId;
  const fiscal = MOCK_FISCAL.find((f) => f.userId === userId);

  if (!fiscal) {
    return <p style={{ fontSize: 13, color: "var(--text-quaternary)", textAlign: "center", padding: 20 }}>No fiscal data available</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Fiscal Data</h3>
        <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--text-quaternary)" }}>
          <Lock className="w-3.5 h-3.5" /> Private
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MaskedField label="Tax ID (Codice Fiscale)" value={fiscal.codiceFiscale} />
        <MaskedField label="VAT Number (P.IVA)" value={fiscal.piva} />
        <MaskedField label="IBAN" value={fiscal.iban} />
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Tax Regime</label>
          <input className="glass-input w-full" value={fiscal.taxRegime} readOnly style={{ fontSize: 14, padding: "10px 14px" }} />
        </div>
      </div>

      {/* Fiscal Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Fiscal Documents</p>
          {isOwn && (
            <button type="button" className="glass-btn flex items-center gap-1.5" style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8 }}>
              <Upload className="w-3.5 h-3.5" /> Upload Document
            </button>
          )}
        </div>
        <div
          style={{
            background: "var(--glass-bg)",
            border: "0.5px solid var(--glass-border)",
            borderRadius: 12,
            padding: fiscal.documents.length ? "12px 14px" : "20px",
          }}
        >
          {fiscal.documents.length > 0 ? (
            <div className="flex flex-col gap-2">
              {fiscal.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--text-quaternary)" }} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{doc.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>{doc.sizeMb} MB</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-quaternary)", textAlign: "center" }}>No documents uploaded</p>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-2"
        style={{
          fontSize: 12,
          color: "var(--text-quaternary)",
          background: "rgba(251,191,36,0.08)",
          border: "0.5px solid rgba(251,191,36,0.2)",
          borderRadius: 10,
          padding: "10px 14px",
        }}
      >
        ⚠️ This data is visible only to you and the company Owner.
      </div>
    </div>
  );
}
