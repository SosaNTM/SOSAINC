/**
 * Per-user profile store using localStorage.
 * Each user gets their own profile record keyed by user ID.
 */

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  company_name: string | null;
  job_title: string | null;
  department: string | null;
  tax_id: string | null;
  business_type: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  brand_color: string;
  language: string;
  timezone: string;
  currency: string;
  date_format: string;
  website_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  slack_tag: string | null;
  extra_socials: { label: string; url: string }[];
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
  // Telegram bot integration
  telegram_chat_id: string | null;
  telegram_notifications_enabled: boolean;
  telegram_notification_time: string; // HH:MM:SS
  telegram_paused_until: string | null;
}

export interface ActivityItem {
  id: string;
  type: "invoice" | "client" | "payment" | "product" | "task" | "document";
  description: string;
  timestamp: Date;
  amount?: number;
}

export interface ProfileStats {
  clients: number;
  invoices: number;
  revenue: number;
  products: number;
  pending: number;
}

const STORAGE_KEY = "iconoff_profile_";

// Default profile factory
function createDefaultProfile(userId: string, email: string, displayName: string): Profile {
  const nameParts = displayName.split(" ");
  return {
    id: userId,
    first_name: nameParts[0] || null,
    last_name: nameParts.slice(1).join(" ") || null,
    display_name: displayName,
    email,
    phone: null,
    date_of_birth: null,
    company_name: null,
    job_title: null,
    department: null,
    tax_id: null,
    business_type: null,
    address_line_1: null,
    address_line_2: null,
    city: null,
    province: null,
    postal_code: null,
    country: "IT",
    avatar_url: null,
    cover_image_url: null,
    brand_color: "#00E5FF",
    language: "it",
    timezone: "Europe/Rome",
    currency: "EUR",
    date_format: "DD/MM/YYYY",
    website_url: null,
    linkedin_url: null,
    instagram_url: null,
    slack_tag: null,
    extra_socials: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    onboarding_completed: false,
    telegram_chat_id: null,
    telegram_notifications_enabled: false,
    telegram_notification_time: "08:00:00",
    telegram_paused_until: null,
  };
}

// Pre-seeded profiles for mock users
const SEED_PROFILES: Record<string, Partial<Profile>> = {
  usr_001: {
    first_name: "Alessandro", last_name: "Rossi", display_name: "Alessandro",
    job_title: "CEO & Founder", department: "Executive", company_name: "ICONOFF SRL",
    business_type: "SRL", tax_id: "IT12345678901", phone: "+39 02 1234 5678",
    date_of_birth: "1985-01-14", city: "Milan", province: "MI", postal_code: "20121",
    address_line_1: "Via Monte Napoleone 8", country: "IT", brand_color: "#00E5FF",
    website_url: "https://iconoff.com", linkedin_url: "https://linkedin.com/in/alessandro-rossi",
    instagram_url: "https://instagram.com/iconoff", onboarding_completed: true,
  },
  usr_002: {
    first_name: "Marco", last_name: "Bianchi", display_name: "Marco",
    job_title: "Operations Manager", department: "Operations", company_name: "ICONOFF SRL",
    business_type: "SRL", phone: "+39 02 8765 4321",
    date_of_birth: "1990-02-15", city: "Milan", province: "MI", postal_code: "20121",
    address_line_1: "Via Torino 15", country: "IT", brand_color: "#8B5CF6",
    onboarding_completed: true,
  },
  usr_003: {
    first_name: "Sara", last_name: "Conti", display_name: "Sara",
    job_title: "Marketing Specialist", department: "Marketing", company_name: "ICONOFF SRL",
    phone: "+39 02 5555 1234", date_of_birth: "1995-03-10", city: "Rome", province: "RM",
    postal_code: "00100", address_line_1: "Via del Corso 22", country: "IT",
    brand_color: "#F43F5E", onboarding_completed: true,
  },
  usr_004: {
    first_name: "Elena", last_name: "Neri", display_name: "Elena",
    job_title: "Designer", department: "Design", company_name: "ICONOFF SRL",
    phone: "+39 02 9999 8888", date_of_birth: "1992-04-20", city: "Florence", province: "FI",
    postal_code: "50100", address_line_1: "Via dei Calzaiuoli 12", country: "IT",
    brand_color: "#F59E0B", onboarding_completed: true,
  },
  usr_005: {
    first_name: "Denis", last_name: "", display_name: "Denis",
    job_title: "Co-Founder", department: "Executive", company_name: "ICONOFF SRL",
    business_type: "SRL", city: "Milan", province: "MI", country: "IT",
    brand_color: "#10B981", onboarding_completed: false,
  },
};

export function getProfile(userId: string, email: string, displayName: string): Profile {
  const key = STORAGE_KEY + userId;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  
  // Create from seed or default
  const seed = SEED_PROFILES[userId] || {};
  const profile = { ...createDefaultProfile(userId, email, displayName), ...seed, id: userId, email };
  localStorage.setItem(key, JSON.stringify(profile));
  return profile;
}

