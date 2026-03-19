export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  ownerId: string;
  folderId: string | null;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Telegram-sourced fields (optional)
  source?: "telegram";
  file_url?: string | null;
  file_name?: string | null;
  file_type?: "document" | "voice" | null;
  transcription?: string | null;
}

export interface TelegramNote {
  id: string;
  user_id: string;
  project_id: string | null;
  folder_name: string;        // e.g. "Generale" — set by the bot
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: "document" | "voice" | null;
  transcription: string | null;
  source: "telegram";
  created_at: string;
}

/** Deterministic folder ID: matches the folder created in INITIAL_FOLDERS below. */
export function telegramFolderId(userId: string, folderName: string): string {
  return `fld_tg_${userId}_${folderName}`;
}

export function telegramNoteToNote(tn: TelegramNote): Note {
  const rawTitle =
    tn.file_name ??
    (tn.transcription ? tn.transcription.slice(0, 50) + (tn.transcription.length > 50 ? "…" : "") : null) ??
    (tn.content.slice(0, 50) + (tn.content.length > 50 ? "…" : ""));
  const displayTitle = rawTitle || "Nota Telegram";
  // Map folder_name → deterministic folderId so notes land in the right folder
  const folderId = tn.folder_name
    ? telegramFolderId(tn.user_id, tn.folder_name)
    : null;
  return {
    id: tn.id,
    ownerId: tn.user_id,
    folderId,
    title: displayTitle,
    content: tn.transcription ?? tn.content,
    tags: [],
    isPinned: false,
    isArchived: false,
    createdAt: new Date(tn.created_at),
    updatedAt: new Date(tn.created_at),
    source: "telegram",
    file_url: tn.file_url,
    file_name: tn.file_name,
    file_type: tn.file_type,
    transcription: tn.transcription,
  };
}

export const TAG_PRESETS: Record<string, { color: string; label: string }> = {
  meeting: { color: "#60a5fa", label: "meeting" },
  personal: { color: "#a78bfa", label: "personal" },
  project: { color: "#34d399", label: "project" },
  idea: { color: "#fbbf24", label: "idea" },
  finance: { color: "#6ee7b7", label: "finance" },
  urgent: { color: "#ef4444", label: "urgent" },
  marketing: { color: "#fb923c", label: "marketing" },
  ops: { color: "#38bdf8", label: "ops" },
  hr: { color: "#f472b6", label: "hr" },
  research: { color: "#818cf8", label: "research" },
  design: { color: "#c084fc", label: "design" },
  branding: { color: "#e879f9", label: "branding" },
  planning: { color: "#34d399", label: "planning" },
};

function d(daysAgo: number, hours = 10): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(hours, 0, 0, 0);
  return dt;
}

// ─── FOLDERS ───

export const INITIAL_FOLDERS: NoteFolder[] = [
  // Owner (usr_001)
  { id: "fld_001", name: "Work", parentId: null, ownerId: "usr_001", icon: "💼", color: "#60a5fa", sortOrder: 0, createdAt: d(30), updatedAt: d(1) },
  { id: "fld_002", name: "Meetings", parentId: "fld_001", ownerId: "usr_001", icon: "📁", color: "#60a5fa", sortOrder: 0, createdAt: d(28), updatedAt: d(1) },
  { id: "fld_003", name: "Projects", parentId: "fld_001", ownerId: "usr_001", icon: "📁", color: "#34d399", sortOrder: 1, createdAt: d(28), updatedAt: d(3) },
  { id: "fld_004", name: "Personal", parentId: null, ownerId: "usr_001", icon: "🏠", color: "#a78bfa", sortOrder: 1, createdAt: d(25), updatedAt: d(0) },
  { id: "fld_005", name: "Ideas", parentId: null, ownerId: "usr_001", icon: "🧠", color: "#fbbf24", sortOrder: 2, createdAt: d(20), updatedAt: d(2) },
  { id: "fld_006", name: "Finance", parentId: null, ownerId: "usr_001", icon: "💰", color: "#6ee7b7", sortOrder: 3, createdAt: d(18), updatedAt: d(6) },

  // Marco (usr_002)
  { id: "fld_007", name: "Work", parentId: null, ownerId: "usr_002", icon: "💼", color: "#60a5fa", sortOrder: 0, createdAt: d(20), updatedAt: d(1) },

  // Sara (usr_003)
  { id: "fld_008", name: "Work", parentId: null, ownerId: "usr_003", icon: "💼", color: "#60a5fa", sortOrder: 0, createdAt: d(15), updatedAt: d(0) },

  // Elena (usr_004)
  { id: "fld_009", name: "Personal", parentId: null, ownerId: "usr_004", icon: "🏠", color: "#a78bfa", sortOrder: 0, createdAt: d(12), updatedAt: d(5) },

  // Denis (usr_005) — default folders + Telegram "Generale" section
  { id: "fld_tg_usr_005_Generale", name: "Generale", parentId: null, ownerId: "usr_005", icon: "📥", color: "#26A6E6", sortOrder: 0, createdAt: d(1), updatedAt: d(0) },
  { id: "fld_010", name: "Work",     parentId: null, ownerId: "usr_005", icon: "💼", color: "#60a5fa", sortOrder: 1, createdAt: d(7), updatedAt: d(1) },
  { id: "fld_011", name: "Personal", parentId: null, ownerId: "usr_005", icon: "🏠", color: "#a78bfa", sortOrder: 2, createdAt: d(7), updatedAt: d(1) },
  { id: "fld_012", name: "Ideas",    parentId: null, ownerId: "usr_005", icon: "🧠", color: "#fbbf24", sortOrder: 3, createdAt: d(7), updatedAt: d(1) },
];

