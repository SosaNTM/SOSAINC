import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { EnrichedGiftCard } from "@/portals/finance/types/giftCards";

interface Props {
  card: EnrichedGiftCard;
  onClose: () => void;
}

export function GiftCardCodePopup({ card, onClose }: Props) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const brandColor = card.brandData?.color ?? "#6b7280";

  async function copyText(text: string, type: "code" | "pin") {
    await navigator.clipboard.writeText(text);
    if (type === "code") { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
    else { setCopiedPin(true); setTimeout(() => setCopiedPin(false), 2000); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#1a1a1a", border: "1px solid rgba(232,255,0,0.15)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: card.brandData?.logo_url ? "#fff" : brandColor, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {card.brandData?.logo_url ? (
                <img src={card.brandData.logo_url} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} loading="lazy" />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{card.brand.charAt(0)}</span>
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{card.brand} Gift Card</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-quaternary)", cursor: "pointer" }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {card.card_code && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-quaternary)", marginBottom: 6 }}>Codice</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "DM Mono, monospace", letterSpacing: 1 }}>{card.card_code}</span>
              <button type="button" onClick={() => copyText(card.card_code!, "code")}
                style={{ background: "none", border: "none", color: copiedCode ? "#4ade80" : "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}>
                {copiedCode ? <><Check style={{ width: 12, height: 12 }} /> Copiato!</> : <><Copy style={{ width: 12, height: 12 }} /> Copy</>}
              </button>
            </div>
          </div>
        )}

        {card.pin && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-quaternary)", marginBottom: 6 }}>PIN</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "DM Mono, monospace", letterSpacing: 1 }}>{card.pin}</span>
              <button type="button" onClick={() => copyText(card.pin!, "pin")}
                style={{ background: "none", border: "none", color: copiedPin ? "#4ade80" : "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}>
                {copiedPin ? <><Check style={{ width: 12, height: 12 }} /> Copiato!</> : <><Copy style={{ width: 12, height: 12 }} /> Copy</>}
              </button>
            </div>
          </div>
        )}

        {!card.card_code && !card.pin && (
          <p style={{ fontSize: 13, color: "var(--text-quaternary)", textAlign: "center", padding: "16px 0" }}>Nessun codice o PIN salvato per questa card</p>
        )}

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
          <p style={{ fontSize: 12, color: "var(--text-quaternary)" }}>
            Saldo: <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>€{card.remaining_value.toFixed(2)} / €{card.initial_value.toFixed(2)}</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
