import jsPDF from "jspdf";
import type { Profile } from "./profileStore";

const BLACK = "#0a0a0a";
const YELLOW = "#e8ff00";
const WHITE = "#ffffff";
const GRAY = "#888888";
const SURFACE = "#141414";
const DIVIDER = "#2a2a2a";

export async function exportProfilePdf(profile: Profile): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const margin = 22;
  const contentW = W - margin * 2;
  let y = 0;

  // ── Full dark background ──
  doc.setFillColor(BLACK);
  doc.rect(0, 0, W, H, "F");

  // ── Top accent bar ──
  doc.setFillColor(YELLOW);
  doc.rect(0, 0, W, 2, "F");

  // ── Left accent stripe ──
  doc.setFillColor(YELLOW);
  doc.rect(0, 0, 4, H, "F");

  y = 18;

  // ── Profile picture ──
  const avatarSrc = profile.avatar_url;
  if (avatarSrc && avatarSrc.startsWith("data:image")) {
    try {
      const fmt = avatarSrc.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(avatarSrc, fmt, margin, y, 22, 22, undefined, "FAST");
      doc.setDrawColor(YELLOW);
      doc.setLineWidth(0.6);
      doc.rect(margin, y, 22, 22);
    } catch {
      // skip if image fails
    }
  }

  // ── Name block ──
  const nameX = avatarSrc ? margin + 26 : margin;
  const fullName =
    profile.display_name ||
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
    "Profile";

  doc.setTextColor(WHITE);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text(fullName.toUpperCase(), nameX, y + 8);

  const subtitle = [profile.job_title, profile.company_name]
    .filter(Boolean)
    .join("  ·  ");
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(YELLOW);
    doc.text(subtitle, nameX, y + 15);
  }

  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  if (location) {
    doc.setFontSize(9);
    doc.setTextColor(GRAY);
    doc.text(location, nameX, y + 21);
  }

  y = 50;

  // ── Section divider ──
  const divider = () => {
    doc.setDrawColor(DIVIDER);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 8;
  };

  const sectionTitle = (title: string) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(YELLOW);
    doc.text(title.toUpperCase(), margin, y);
    y += 2;
    doc.setDrawColor(YELLOW);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + 30, y);
    y += 6;
  };

  const row = (label: string, value: string | null | undefined) => {
    if (!value) return;
    // Label in gray
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GRAY);
    doc.text(label, margin, y);
    // Value in white
    doc.setFont("helvetica", "normal");
    doc.setTextColor(WHITE);
    doc.text(value, margin + 42, y);
    y += 6;
  };

  // ── Contact ──
  sectionTitle("Contact Information");
  row("Email", profile.email);
  row("Phone", profile.phone);
  row("Address", [profile.address_line_1, profile.address_line_2].filter(Boolean).join(", ") || null);
  row("City", [profile.city, profile.province, profile.postal_code].filter(Boolean).join(", ") || null);
  row("Country", profile.country);
  y += 4;
  divider();

  // ── Professional ──
  sectionTitle("Professional Details");
  row("Job Title", profile.job_title);
  row("Department", profile.department);
  row("Company", profile.company_name);
  row("Business Type", profile.business_type);
  y += 4;
  divider();

  // ── Banking (only if IBAN present) ──
  if (profile.iban) {
    sectionTitle("Banking Details");
    row("IBAN", profile.iban);
    y += 4;
    divider();
  }

  // ── Personal ──
  sectionTitle("Personal Details");
  row("Date of Birth", profile.date_of_birth);
  row("Language", profile.language?.toUpperCase());
  row("Timezone", profile.timezone);
  row("Currency", profile.currency?.toUpperCase());
  y += 4;
  divider();

  // ── Social ──
  const socials = [
    { label: "Website", value: profile.website_url },
    { label: "LinkedIn", value: profile.linkedin_url },
    { label: "Instagram", value: profile.instagram_url },
    { label: "Slack", value: profile.slack_tag },
    ...(profile.extra_socials || []).map((s) => ({ label: s.label, value: s.url })),
  ].filter((s) => s.value);

  if (socials.length > 0) {
    sectionTitle("Social & Links");
    socials.forEach((s) => row(s.label, s.value));
    y += 4;
  }

  // ── Bottom bar ──
  doc.setFillColor(SURFACE);
  doc.rect(0, H - 14, W, 14, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(GRAY);
  const footerText = `SOSA INC.  ·  Generated ${new Date().toLocaleDateString()}  ·  Member since ${profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}`;
  doc.text(footerText, margin, H - 5);

  // ── Yellow bottom accent ──
  doc.setFillColor(YELLOW);
  doc.rect(0, H - 2, W, 2, "F");

  // ── Save with correct filename ──
  const username =
    (profile.display_name || profile.first_name || "profile")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`profile_${username}_${dateStr}.pdf`);
}