// ─── NOTES ───

export const INITIAL_NOTES: Note[] = [
  // Owner (usr_001) — 12 notes
  {
    id: "note_001", ownerId: "usr_001", folderId: "fld_002", title: "Meeting Notes - Feb 24", isPinned: true, isArchived: false, tags: ["meeting"],
    createdAt: d(2), updatedAt: d(0, 8),
    content: `## Attendees\n- Marco, Sara, Elena\n\n## Agenda\n1. Q4 Review\n2. Budget Planning\n3. New hiring pipeline\n\n## Action Items\n- [x] Review Q4 numbers\n- [ ] Send proposal to client\n- [ ] Schedule follow-up meeting\n\n## Key Decisions\n- Budget increase approved for marketing\n- Hiring freeze lifted for engineering\n- New vendor onboarding starts March 1`,
  },
  {
    id: "note_002", ownerId: "usr_001", folderId: "fld_003", title: "Product Roadmap Q2", isPinned: true, isArchived: false, tags: ["project"],
    createdAt: d(5), updatedAt: d(1, 14),
    content: `## Q2 Priorities\n\n### Phase 1 (April)\n- Launch redesigned onboarding flow\n- A/B test new pricing page\n- Mobile app beta release\n\n### Phase 2 (May)\n- Analytics dashboard v2\n- API rate limiting improvements\n- Customer feedback integration\n\n### Phase 3 (June)\n- Enterprise features rollout\n- SSO implementation\n- Advanced reporting`,
  },
  {
    id: "note_018", ownerId: "usr_001", folderId: "fld_002", title: "Team Sync Feb 20", isPinned: false, isArchived: false, tags: ["meeting"],
    createdAt: d(6), updatedAt: d(6),
    content: `## Team Sync\n- Reviewed sprint progress\n- Discussed Q2 OKRs\n- Sara presenting campaign results next week`,
  },
  {
    id: "note_003", ownerId: "usr_001", folderId: "fld_003", title: "Client Brief - Acme Corp", isPinned: false, isArchived: false, tags: ["project"],
    createdAt: d(7), updatedAt: d(3),
    content: `## Client Overview\n**Company:** Acme Corp\n**Contact:** John Smith, VP Engineering\n**Budget:** €150k annual\n\n## Requirements\n- Custom dashboard integration\n- Real-time data sync\n- White-label solution\n\n## Timeline\n- Discovery: 2 weeks\n- MVP: 6 weeks\n- Launch: Q3 2025`,
  },
  {
    id: "note_004", ownerId: "usr_001", folderId: "fld_001", title: "Process Documentation", isPinned: false, isArchived: false, tags: ["project"],
    createdAt: d(10), updatedAt: d(4),
    content: `## Deploy Process\n\n1. Create feature branch\n2. Write tests\n3. Open PR for review\n4. Merge to staging\n5. QA verification\n6. Deploy to production\n\n## Rollback Procedure\n- Revert commit on main\n- Deploy previous version\n- Notify team in #ops channel`,
  },
  {
    id: "note_019", ownerId: "usr_001", folderId: "fld_004", title: "Gym Schedule", isPinned: false, isArchived: false, tags: ["personal"],
    createdAt: d(4), updatedAt: d(1),
    content: `## Weekly Schedule\n- Mon: Upper body\n- Tue: Cardio + core\n- Wed: Rest\n- Thu: Lower body\n- Fri: Full body\n- Sat: Yoga\n- Sun: Rest`,
  },
  {
    id: "note_008", ownerId: "usr_001", folderId: "fld_004", title: "Book Recommendations", isPinned: false, isArchived: false, tags: ["personal"],
    createdAt: d(3), updatedAt: d(0, 12),
    content: `## Reading List\n- Atomic Habits — James Clear\n- The Lean Startup — Eric Ries\n- Deep Work — Cal Newport\n- Thinking, Fast and Slow — Kahneman`,
  },
  {
    id: "note_020", ownerId: "usr_001", folderId: "fld_005", title: "App Feature Brainstorm", isPinned: false, isArchived: false, tags: ["idea"],
    createdAt: d(5), updatedAt: d(2),
    content: `## Feature Ideas\n- AI-powered search\n- Collaborative editing\n- Mobile offline mode\n- Dashboard widgets\n- Custom themes`,
  },
  {
    id: "note_021", ownerId: "usr_001", folderId: "fld_006", title: "Tax Deadlines 2025", isPinned: false, isArchived: false, tags: ["finance"],
    createdAt: d(15), updatedAt: d(10),
    content: `## Key Dates\n- March 31: Q1 VAT\n- June 30: Half-year filing\n- Sept 30: Q3 VAT\n- Dec 31: Annual close`,
  },
  {
    id: "note_005", ownerId: "usr_001", folderId: null, title: "Supplier Contacts", isPinned: false, isArchived: false, tags: ["finance"],
    createdAt: d(14), updatedAt: d(6),
    content: `## Active Suppliers\n\n| Supplier | Contact | Service |\n|----------|---------|----------|\n| TechCloud | maria@techcloud.it | Hosting |\n| DesignPro | luca@designpro.com | Graphics |\n| LegalPartners | info@legal.it | Legal |\n\n## Pending Evaluation\n- NewVendor Co — awaiting quote\n- FastShip — logistics proposal due March 5`,
  },
  {
    id: "note_006", ownerId: "usr_001", folderId: null, title: "Marketing Campaign Ideas", isPinned: false, isArchived: false, tags: ["idea", "marketing"],
    createdAt: d(8), updatedAt: d(2, 16),
    content: `## Campaign Concepts\n\n### 1. "Behind the Build"\n- Documentary-style content about product development\n- Weekly LinkedIn posts + YouTube shorts\n\n### 2. Customer Spotlight\n- Interview 5 key customers\n- Case study format\n\n### 3. Launch Event\n- Virtual product launch Q2\n- Invite 200 prospects\n- Live demo + Q&A`,
  },
  {
    id: "note_022", ownerId: "usr_001", folderId: null, title: "Random Thoughts", isPinned: false, isArchived: false, tags: ["personal"],
    createdAt: d(1), updatedAt: d(0),
    content: `Just some random thoughts about the product direction and team dynamics.\n\nNeed to revisit the onboarding funnel.`,
  },
  // Archived
  {
    id: "note_007", ownerId: "usr_001", folderId: null, title: "Weekly Standup Template", isPinned: false, isArchived: true, tags: ["meeting"],
    createdAt: d(20), updatedAt: d(7),
    content: `## Standup Template\n\n### What I did yesterday\n- \n\n### What I'm doing today\n- \n\n### Blockers\n- \n\n### Notes\n- `,
  },

  // Marco (usr_002)
  {
    id: "note_009", ownerId: "usr_002", folderId: "fld_007", title: "Operations Checklist", isPinned: true, isArchived: false, tags: ["ops"],
    createdAt: d(4), updatedAt: d(1),
    content: `## March Operations\n\n- [ ] Server migration to new region\n- [ ] Vendor onboarding (3 pending)\n- [ ] Compliance audit preparation\n- [ ] Update disaster recovery docs\n- [x] Renew SSL certificates`,
  },
  {
    id: "note_023", ownerId: "usr_002", folderId: "fld_007", title: "API Integration Notes", isPinned: false, isArchived: false, tags: ["project"],
    createdAt: d(8), updatedAt: d(5),
    content: `## API v2 Integration\n\n### Endpoints\n- POST /api/v2/sync\n- GET /api/v2/status\n\n### Auth: Bearer token\n### Rate limit: 100 req/min`,
  },

  // Sara (usr_003)
  {
    id: "note_012", ownerId: "usr_003", folderId: "fld_008", title: "Design System Notes", isPinned: true, isArchived: false, tags: ["design"],
    createdAt: d(3), updatedAt: d(0, 15),
    content: `## Design System v2\n\n### Colors\n- Primary: #3B82F6\n- Secondary: #6366F1\n\n### Typography\n- Headings: Satoshi\n- Body: Inter`,
  },
  {
    id: "note_024", ownerId: "usr_003", folderId: null, title: "Weekend Plans", isPinned: false, isArchived: false, tags: ["personal"],
    createdAt: d(1), updatedAt: d(0),
    content: `- Brunch at 11\n- Hiking in the afternoon\n- Movie night`,
  },

  // Elena (usr_004)
  {
    id: "note_025", ownerId: "usr_004", folderId: null, title: "Client Feedback", isPinned: false, isArchived: false, tags: ["project"],
    createdAt: d(5), updatedAt: d(2),
    content: `## Feedback from Acme\n- Love the new dashboard\n- Want more customization options\n- Request: export to PDF`,
  },
  {
    id: "note_026", ownerId: "usr_004", folderId: "fld_009", title: "Portfolio Ideas", isPinned: false, isArchived: false, tags: ["design"],
    createdAt: d(7), updatedAt: d(3),
    content: `## Portfolio Refresh\n- Minimalist layout\n- Case study format\n- Dark mode default\n- 3D elements`,
  },
];

