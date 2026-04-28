// DEPRECATED — all types have been consolidated into src/types/database.ts.
// This file re-exports for backwards compatibility only; import from @/types/database going forward.

export type {
  SocialPlatformDB,
  SocialConnection,
  SocialAnalyticsSnapshot,
  DbSocialConnection,
} from "@/types/database";

// Legacy aliases retained so old imports don't break at runtime.
// SubscriptionRow, PersonalTransactionRow — these were stale (had columns not in DB).
// Import DbSubscription, DbPersonalTransaction from @/types/database instead.
