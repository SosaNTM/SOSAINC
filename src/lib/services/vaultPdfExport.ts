import { jsPDF } from "jspdf";
import type { VaultItem, VaultItemType } from "@/lib/vaultStore";
import { format } from "date-fns";

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_H = 6.5;

function typeColor(t: VaultItemType): [number, number, number] {
  if (t === "credential") return [59, 130, 246];
  if (t === "api_key") return [245, 158, 11];
  if (t === "document") return [239, 68, 68];
  return [168, 85, 247];
}

function typeLabel(t: VaultItemType): string {
  if (t === "credential") return "LOGIN";
  if (t === "api_key") return "API KEY";
  if (t === "document") return "DOCUMENT";
  return "NOTE";
}

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${["B", "KB", "MB", "GB"][i]}`;
}

function trunc(s: string, n = 78): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

interface FieldLine {
  label: string;
  value: string;
}

// What this login/key/doc is for — shown prominently
function getRelatedTo(item: VaultItem): { label: string; value: string } {
  if (item.type === "credential" && item.credential) {
    const url = item.credential.url?.trim();
    return { label: "PLATFORM / URL", value: url || item.name };
  }
  if (item.type === "api_key" && item.apiKey) {
    const svc = item.apiKey.service?.trim() || item.name;
    const env = item.apiKey.environment?.trim();
    return { label: "SERVICE", value: env ? `${svc}  —  ${env}` : svc };
  }
  if (item.type === "document" && item.document) {
    return { label: "FILE", value: item.document.filename || item.name };
  }
  return { label: "CATEGORY", value: item.category || "Secure Note" };
}

// Full login details — no masking
function buildLines(item: VaultItem): FieldLine[] {
  if (item.type === "credential" && item.credential) {
    const lines: FieldLine[] = [
      { label: "Username / Email", value: item.credential.username || "—" },
      { label: "Password", value: item.credential.password || "—" },
    ];
    if (item.credential.notes?.trim()) {
      lines.push({ label: "Notes", value: item.credential.notes });
    }
    return lines;
  }
  if (item.type === "api_key" && item.apiKey) {
    const lines: FieldLine[] = [
      { label: "API Key", value: item.apiKey.key || "—" },
    ];
    if (item.apiKey.notes?.trim()) {
      lines.push({ label: "Notes", value: item.apiKey.notes });
    }
    return lines;
  }
  if (item.type === "document" && item.document) {
    return [
      { label: "Filename", value: item.document.filename || "—" },
      { label: "Size", value: fmtBytes(item.document.size) },
      { label: "Type", value: item.document.mimeType || "—" },
    ];
  }
  if (item.type === "note" && item.note) {
    return [{ label: "Content", value: item.note.content || "—" }];
  }
  return [];
}

export function generateVaultPDF(items: VaultItem[], portalName: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  function newPage() {
    doc.addPage();
    y = MARGIN;
  }

  function guard(needed: number) {
    if (y + needed > PAGE_H - MARGIN) newPage();
  }

  // ── Dark header banner ──────────────────────────────────────────────────────
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, PAGE_W, 38, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(212, 255, 0);
  doc.text("VAULT EXPORT", MARGIN, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  doc.text(`${portalName}  ·  ${format(new Date(), "d MMM yyyy, HH:mm")}`, MARGIN, 25);

  const counts = {
    creds: items.filter((i) => i.type === "credential" && !i.isLocked).length,
    keys: items.filter((i) => i.type === "api_key" && !i.isLocked).length,
    docs: items.filter((i) => (i.type === "document" || i.type === "note") && !i.isLocked).length,
    locked: items.filter((i) => i.isLocked).length,
  };
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `${items.length} items  ·  ${counts.creds} logins  ·  ${counts.keys} API keys  ·  ${counts.docs} docs/notes  ·  ${counts.locked} locked`,
    MARGIN,
    32,
  );

  y = 48;

  // ── Confidential notice ─────────────────────────────────────────────────────
  doc.setFillColor(255, 248, 220);
  doc.setDrawColor(200, 150, 0);
  doc.rect(MARGIN, y, CONTENT_W, 9, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 90, 0);
  doc.text(
    "CONFIDENTIAL — Contains full login credentials. Handle as sensitive physical document.",
    MARGIN + 3,
    y + 6,
  );
  y += 14;

  // ── Section renderer ────────────────────────────────────────────────────────
  function renderSection(
    title: string,
    color: [number, number, number],
    sectionItems: VaultItem[],
  ) {
    if (!sectionItems.length) return;
    guard(20);

    const [cr, cg, cb] = color;
    doc.setFillColor(cr, cg, cb);
    doc.rect(MARGIN, y, 3, 9, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(25, 25, 25);
    doc.text(title, MARGIN + 7, y + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    const titleW = doc.getTextWidth(title);
    doc.text(`  (${sectionItems.length})`, MARGIN + 7 + titleW, y + 6.5);

    y += 14;

    sectionItems.forEach((item) => renderItem(item));
    y += 5;
  }

  // ── Item renderer ───────────────────────────────────────────────────────────
  function renderItem(item: VaultItem) {
    const lines = buildLines(item);
    const related = getRelatedTo(item);
    const hasExpiry = Boolean(item.expiresAt);

    const PAD_TOP = 6;
    const NAME_ROW = 8;
    const RELATED_ROW = 10; // taller — visually prominent
    const DIVIDER = 2;
    const PAD_BOT = 5;
    const expiryH = hasExpiry ? LINE_H : 0;
    const itemH = PAD_TOP + NAME_ROW + RELATED_ROW + DIVIDER + lines.length * LINE_H + expiryH + PAD_BOT;

    guard(itemH + 4);

    const [r, g, b] = typeColor(item.type);

    // Card background
    doc.setFillColor(249, 249, 249);
    doc.setDrawColor(220, 220, 220);
    doc.rect(MARGIN, y, CONTENT_W, itemH, "FD");

    // Left accent stripe
    doc.setFillColor(r, g, b);
    doc.rect(MARGIN, y, 3, itemH, "F");

    const ix = MARGIN + 7;
    let iy = y + PAD_TOP;

    // ── Row 1: item name + type badge ────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(trunc(item.name, 48), ix, iy + 5.5);

    // Type badge (top-right)
    const badge = typeLabel(item.type);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    const bw = doc.getTextWidth(badge) + 5;
    const bx = MARGIN + CONTENT_W - 4 - bw;
    doc.setFillColor(r, g, b);
    doc.rect(bx, y + 3, bw, 5.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(badge, bx + 2.5, y + 7);

    iy += NAME_ROW;

    // ── Row 2: RELATED TO ────────────────────────────────────────────────────
    // Subtle colored background for this row
    doc.setFillColor(r * 0.12 + 237, g * 0.12 + 237, b * 0.12 + 237); // very light tint
    doc.rect(MARGIN + 3, iy, CONTENT_W - 3, RELATED_ROW, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(r, g, b);
    doc.text(related.label + ":", ix, iy + 4);
    const lblW = doc.getTextWidth(related.label + ":  ");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    doc.text(trunc(related.value, 60), ix + lblW, iy + 4.5);

    iy += RELATED_ROW + DIVIDER;

    // Thin divider line
    doc.setDrawColor(210, 210, 210);
    doc.line(ix, iy, MARGIN + CONTENT_W - 4, iy);
    iy += 3;

    // ── Fields: full login details ────────────────────────────────────────────
    lines.forEach(({ label, value }) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const lw = doc.getTextWidth(label + ": ");
      doc.text(label + ":", ix, iy);

      // Password / key fields rendered in monospace-style (courier)
      const isSecret = label === "Password" || label === "API Key";
      doc.setFont(isSecret ? "courier" : "helvetica", isSecret ? "bold" : "normal");
      doc.setFontSize(isSecret ? 8.5 : 8);
      doc.setTextColor(isSecret ? 20 : 30, isSecret ? 20 : 30, isSecret ? 20 : 30);
      doc.text(trunc(value, 68), ix + lw, iy);
      iy += LINE_H;
    });

    // ── Expiry ────────────────────────────────────────────────────────────────
    if (item.expiresAt) {
      const days = Math.ceil((item.expiresAt.getTime() - Date.now()) / 86_400_000);
      const expStr =
        days < 0
          ? `EXPIRED — ${format(item.expiresAt, "d MMM yyyy")}`
          : `Expires ${format(item.expiresAt, "d MMM yyyy")} (${days}d remaining)`;
      const expiryR = days < 0 ? 239 : days < 30 ? 200 : 110;
      const expiryG = days < 0 ? 68 : days < 30 ? 120 : 110;
      const expiryB = days < 0 ? 68 : days < 30 ? 0 : 110;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(expiryR, expiryG, expiryB);
      doc.text(expStr, ix, iy);
    }

    y += itemH + 4;
  }

  // ── Sections ────────────────────────────────────────────────────────────────
  renderSection(
    "Login Credentials",
    [59, 130, 246],
    items.filter((i) => i.type === "credential" && !i.isLocked),
  );
  renderSection(
    "API Keys",
    [245, 158, 11],
    items.filter((i) => i.type === "api_key" && !i.isLocked),
  );
  renderSection(
    "Documents & Notes",
    [239, 68, 68],
    items.filter((i) => (i.type === "document" || i.type === "note") && !i.isLocked),
  );

  const lockedItems = items.filter((i) => i.isLocked);
  if (lockedItems.length) {
    renderSection("Locked Items", [100, 100, 100], lockedItems);
  }

  if (!items.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(190, 190, 190);
    doc.text("Vault is empty.", PAGE_W / 2, PAGE_H / 2, { align: "center" });
  }

  // ── Footer on every page ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(190, 190, 190);
    doc.text("SOSA INC  ·  Vault Export  ·  Confidential", MARGIN, PAGE_H - 8);
    doc.text(
      `Page ${p} / ${pageCount}  ·  ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
      PAGE_W - MARGIN,
      PAGE_H - 8,
      { align: "right" },
    );
  }

  doc.save(`vault-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
