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
  discord_tag: string | null;
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
  portal?: string;
}

export interface ProfileStats {
  clients: number;
  invoices: number;
  revenue: number;
  products: number;
  pending: number;
}

import { STORAGE_PROFILE_PREFIX } from "@/constants/storageKeys";

const STORAGE_KEY = STORAGE_PROFILE_PREFIX;

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
    discord_tag: null,
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

// No pre-seeded profiles — each user's profile is created fresh on first login
const SEED_PROFILES: Record<string, Partial<Profile>> = {};

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
const MOCK_STATS: Record<string, ProfileStats> = {};

export function getProfileStats(userId: string): ProfileStats {
  return MOCK_STATS[userId] || { clients: 0, invoices: 0, revenue: 0, products: 0, pending: 0 };
}

// Per-user activity — now returns empty (real activities come from audit log)
export function getActivityFeed(_userId: string): ActivityItem[] {
  return [];
}

// Per-user revenue data — now returns empty (real data comes from transactions)
export function getRevenueData(_userId: string): { month: string; revenue: number; expenses: number }[] {
  return [];
}
