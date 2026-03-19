import jsPDF from "jspdf";
import type { Profile } from "./profileStore";

export async function exportProfilePdf(profile: Profile) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 20;

  const brandHex = profile.brand_color || "#3b82f6";

  // ── Header bar ──
  doc.setFillColor(brandHex);
  doc.rect(0, 0, W, 38, "F");

  doc.setTextColor("#ffffff");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  const fullName = profile.display_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Employee";
  doc.text(fullName, margin, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const subtitle = [profile.job_title, profile.company_name].filter(Boolean).join(" @ ");
  if (subtitle) doc.text(subtitle, margin, 26);

  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  if (location) doc.text(location, margin, 33);

  y = 48;

  // ── Helper functions ──
  const sectionTitle = (title: string) => {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandHex);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(brandHex);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentW, y);
    y += 7;
  };

  const row = (label: string, value: string | null | undefined) => {
    if (!value) return;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#6b7280");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#1f2937");
    doc.text(value, margin + 45, y);
    y += 6;
  };

  // ── Contact Information ──
  sectionTitle("Contact Information");
  row("Email", profile.email);
  row("Phone", profile.phone);
  row("Address", [profile.address_line_1, profile.address_line_2].filter(Boolean).join(", ") || null);
  row("City", [profile.city, profile.province, profile.postal_code].filter(Boolean).join(", ") || null);
  row("Country", profile.country);
  y += 4;

  // ── Professional Details ──
  sectionTitle("Professional Details");
  row("Job Title", profile.job_title);
  row("Department", profile.department);
  row("Company", profile.company_name);
  row("Business Type", profile.business_type);
  y += 4;

  // ── Personal Details ──
  sectionTitle("Personal Details");
  row("Date of Birth", profile.date_of_birth);
  row("Language", profile.language?.toUpperCase());
  row("Timezone", profile.timezone);
  row("Currency", profile.currency?.toUpperCase());
  y += 4;

  // ── Social Links ──
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

  // ── Footer ──
  const pageH = 297;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor("#9ca3af");
  doc.text(`Generated on ${new Date().toLocaleDateString()} · Member since ${profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}`, margin, pageH - 10);

  // ── Save ──
  const safeName = fullName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_Profile.pdf`);
}
