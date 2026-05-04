const BASE = "https://api.apify.com/v2";
const ACTOR_ID = "compass~google-maps-scraper";

function headers(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apifyFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: headers(token) });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Apify ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface StartRunInput {
  searchStringsArray: string[];
  locationQuery: string;
  language?: string;
  maxCrawledPlacesPerSearch?: number;
  scrapeContacts?: boolean;
}

export interface RunStartResult {
  runId: string;
  defaultDatasetId: string;
}

export interface RunStatusResult {
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
  defaultDatasetId: string;
}

export async function startGoogleMapsRun(
  token: string,
  input: StartRunInput
): Promise<RunStartResult> {
  const body = {
    searchStringsArray: input.searchStringsArray,
    locationQuery: input.locationQuery,
    language: input.language ?? "it",
    maxCrawledPlacesPerSearch: input.maxCrawledPlacesPerSearch ?? 50,
    scrapeContacts: input.scrapeContacts ?? true,
  };
  const res = await apifyFetch<{ data: { id: string; defaultDatasetId: string } }>(
    token,
    `/acts/${ACTOR_ID}/runs`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return { runId: res.data.id, defaultDatasetId: res.data.defaultDatasetId };
}

export async function getRunStatus(token: string, runId: string): Promise<RunStatusResult> {
  const res = await apifyFetch<{
    data: { status: RunStatusResult["status"]; defaultDatasetId: string };
  }>(token, `/acts/${ACTOR_ID}/runs/${runId}`);
  return { status: res.data.status, defaultDatasetId: res.data.defaultDatasetId };
}

export async function getDatasetItems<T = unknown>(
  token: string,
  datasetId: string
): Promise<T[]> {
  const res = await apifyFetch<unknown>(
    token,
    `/datasets/${datasetId}/items?format=json&clean=true`
  );
  // Apify returns array directly for /items endpoint
  return Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] }).items ?? []);
}

export async function testConnection(token: string): Promise<{ username: string }> {
  const res = await apifyFetch<{ data: { username: string } }>(token, "/users/me");
  return { username: res.data.username };
}
