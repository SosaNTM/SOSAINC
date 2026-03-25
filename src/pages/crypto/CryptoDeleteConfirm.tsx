interface Props {
  open: boolean;
  label: string;
  detail?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CryptoDeleteConfirm({ open, label, detail, onCancel, onConfirm }: Props) {
  if (!open) return null;

  const modal = (
    <>
      <div className="fixed inset-0 z-50 glass-modal-overlay" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[380px] glass-modal"
        style={{ animation: "fadeInUp 0.2s ease-out", textAlign: "center" }}>

        <span style={{ fontSize: 28, display: "block", marginBottom: 12 }}>⚠️</span>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          Delete "{label}"?
        </h3>
        {detail && (
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 4 }}>{detail}</p>
        )}
        <p style={{ fontSize: 12, color: "var(--text-quaternary)", marginBottom: 20 }}>This action cannot be undone.</p>

        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="glass-btn flex-1 py-3 text-sm font-semibold text-muted-foreground">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 py-3 text-sm font-semibold" style={{ borderRadius: 10, background: "#dc2626", border: "none", color: "#fff", cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>
    </>
  );

  return modal;
}