// ─── TELEGRAM NOTES (mock) ───

export const INITIAL_TELEGRAM_NOTES: TelegramNote[] = [
  // Alessandro (usr_001)
  {
    id: "tg_001", user_id: "usr_001", project_id: null, folder_name: "Generale",
    content: "Ricordati di chiamare il commercialista domani alle 10 riguardo alla dichiarazione IVA del Q1.",
    file_url: null, file_name: null, file_type: null, transcription: null,
    source: "telegram", created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "tg_002", user_id: "usr_001", project_id: null, folder_name: "Generale",
    content: "",
    file_url: "https://example.com/voice/memo_001.ogg", file_name: "memo_001.ogg", file_type: "voice",
    transcription: "Per il meeting di domani ricordarsi di portare il report Q4, aggiornare le slide con i nuovi KPI e confermare la presenza di tutti i team lead.",
    source: "telegram", created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "tg_003", user_id: "usr_001", project_id: null, folder_name: "Generale",
    content: "Idea per nuovo feature: dashboard analytics con heatmap settimanale delle conversioni.",
    file_url: null, file_name: null, file_type: null, transcription: null,
    source: "telegram", created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "tg_004", user_id: "usr_001", project_id: null, folder_name: "Generale",
    content: "",
    file_url: "https://example.com/docs/contratto_fornitori.pdf", file_name: "contratto_fornitori.pdf", file_type: "document",
    transcription: null, source: "telegram", created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },

  // Denis (usr_005) — sample notes that match the seeded tasks
  {
    id: "tg_005", user_id: "usr_005", project_id: null, folder_name: "Generale",
    content: "Setup completato per il bot Telegram — testare tutti i comandi e verificare che le task si sincronizzino.",
    file_url: null, file_name: null, file_type: null, transcription: null,
    source: "telegram", created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: "tg_006", user_id: "usr_005", project_id: null, folder_name: "Generale",
    content: "Ricorda: review del budget Q1 da fare entro oggi — coinvolgere Elena per i dati design.",
    file_url: null, file_name: null, file_type: null, transcription: null,
    source: "telegram", created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];
