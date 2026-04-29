import { useState } from "react";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { MorphingSquare } from "@/components/ui/morphing-square";
import { toast } from "sonner";
import type { Profile } from "@/lib/profileStore";
import { updateProfile } from "@/lib/profileStore";

interface Props {
  profile: Profile;
  open: boolean;
  onComplete: (p: Profile) => void;
}

const BUSINESS_TYPES = ["Freelancer", "SRL", "SPA", "Ditta Individuale", "Associazione", "Altro"];

export function OnboardingModal({ profile, open, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<Profile>>({ ...profile });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const set = (key: keyof Profile, val: string | null) => setForm((p) => ({ ...p, [key]: val }));

  const steps = [
    {
      title: "Welcome to SOSA INC 👋",
      subtitle: "Let's set up your profile in a few quick steps.",
      content: (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="First Name">
              <input className="glass-input w-full" value={form.first_name || ""} onChange={(e) => set("first_name", e.target.value)} style={{ padding: "12px 14px", fontSize: 13 }} />
            </FormField>
            <FormField label="Last Name">
              <input className="glass-input w-full" value={form.last_name || ""} onChange={(e) => set("last_name", e.target.value)} style={{ padding: "12px 14px", fontSize: 13 }} />
            </FormField>
          </div>
          <FormField label="Company">
            <input className="glass-input w-full" value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} style={{ padding: "12px 14px", fontSize: 13 }} />
          </FormField>
          <FormField label="Job Title">
            <input className="glass-input w-full" value={form.job_title || ""} onChange={(e) => set("job_title", e.target.value)} style={{ padding: "12px 14px", fontSize: 13 }} />
          </FormField>
        </div>
      ),
    },
    {
      title: "Business Details",
      subtitle: "Help us understand your business setup.",
      content: (
        <div className="flex flex-col gap-4">
          <FormField label="Tax ID (P.IVA / Codice Fiscale)">
            <input className="glass-input w-full" value={form.tax_id || ""} onChange={(e) => set("tax_id", e.target.value.toUpperCase())} style={{ padding: "12px 14px", fontSize: 13 }} placeholder="IT12345678901" maxLength={16} />
          </FormField>
          <FormField label="Business Type">
            <select className="glass-input w-full" value={form.business_type || ""} onChange={(e) => set("business_type", e.target.value || null)} style={{ padding: "12px 14px", fontSize: 13 }}>
              <option value="">Select...</option>
              {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Address">
            <input className="glass-input w-full" value={form.address_line_1 || ""} onChange={(e) => set("address_line_1", e.target.value)} style={{ padding: "12px 14px", fontSize: 13 }} placeholder="Via Roma 1" />
          </FormField>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
            <FormField label="City">
              <input className="glass-input w-full" value={form.city || ""} onChange={(e) => set("city", e.target.value)} style={{ padding: "12px 14px", fontSize: 13 }} />
            </FormField>
            <FormField label="Province">
              <input className="glass-input w-full" value={form.province || ""} onChange={(e) => set("province", e.target.value)} style={{ padding: "12px 14px", fontSize: 13 }} maxLength={2} />
            </FormField>
            <FormField label="Postal Code">
              <input className="glass-input w-full" value={form.postal_code || ""} onChange={(e) => set("postal_code", e.target.value)} style={{ padding: "12px 14px", fontSize: 13 }} maxLength={10} />
            </FormField>
          </div>
        </div>
      ),
    },
    {
      title: "Personalize",
      subtitle: "Make it yours with a brand color and avatar.",
      content: (
        <div className="flex flex-col gap-5 items-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>Brand Color</p>
            <div className="flex gap-3">
              {["#00E5FF", "#8B5CF6", "#F43F5E", "#10B981", "#F59E0B", "#3B82F6"].map((c) => (
                <button type="button"
                  key={c}
                  onClick={() => set("brand_color", c)}
                  className="relative transition-transform hover:scale-110"
                  style={{
                    width: 44, height: 44, borderRadius: "50%", backgroundColor: c,
                    border: form.brand_color === c ? "3px solid rgba(255,255,255,0.8)" : "3px solid transparent",
                    boxShadow: form.brand_color === c ? `0 0 12px ${c}60` : "none",
                  }}
                >
                  {form.brand_color === c && <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "You're All Set! 🎉",
      subtitle: "Here's a quick summary of your profile.",
      content: (
        <div className="flex flex-col gap-3 py-2">
          {[
            ["Name", [form.first_name, form.last_name].filter(Boolean).join(" ") || "—"],
            ["Company", form.company_name || "—"],
            ["Title", form.job_title || "—"],
            ["Tax ID", form.tax_id || "—"],
            ["Location", [form.city, form.province].filter(Boolean).join(", ") || "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ background: "var(--glass-bg-subtle)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{label}</span>
              <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleFinish = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    const updated = updateProfile(profile.id, {
      ...form,
      display_name: [form.first_name, form.last_name].filter(Boolean).join(" ") || form.first_name,
      onboarding_completed: true,
    });
    setSaving(false);
    toast.success("Profile setup complete!");
    onComplete(updated);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(8px)" }} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[min(480px,calc(100%-2rem))] rounded-2xl overflow-hidden"
          style={{ background: "var(--modal-bg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid var(--divider)", boxShadow: "0 32px 100px rgba(0,0,0,0.15)" }}
        >
          {/* Progress */}
          <div className="flex gap-1 px-6 pt-5">
            {steps.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ background: i <= step ? "var(--accent-color)" : "var(--divider)" }} />
            ))}
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <h2 className="text-[20px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>{current.title}</h2>
            <p className="text-[13px] mb-6" style={{ color: "var(--text-tertiary)" }}>{current.subtitle}</p>
            {current.content}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--divider)" }}>
            <div>
              {step > 0 && (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="glass-btn flex items-center gap-1.5 px-4 py-2 text-[13px]">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
            </div>
            {isLast ? (
              <button type="button" onClick={handleFinish} disabled={saving} className="glass-btn-primary flex items-center gap-2 px-5 py-2 text-[13px]">
                {saving && <MorphingSquare size={14} className="bg-white" />}
                {saving ? "Finishing…" : "Get Started"}
              </button>
            ) : (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="glass-btn-primary flex items-center gap-1.5 px-5 py-2 text-[13px]">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold" style={{ color: "var(--text-quaternary)" }}>{label}</label>
      {children}
    </div>
  );
}
