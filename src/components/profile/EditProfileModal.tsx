import { useState } from "react";
import { X } from "lucide-react";
import { MorphingSquare } from "@/components/ui/morphing-square";
import { toast } from "sonner";
import type { Profile } from "@/lib/profileStore";
import { updateProfile } from "@/lib/profileStore";

interface Props {
  profile: Profile;
  open: boolean;
  onClose: () => void;
  onSaved: (p: Profile) => void;
}

const BUSINESS_TYPES = ["Freelancer", "SRL", "SPA", "Ditta Individuale", "Associazione", "Altro"];

export function EditProfileModal({ profile, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Partial<Profile>>({ ...profile });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const set = (key: keyof Profile, val: string | null) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.first_name?.trim()) errs.first_name = "Required";
    if (!form.last_name?.trim()) errs.last_name = "Required";
    if (form.tax_id && !/^(IT\d{11}|\d{11}|[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])$/i.test(form.tax_id)) {
      errs.tax_id = "Invalid format (P.IVA 11 digits or CF 16 chars)";
    }
    if (form.phone && !/^\+?[\d\s\-()]{7,20}$/.test(form.phone)) errs.phone = "Invalid phone";
    if (form.website_url && !/^https?:\/\/.+/.test(form.website_url)) errs.website_url = "Must start with http(s)://";
    if (form.linkedin_url && !/^https?:\/\/.+/.test(form.linkedin_url)) errs.linkedin_url = "Must start with http(s)://";
    if (form.instagram_url && !/^https?:\/\/.+/.test(form.instagram_url)) errs.instagram_url = "Must start with http(s)://";
    if (form.iban) {
      const raw = form.iban.replace(/\s/g, "").toUpperCase();
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(raw)) {
        errs.iban = "Invalid IBAN (e.g. IT60 X054 2811 1010 0000 0123 456)";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    const updated = updateProfile(profile.id, {
      ...form,
      display_name: [form.first_name, form.last_name].filter(Boolean).join(" ") || form.first_name,
    });
    setSaving(false);
    toast.success("Profile updated");
    onSaved(updated);
    onClose();
  };

  const fieldStyle = (key: string) => ({
    padding: "12px 14px", fontSize: 13,
    border: errors[key] ? "1px solid rgba(239,68,68,0.5)" : undefined,
    boxShadow: errors[key] ? "0 0 0 2px rgba(239,68,68,0.1)" : undefined,
  });

  return (
    <>
      <div className="fixed inset-0 z-50 glass-modal-overlay" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[min(600px,calc(100%-2rem))] max-h-[85vh] overflow-y-auto rounded-2xl"
          style={{
            background: "var(--modal-bg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--divider)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
            style={{ background: "var(--modal-bg)", borderBottom: "1px solid var(--divider)" }}>
            <h2 className="text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>Edit Profile</h2>
            <button type="button" onClick={onClose} className="glass-btn p-1.5"><X className="w-4 h-4" /></button>
          </div>

          <div className="px-6 py-5 flex flex-col gap-6">
            {/* Personal */}
            <Section title="Personal Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="First Name" error={errors.first_name} required>
                  <input className="glass-input w-full" value={form.first_name || ""} onChange={(e) => set("first_name", e.target.value)} style={fieldStyle("first_name")} maxLength={50} />
                </Field>
                <Field label="Last Name" error={errors.last_name} required>
                  <input className="glass-input w-full" value={form.last_name || ""} onChange={(e) => set("last_name", e.target.value)} style={fieldStyle("last_name")} maxLength={50} />
                </Field>
              </div>
              <Field label="Phone" error={errors.phone}>
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    value={(form.phone || "").match(/^\+\d{1,3}/)?.[0] || "+39"}
                    onChange={(e) => {
                      const currentNum = (form.phone || "").replace(/^\+\d{1,3}\s*/, "");
                      set("phone", `${e.target.value} ${currentNum}`);
                    }}
                    className="glass-input"
                    style={{ ...fieldStyle("phone"), width: 110, flexShrink: 0, fontSize: 13, padding: "8px 6px", cursor: "pointer" }}
                  >
                    <option value="+39">🇮🇹 +39</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+34">🇪🇸 +34</option>
                    <option value="+351">🇵🇹 +351</option>
                    <option value="+31">🇳🇱 +31</option>
                    <option value="+32">🇧🇪 +32</option>
                    <option value="+41">🇨🇭 +41</option>
                    <option value="+43">🇦🇹 +43</option>
                    <option value="+46">🇸🇪 +46</option>
                    <option value="+47">🇳🇴 +47</option>
                    <option value="+45">🇩🇰 +45</option>
                    <option value="+358">🇫🇮 +358</option>
                    <option value="+48">🇵🇱 +48</option>
                    <option value="+420">🇨🇿 +420</option>
                    <option value="+30">🇬🇷 +30</option>
                    <option value="+353">🇮🇪 +353</option>
                    <option value="+40">🇷🇴 +40</option>
                    <option value="+385">🇭🇷 +385</option>
                    <option value="+386">🇸🇮 +386</option>
                    <option value="+36">🇭🇺 +36</option>
                    <option value="+55">🇧🇷 +55</option>
                    <option value="+81">🇯🇵 +81</option>
                    <option value="+86">🇨🇳 +86</option>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+82">🇰🇷 +82</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+64">🇳🇿 +64</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+7">🇷🇺 +7</option>
                    <option value="+90">🇹🇷 +90</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+54">🇦🇷 +54</option>
                    <option value="+57">🇨🇴 +57</option>
                    <option value="+27">🇿🇦 +27</option>
                    <option value="+234">🇳🇬 +234</option>
                    <option value="+20">🇪🇬 +20</option>
                    <option value="+212">🇲🇦 +212</option>
                    <option value="+216">🇹🇳 +216</option>
                  </select>
                  <input
                    className="glass-input"
                    style={{ ...fieldStyle("phone"), flex: 1 }}
                    value={(form.phone || "").replace(/^\+\d{1,3}\s*/, "")}
                    onChange={(e) => {
                      const prefix = (form.phone || "").match(/^\+\d{1,3}/)?.[0] || "+39";
                      set("phone", `${prefix} ${e.target.value}`);
                    }}
                    placeholder="02 1234 5678"
                    type="tel"
                    maxLength={20}
                  />
                </div>
              </Field>
              <Field label="Date of Birth">
                <input type="date" className="glass-input w-full" value={form.date_of_birth || ""} onChange={(e) => set("date_of_birth", e.target.value)} style={{ ...fieldStyle("date_of_birth"), colorScheme: "light" }} />
              </Field>
            </Section>

            {/* Professional */}
            <Section title="Professional">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Company">
                  <input className="glass-input w-full" value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} style={fieldStyle("company_name")} />
                </Field>
                <Field label="Job Title">
                  <input className="glass-input w-full" value={form.job_title || ""} onChange={(e) => set("job_title", e.target.value)} style={fieldStyle("job_title")} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Department">
                  <input className="glass-input w-full" value={form.department || ""} onChange={(e) => set("department", e.target.value)} style={fieldStyle("department")} />
                </Field>
                <Field label="Business Type">
                  <select className="glass-input w-full" value={form.business_type || ""} onChange={(e) => set("business_type", e.target.value || null)} style={fieldStyle("business_type")}>
                    <option value="">Select...</option>
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Tax ID (P.IVA / Codice Fiscale)" error={errors.tax_id}>
                <input className="glass-input w-full" value={form.tax_id || ""} onChange={(e) => set("tax_id", e.target.value.toUpperCase())} style={fieldStyle("tax_id")} placeholder="IT12345678901" maxLength={16} />
              </Field>
            </Section>

            {/* Address */}
            <Section title="Address">
              <Field label="Address Line 1">
                <input className="glass-input w-full" value={form.address_line_1 || ""} onChange={(e) => set("address_line_1", e.target.value)} style={fieldStyle("address_line_1")} />
              </Field>
              <Field label="Address Line 2">
                <input className="glass-input w-full" value={form.address_line_2 || ""} onChange={(e) => set("address_line_2", e.target.value)} style={fieldStyle("address_line_2")} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="City">
                  <input className="glass-input w-full" value={form.city || ""} onChange={(e) => set("city", e.target.value)} style={fieldStyle("city")} />
                </Field>
                <Field label="Province">
                  <input className="glass-input w-full" value={form.province || ""} onChange={(e) => set("province", e.target.value)} style={fieldStyle("province")} maxLength={2} />
                </Field>
                <Field label="Postal Code">
                  <input className="glass-input w-full" value={form.postal_code || ""} onChange={(e) => set("postal_code", e.target.value)} style={fieldStyle("postal_code")} maxLength={10} />
                </Field>
              </div>
            </Section>

            {/* Banking Details */}
            <Section title="Banking Details">
              <Field label="IBAN" error={errors.iban}>
                <input
                  className="glass-input w-full"
                  value={form.iban || ""}
                  onChange={(e) => {
                    // Auto-format with spaces every 4 chars
                    const raw = e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 34);
                    const formatted = raw.match(/.{1,4}/g)?.join(" ") ?? raw;
                    set("iban", formatted || null);
                  }}
                  style={fieldStyle("iban")}
                  placeholder="IT60 X054 2811 1010 0000 0123 456"
                  maxLength={42}
                  spellCheck={false}
                />
              </Field>
            </Section>

            {/* Brand Color */}
            <Section title="Brand Color">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brand_color || "#00E5FF"}
                  onChange={(e) => set("brand_color", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  style={{ background: "transparent" }}
                />
                <input
                  className="glass-input flex-1"
                  value={form.brand_color || "#00E5FF"}
                  onChange={(e) => set("brand_color", e.target.value)}
                  style={fieldStyle("brand_color")}
                  maxLength={7}
                />
              </div>
            </Section>

            {/* Social */}
            <Section title="Social Links">
              <Field label="Website" error={errors.website_url}>
                <input className="glass-input w-full" value={form.website_url || ""} onChange={(e) => set("website_url", e.target.value)} style={fieldStyle("website_url")} placeholder="https://..." />
              </Field>
              <Field label="LinkedIn" error={errors.linkedin_url}>
                <input className="glass-input w-full" value={form.linkedin_url || ""} onChange={(e) => set("linkedin_url", e.target.value)} style={fieldStyle("linkedin_url")} placeholder="https://linkedin.com/in/..." />
              </Field>
              <Field label="Instagram" error={errors.instagram_url}>
                <input className="glass-input w-full" value={form.instagram_url || ""} onChange={(e) => set("instagram_url", e.target.value)} style={fieldStyle("instagram_url")} placeholder="https://instagram.com/..." />
              </Field>
              <Field label="Discord">
                <input className="glass-input w-full" value={form.discord_tag || ""} onChange={(e) => set("discord_tag", e.target.value)} style={fieldStyle("discord_tag")} placeholder="username#0000" />
              </Field>
              <Field label="Slack Tag">
                <input className="glass-input w-full" value={form.slack_tag || ""} onChange={(e) => set("slack_tag", e.target.value)} style={fieldStyle("slack_tag")} placeholder="@username" />
              </Field>

              {/* Telegram */}
              <div>
                <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: "var(--text-quaternary)" }}>Telegram</label>
                {profile.telegram_chat_id ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 10,
                    background: "rgba(38,166,230,0.07)", border: "1px solid rgba(38,166,230,0.2)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <TelegramIcon size={16} />
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#26A6E6" }}>Connesso</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>ID {profile.telegram_chat_id}</span>
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => { updateProfile(profile.id, { telegram_chat_id: null, telegram_notifications_enabled: false }); onSaved({ ...profile, telegram_chat_id: null }); toast.success("Telegram disconnesso"); }}
                      style={{
                        fontSize: 11, fontWeight: 600, color: "rgba(239,68,68,0.7)",
                        background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)",
                        borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Scollega
                    </button>
                  </div>
                ) : (
                  <a
                    href={`https://t.me/${(import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || "iconoff_bot"}?start=${profile.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 16px", borderRadius: 10,
                      background: "rgba(38,166,230,0.08)", border: "1px solid rgba(38,166,230,0.2)",
                      color: "#26A6E6", fontSize: 13, fontWeight: 700, textDecoration: "none",
                    }}
                  >
                    <TelegramIcon size={16} />
                    Collega Telegram
                  </a>
                )}
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 sticky bottom-0"
            style={{ background: "var(--modal-bg)", borderTop: "1px solid var(--divider)" }}>
            <button type="button" onClick={onClose} className="glass-btn px-5 py-2 text-[13px]">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="glass-btn-primary flex items-center gap-2 px-5 py-2 text-[13px]">
              {saving && <MorphingSquare size={14} className="bg-white" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#26A6E6" />
      <path d="M5.5 11.8l2.9 1.1 1.1 3.6c.07.23.36.3.54.14l1.62-1.32 3.18 2.34c.32.24.78.07.88-.32l2.26-9.2c.12-.47-.35-.88-.8-.7L5.5 10.8c-.46.18-.46.83 0 1z" fill="white" />
      <path d="M9.5 14.5l-.3 2.1 1.1-1.1" fill="#26A6E6" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[13px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold" style={{ color: "var(--text-quaternary)" }}>
        {label} {required && <span style={{ color: "#f87171" }}>*</span>}
      </label>
      {children}
      {error && <span className="text-[10px]" style={{ color: "#f87171" }}>{error}</span>}
    </div>
  );
}
