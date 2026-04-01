// ═══════════════════════════════════════════════════════════════════
// Centralized error logging service.
//
// In development: logs to the browser console with module/action context.
// In production: placeholder for Sentry, Datadog, or similar service.
//
// Usage:
//   import { logError, logWarning, logInfo } from "@/lib/errorLogger";
//   logError(err, { module: "finance", action: "loadTransactions", portalId });
// ═══════════════════════════════════════════════════════════════════

type ErrorSeverity = "info" | "warning" | "error" | "fatal";

interface ErrorContext {
  module?: string;
  action?: string;
  userId?: string;
  portalId?: string;
  extra?: Record<string, unknown>;
}

const IS_DEV = import.meta.env.DEV;

// TODO: Replace with Sentry.captureException() or Datadog.addError() in production
function sendToService(
  _error: Error,
  _severity: ErrorSeverity,
  _context: ErrorContext
) {
  // Placeholder for production error service integration
  // Example Sentry integration:
  // Sentry.withScope((scope) => {
  //   scope.setLevel(severity);
  //   scope.setTags({ module: context.module, action: context.action });
  //   scope.setUser({ id: context.userId });
  //   Sentry.captureException(error);
  // });
}

export function logError(error: unknown, context: ErrorContext = {}) {
  const err = error instanceof Error ? error : new Error(String(error));

  if (IS_DEV) {
    console.error(
      `[${context.module || "app"}] ${context.action || "error"}:`,
      err,
      context.extra
    );
  }

  sendToService(err, "error", context);
}

export function logWarning(message: string, context: ErrorContext = {}) {
  if (IS_DEV) {
    console.warn(`[${context.module || "app"}] ${message}`, context.extra);
  }

  sendToService(new Error(message), "warning", context);
}

export function logInfo(message: string, context: ErrorContext = {}) {
  if (IS_DEV) {
    console.info(`[${context.module || "app"}] ${message}`);
  }

  sendToService(new Error(message), "info", context);
}
