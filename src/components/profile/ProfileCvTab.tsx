import { MOCK_CVS } from "@/lib/profileData";
import { FileText, Download, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/authContext";

export function ProfileCvTab({ userId }: { userId: string }) {
  const { user } = useAuth();
  const isOwn = user?.id === userId;
  const cvs = MOCK_CVS.filter((c) => c.userId === userId);
  const currentCv = cvs.find((c) => c.current);
  const previous = cvs.filter((c) => !c.current);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>CV & Documents</h3>
        {isOwn && (
          <button type="button" className="glass-btn-primary flex items-center gap-1.5" style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8 }}>
            <Upload className="w-3.5 h-3.5" /> Upload CV
          </button>
        )}
      </div>

      {currentCv && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Current CV</p>
          <div
            style={{
              background: "var(--glass-bg)",
              border: "0.5px solid var(--glass-border)",
              borderRadius: 12,
              padding: "16px",
            }}
          >
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(96,165,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText className="w-5 h-5" style={{ color: "#60a5fa" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }} className="truncate">{currentCv.fileName}</p>
                <p style={{ fontSize: 12, color: "var(--text-quaternary)" }}>
                  {currentCv.sizeMb} MB • Uploaded {format(currentCv.uploadedAt, "MMM dd, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="glass-btn" style={{ padding: 6, borderRadius: 8 }}>
                  <Download className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                </button>
                {isOwn && (
                  <button type="button" className="glass-btn" style={{ padding: 6, borderRadius: 8 }}>
                    <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {previous.length > 0 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Previous Versions</p>
          <div className="flex flex-col gap-2">
            {previous.map((cv) => (
              <div
                key={cv.id}
                className="flex items-center gap-3"
                style={{
                  background: "var(--glass-bg)",
                  border: "0.5px solid var(--glass-border)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  opacity: 0.7,
                }}
              >
                <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--text-quaternary)" }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }} className="truncate">{cv.fileName}</span>
                <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>{format(cv.uploadedAt, "MMM yyyy")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cvs.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text-quaternary)", textAlign: "center", padding: 20 }}>No CV uploaded yet</p>
      )}
    </div>
  );
}
