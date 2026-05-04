export type OutreachStatus =
  | "new"
  | "contacted"
  | "replied"
  | "qualified"
  | "converted"
  | "rejected";

export type SearchStatus = "pending" | "running" | "completed" | "failed";
export type OutreachChannel = "email" | "dm_instagram" | "call" | "pec";
export type OutreachDirection = "outbound" | "inbound";

export interface LeadgenSettings {
  id: string;
  portal_id: string;
  apify_token: string | null;
  default_country_code: string;
  default_language: string;
  default_max_places: number;
  scrape_contacts: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadgenSearch {
  id: string;
  portal_id: string;
  country_code: string;
  postal_code: string;
  category: string;
  status: SearchStatus;
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  total_results: number;
  with_website: number;
  without_website: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface LeadgenLead {
  id: string;
  portal_id: string;
  search_id: string | null;
  place_id: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country_code: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
  reviews_count: number | null;
  emails: string[];
  social_media: Record<string, string>;
  has_website: boolean;
  outreach_status: OutreachStatus;
  outreach_notes: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadgenOutreachEvent {
  id: string;
  portal_id: string;
  lead_id: string;
  channel: OutreachChannel;
  direction: OutreachDirection;
  notes: string | null;
  occurred_at: string;
}

// Shape returned by Apify Google Maps Scraper dataset items
export interface ApifyPlaceResult {
  placeId: string;
  title: string;
  address: string | null;
  zip: string | null;
  city: string | null;
  countryCode: string | null;
  phone: string | null;
  website: string | null;
  categoryName: string | null;
  totalScore: number | null;
  reviewsCount: number | null;
  emails: string[] | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
}
