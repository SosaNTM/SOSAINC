import { useState, useEffect } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useSocialPublishingRules, useHashtagSets, useCaptionTemplates,
} from "../../../hooks/settings";
import type { HashtagSet, CaptionTemplate } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm, SettingsToggle,
} from "@/components/settings";

/* ── Hashtag form ───────────────────────────────────────────────────── */
interface HashtagForm { name: string; tagsText: string; }
const emptyHashtagForm = (): HashtagForm => ({ name: "", tagsText: "" });

/* ── Caption form ───────────────────────────────────────────────────── */
interface CaptionForm { name: string; body: string; platform: string; }
const emptyCaptionForm = (): CaptionForm => ({ name: "", body: "", platform: "" });

export default function PublishingRulesPage() {
  const { data: rules, loading: rulesLoading, upsert } = useSocialPublishingRules();
  const { data: hashtagSets, loading: hLoading, create: createH, update: updateH, remove: removeH } = useHashtagSets();
  const { data: captions, loading: cLoading, create: createC, update: updateC, remove: removeC } = useCaptionTemplates();

  /* Approval toggle */
  const [requireApproval, setRequireApproval] = useState(false);

  useEffect(() => {
    if (rules) {
      setRequireApproval(rules.require_approval ?? false);
    }
  }, [rules]);

  async function saveApproval(val: boolean) {
    setRequireApproval(val);
    const { error } = await upsert({
      require_approval: val,
      schedule: rules?.schedule ?? {},
      auto_hashtags: rules?.auto_hashtags ?? false,
      watermark_enabled: rules?.watermark_enabled ?? false,
      watermark_text: rules?.watermark_text ?? null,
    });
    if (error) { toast.error(error); }
    else { toast.success("Impostazione aggiornata"); }
  }

  /* ── Hashtag state ────────────────────────────────────────────────── */
  const [hModalOpen, setHModalOpen] = useState(false);
  const [hEditingId, setHEditingId] = useState<string | null>(null);
  const [hForm, setHForm] = useState<HashtagForm>(emptyHashtagForm());
  const [hDeleteTarget, setHDeleteTarget] = useState<HashtagSet | null>(null);
  const [hSaving, setHSaving] = useState(false);
  const [hDeleting, setHDeleting] = useState(false);

  function openCreateH() { setHEditingId(null); setHForm(emptyHashtagForm()); setHModalOpen(true); }
  function openEditH(h: HashtagSet) {
    setHEditingId(h.id);
    setHForm({ name: h.name, tagsText: h.hashtags.join(", ") });
    setHModalOpen(true);
  }
  async function handleSubmitH() {
    if (!hForm.name.trim()) return;
    const hashtags = hForm.tagsText.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
    setHSaving(true);
    if (hEditingId) {
      const { error } = await updateH(hEditingId, { name: hForm.name, hashtags });
      if (error) { toast.error(error); } else { toast.success("Set hashtag aggiornato"); }
    } else {
      const { error } = await createH({ name: hForm.name, hashtags, platforms: [], is_active: true });
      if (error) { toast.error(error); } else { toast.success("Set hashtag creato"); }
    }
    setHSaving(false);
    setHModalOpen(false);
  }
  async function handleDeleteH() {
    if (!hDeleteTarget) return;
    setHDeleting(true);
    const { error } = await removeH(hDeleteTarget.id);
    if (error) { toast.error(error); } else { toast.success("Set eliminato"); }
    setHDeleting(false);
    setHDeleteTarget(null);
  }

  /* ── Caption state ────────────────────────────────────────────────── */
  const [cModalOpen, setCModalOpen] = useState(false);
  const [cEditingId, setCEditingId] = useState<string | null>(null);
  const [cForm, setCForm] = useState<CaptionForm>(emptyCaptionForm());
  const [cDeleteTarget, setCDeleteTarget] = useState<CaptionTemplate | null>(null);
  const [cSaving, setCSaving] = useState(false);
  const [cDeleting, setCDeleting] = useState(false);

  function openCreateC() { setCEditingId(null); setCForm(emptyCaptionForm()); setCModalOpen(true); }
  function openEditC(c: CaptionTemplate) {
    setCEditingId(c.id);
    setCForm({ name: c.name, body: c.body, platform: c.platform ?? "" });
    setCModalOpen(true);
  }
  async function handleSubmitC() {
    if (!cForm.name.trim()) return;
    setCSaving(true);
    if (cEditingId) {
      const { error } = await updateC(cEditingId, {
        name: cForm.name, body: cForm.body, platform: cForm.platform || null,
      });
      if (error) { toast.error(error); } else { toast.success("Template aggiornato"); }
    } else {
      const { error } = await createC({
        name: cForm.name, body: cForm.body, platform: cForm.platform || null,
        variables: [], category_id: null, is_active: true,
      });
      if (error) { toast.error(error); } else { toast.success("Template creato"); }
    }
    setCSaving(false);
    setCModalOpen(false);
  }
  async function handleDeleteC() {
    if (!cDeleteTarget) return;
    setCDeleting(true);
    const { error } = await removeC(cDeleteTarget.id);
    if (error) { toast.error(error); } else { toast.success("Template eliminato"); }
    setCDeleting(false);
    setCDeleteTarget(null);
  }

  /* ── Hashtag columns ──────────────────────────────────────────────── */
  const hashtagColumns = [
    {
      key: "name",
      label: "Nome",
      render: (item: HashtagSet) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "hashtags",
      label: "Hashtag",
      render: (item: HashtagSet) => (
        <span style={{
          fontSize: 11, color: "var(--text-tertiary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          display: "block", maxWidth: 280,
        }}>
          {item.hashtags.join("  ")}
        </span>
      ),
    },
  ];

  /* ── Caption columns ──────────────────────────────────────────────── */
  const captionColumns = [
    {
      key: "name",
      label: "Nome",
      render: (item: CaptionTemplate) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "platform",
      label: "Piattaforma",
      width: "120px",
      render: (item: CaptionTemplate) => (
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {item.platform ?? "Tutte"}
        </span>
      ),
    },
    {
      key: "body",
      label: "Anteprima",
      render: (item: CaptionTemplate) => (
        <span style={{
          fontSize: 11, color: "var(--text-tertiary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          display: "block", maxWidth: 200,
        }}>
          {item.body}
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: "100%" }}>
      <SettingsPageHeader
        icon={CalendarClock}
        title="Regole di Pubblicazione"
        description="Configura la pianificazione dei contenuti"
      />

      {/* Card 1: Approvazione */}
      <SettingsCard title="Approvazione" description="Gestisci il flusso di approvazione dei contenuti">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)",
          }}>
            Richiedi approvazione manager
          </span>
          <SettingsToggle
            checked={requireApproval}
            onChange={saveApproval}
          />
        </div>
      </SettingsCard>

      {/* Card 2: Hashtag Sets */}
      <SettingsCard title="Hashtag Sets" description="Gruppi di hashtag salvati">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="btn-primary" onClick={openCreateH}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 14px" }}>
            <Plus style={{ width: 13, height: 13 }} /> Nuovo Set
          </button>
        </div>
        <SettingsTable<HashtagSet>
          columns={hashtagColumns}
          data={hashtagSets}
          onEdit={openEditH}
          onDelete={(item) => setHDeleteTarget(item)}
          emptyMessage="Nessun set di hashtag."
          emptyIcon={CalendarClock}
          loading={hLoading}
          onAdd={openCreateH}
        />
      </SettingsCard>

      {/* Card 3: Template Didascalia */}
      <SettingsCard title="Template Didascalia" description="Modelli riutilizzabili per le didascalie">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="btn-primary" onClick={openCreateC}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 14px" }}>
            <Plus style={{ width: 13, height: 13 }} /> Nuovo Template
          </button>
        </div>
        <SettingsTable<CaptionTemplate>
          columns={captionColumns}
          data={captions}
          onEdit={openEditC}
          onDelete={(item) => setCDeleteTarget(item)}
          emptyMessage="Nessun template di didascalia."
          emptyIcon={CalendarClock}
          loading={cLoading}
          onAdd={openCreateC}
        />
      </SettingsCard>

      {/* ── Hashtag Modal ──────────────────────────────────────────── */}
      <SettingsModal
        open={hModalOpen}
        onClose={() => setHModalOpen(false)}
        title={hEditingId ? "Modifica Set Hashtag" : "Nuovo Set Hashtag"}
        onSubmit={handleSubmitH}
        isLoading={hSaving}
      >
        <SettingsFormField label="Nome set" required>
          <input className="glass-input" value={hForm.name}
            onChange={(e) => setHForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Es. Brand Core" />
        </SettingsFormField>
        <SettingsFormField label="Hashtag" description="Uno per riga o separati da virgola">
          <textarea className="glass-input" value={hForm.tagsText}
            onChange={(e) => setHForm((f) => ({ ...f, tagsText: e.target.value }))}
            placeholder="#SOSA INC, #design, #studio" rows={4} style={{ resize: "vertical" }} />
        </SettingsFormField>
      </SettingsModal>

      {/* ── Caption Modal ──────────────────────────────────────────── */}
      <SettingsModal
        open={cModalOpen}
        onClose={() => setCModalOpen(false)}
        title={cEditingId ? "Modifica Template" : "Nuovo Template Didascalia"}
        onSubmit={handleSubmitC}
        isLoading={cSaving}
      >
        <SettingsFormField label="Nome" required>
          <input className="glass-input" value={cForm.name}
            onChange={(e) => setCForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome template" />
        </SettingsFormField>
        <SettingsFormField label="Piattaforma">
          <select className="glass-input" value={cForm.platform}
            onChange={(e) => setCForm((f) => ({ ...f, platform: e.target.value }))}>
            <option value="">Tutte</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="x">X (Twitter)</option>
          </select>
        </SettingsFormField>
        <SettingsFormField label="Corpo del template">
          <textarea className="glass-input" value={cForm.body}
            onChange={(e) => setCForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Scrivi il template della didascalia..."
            rows={5} style={{ resize: "vertical" }} />
        </SettingsFormField>
      </SettingsModal>

      {/* ── Delete confirms ────────────────────────────────────────── */}
      <SettingsDeleteConfirm
        open={hDeleteTarget !== null}
        onClose={() => setHDeleteTarget(null)}
        onConfirm={handleDeleteH}
        title="Elimina Set Hashtag"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={hDeleteTarget?.name}
        isLoading={hDeleting}
      />
      <SettingsDeleteConfirm
        open={cDeleteTarget !== null}
        onClose={() => setCDeleteTarget(null)}
        onConfirm={handleDeleteC}
        title="Elimina Template"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={cDeleteTarget?.name}
        isLoading={cDeleting}
      />
    </div>
  );
}
