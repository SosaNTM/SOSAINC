import * as Sentry from "@sentry/react";

type ErrorSeverity = "info" | "warning" | "error" | "fatal";

interface ErrorContext {
  module?: string;
  action?: string;
  userId?: string;
  portalId?: string;
  extra?: Record<string, unknown>;
}

const SENTRY_ACTIVE = !!import.meta.env.VITE_SENTRY_DSN;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function sendToSupabase(error: Error, severity: ErrorSeverity, context: ErrorContext) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  const body = JSON.stringify({
    message: error.message,
    stack: error.stack ?? null,
    severity,
    module: context.module ?? null,
    action: context.action ?? null,
    portal_id: context.portalId ?? null,
    extra: context.extra ?? null,
  });
  // Fire-and-forget: don't await, don't let failures surface to callers
  fetch(`${SUPABASE_URL}/rest/v1/error_logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
    body,
  }).catch(() => undefined);
}

function sendToService(error: Error, severity: ErrorSeverity, context: ErrorContext) {
  // Always log to console so Vercel/platform captures it
  const tag = `[${context.module ?? "app"}] ${context.action ?? "error"}`;
  if (severity === "warning" || severity === "info") {
    console.warn(tag, error.message, context.extra);
  } else {
    console.error(tag, error.message, context.extra);
  }

  if (SENTRY_ACTIVE) {
    Sentry.withScope((scope) => {
      scope.setLevel(
        severity === "fatal" ? "fatal"
        : severity === "error" ? "error"
        : severity === "warning" ? "warning"
        : "info"
      );
      if (context.module) scope.setTag("module", context.module);
      if (context.action) scope.setTag("action", context.action);
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.portalId) scope.setTag("portalId", context.portalId);
      if (context.extra) scope.setExtras(context.extra);
      Sentry.captureException(error);
    });
  } else {
    sendToSupabase(error, severity, context);
  }
}

export function logError(error: unknown, context: ErrorContext = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  sendToService(err, "error", context);
}

export function logWarning(message: string, context: ErrorContext = {}) {
  sendToService(new Error(message), "warning", context);
}

export function logInfo(message: string, context: ErrorContext = {}) {
  sendToService(new Error(message), "info", context);
}