export function updateProfile(userId: string, updates: Partial<Profile>): Profile {
  const key = STORAGE_KEY + userId;
  let current: Profile;
  try {
    current = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    current = {} as Profile;
  }
  const updated = { ...current, ...updates, id: userId, updated_at: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new Event("profile-changed"));
  return updated;
}

// Per-user mock stats
const MOCK_STATS: Record<string, ProfileStats> = {
  usr_001: { clients: 24, invoices: 156, revenue: 284500, products: 12, pending: 8 },
  usr_002: { clients: 15, invoices: 89, revenue: 142300, products: 6, pending: 3 },
  usr_003: { clients: 8, invoices: 34, revenue: 67800, products: 4, pending: 2 },
  usr_004: { clients: 5, invoices: 22, revenue: 45600, products: 3, pending: 1 },
  usr_005: { clients: 18, invoices: 112, revenue: 198700, products: 9, pending: 5 },
};

export function getProfileStats(userId: string): ProfileStats {
  return MOCK_STATS[userId] || { clients: 0, invoices: 0, revenue: 0, products: 0, pending: 0 };
}

// Per-user mock activity
export function getActivityFeed(userId: string): ActivityItem[] {
  const now = new Date();
  const h = (hours: number) => new Date(now.getTime() - hours * 3600000);
  
  const feeds: Record<string, ActivityItem[]> = {
    usr_001: [
      { id: "a1", type: "invoice", description: "Created Invoice #INV-2025-0156", timestamp: h(2), amount: 4500 },
      { id: "a2", type: "payment", description: "Payment received from Luxe Brands", timestamp: h(5), amount: 12800 },
      { id: "a3", type: "client", description: "Added new client: Milano Fashion Group", timestamp: h(12) },
      { id: "a4", type: "task", description: "Completed: Q1 Financial Review", timestamp: h(24) },
      { id: "a5", type: "product", description: "Updated pricing for Premium Package", timestamp: h(36) },
      { id: "a6", type: "invoice", description: "Sent Invoice #INV-2025-0155 to Verdi & Co.", timestamp: h(48), amount: 8200 },
      { id: "a7", type: "document", description: "Uploaded Q4 2024 financial report", timestamp: h(72) },
      { id: "a8", type: "payment", description: "Payment received from TechStart SRL", timestamp: h(96), amount: 3400 },
    ],
    usr_002: [
      { id: "a1", type: "task", description: "Assigned: Server migration planning", timestamp: h(1) },
      { id: "a2", type: "document", description: "Uploaded vendor contract draft", timestamp: h(8) },
      { id: "a3", type: "client", description: "Updated contact for Rossi & Partners", timestamp: h(18) },
      { id: "a4", type: "invoice", description: "Approved Invoice #INV-2025-0148", timestamp: h(30), amount: 6700 },
    ],
    usr_003: [
      { id: "a1", type: "task", description: "Started: Social media calendar for March", timestamp: h(3) },
      { id: "a2", type: "document", description: "Published blog post: Spring Trends", timestamp: h(16) },
      { id: "a3", type: "product", description: "Created campaign brief for Q2", timestamp: h(28) },
    ],
    usr_004: [
      { id: "a1", type: "task", description: "Completed: Brand guidelines v2", timestamp: h(4) },
      { id: "a2", type: "document", description: "Uploaded design system components", timestamp: h(20) },
      { id: "a3", type: "product", description: "Finalized logo variations", timestamp: h(40) },
    ],
  };
  return feeds[userId] || feeds.usr_001 || [];
}

// Per-user mock revenue data (last 6 months)
export function getRevenueData(userId: string): { month: string; revenue: number; expenses: number }[] {
  const data: Record<string, { month: string; revenue: number; expenses: number }[]> = {
    usr_001: [
      { month: "Oct", revenue: 42000, expenses: 18000 }, { month: "Nov", revenue: 48000, expenses: 21000 },
      { month: "Dec", revenue: 55000, expenses: 24000 }, { month: "Jan", revenue: 38000, expenses: 19000 },
      { month: "Feb", revenue: 52000, expenses: 22000 }, { month: "Mar", revenue: 49500, expenses: 20000 },
    ],
    usr_002: [
      { month: "Oct", revenue: 21000, expenses: 12000 }, { month: "Nov", revenue: 24000, expenses: 14000 },
      { month: "Dec", revenue: 28000, expenses: 15000 }, { month: "Jan", revenue: 19000, expenses: 11000 },
      { month: "Feb", revenue: 26000, expenses: 13000 }, { month: "Mar", revenue: 24300, expenses: 12500 },
    ],
  };
  return data[userId] || data.usr_001 || [];
}
