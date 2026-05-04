import { supabase } from "./supabase";

const CHANNEL_NAME = "leadgen-updates";
const LOCAL_EVENT = "leadgen-local-update";

export type LeadgenEvent =
  | "search_started"
  | "search_completed"
  | "search_failed"
  | "lead_updated";

let _channel = supabase.channel(CHANNEL_NAME);
let _subscribed = false;

function ensureSubscribed() {
  if (_subscribed) return;
  _channel.subscribe();
  _subscribed = true;
}

export function broadcastLeadgenUpdate(
  event: LeadgenEvent,
  payload?: Record<string, unknown>
) {
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: { event, ...payload } }));
  try {
    ensureSubscribed();
    _channel.send({ type: "broadcast", event, payload: { ...payload, timestamp: Date.now() } });
  } catch { /* Supabase not configured */ }
}

export function subscribeToLeadgenUpdates(
  callback: (event: LeadgenEvent, payload: Record<string, unknown>) => void
): () => void {
  const onLocal = (e: Event) => {
    const detail = (e as CustomEvent).detail ?? {};
    callback(detail.event ?? "lead_updated", detail);
  };
  window.addEventListener(LOCAL_EVENT, onLocal);

  let sub: ReturnType<typeof supabase.channel> | null = null;
  try {
    sub = supabase
      .channel(`${CHANNEL_NAME}-${Math.random()}`)
      .on("broadcast", { event: "search_started" },   ({ payload }) => callback("search_started",   payload ?? {}))
      .on("broadcast", { event: "search_completed" }, ({ payload }) => callback("search_completed", payload ?? {}))
      .on("broadcast", { event: "search_failed" },    ({ payload }) => callback("search_failed",    payload ?? {}))
      .on("broadcast", { event: "lead_updated" },     ({ payload }) => callback("lead_updated",     payload ?? {}))
      .subscribe();
  } catch { /* Supabase not configured */ }

  return () => {
    window.removeEventListener(LOCAL_EVENT, onLocal);
    if (sub) supabase.removeChannel(sub);
  };
}
