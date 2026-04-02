/**
 * Zod validation schemas for all service-boundary inputs.
 * Use these before writing to Supabase to prevent bad data.
 */

import { z } from "zod";

// ─── Shared ────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();
export const portalIdSchema = z.string().min(1).max(50);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
export const positiveNumberSchema = z.number().nonnegative();
export const currencySchema = z.string().length(3).default("EUR");

// ─── Personal Transactions ─────────────────────────────────────────────────

export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);

export const newTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().positive("Amount must be positive"),
  currency: currencySchema,
  category: z.string().min(1).max(100).nullable().optional(),
  category_id: uuidSchema.nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  date: dateSchema,
  cost_classification: z.enum(["fixed", "variable", "semi-variable", "one-time"]).nullable().optional(),
  payment_method: z.string().max(50).nullable().optional(),
  reference: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(50)).nullable().optional(),
  user_id: uuidSchema,
});

export type NewTransactionInput = z.infer<typeof newTransactionSchema>;

// ─── Financial Goals ────────────────────────────────────────────────────────

export const newGoalSchema = z.object({
  name: z.string().min(1).max(100),
  target: z.number().positive("Target must be positive"),
  saved: z.number().nonnegative().default(0),
  deadline: dateSchema.nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").nullable().optional(),
  emoji: z.string().max(10).nullable().optional(),
  is_achieved: z.boolean().default(false),
  user_id: uuidSchema,
});

export type NewGoalInput = z.infer<typeof newGoalSchema>;

// ─── Investments ───────────────────────────────────────────────────────────

export const investmentTypeSchema = z.enum(["stock", "etf", "crypto", "bonds", "real_estate", "other"]);

export const newInvestmentSchema = z.object({
  name: z.string().min(1).max(100),
  ticker: z.string().max(20).nullable().optional(),
  type: investmentTypeSchema,
  units: z.number().positive("Units must be positive"),
  avg_buy_price: z.number().nonnegative(),
  current_price: z.number().nonnegative().nullable().optional(),
  currency: currencySchema,
  color: z.string().max(20).nullable().optional(),
  emoji: z.string().max(10).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  user_id: uuidSchema,
});

export type NewInvestmentInput = z.infer<typeof newInvestmentSchema>;

// ─── Budget Limits ─────────────────────────────────────────────────────────

export const newBudgetLimitSchema = z.object({
  category: z.string().min(1).max(100),
  monthly_limit: z.number().nonnegative(),
  category_id: uuidSchema.nullable().optional(),
  user_id: uuidSchema.nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  icon_name: z.string().max(50).nullable().optional(),
});

export type NewBudgetLimitInput = z.infer<typeof newBudgetLimitSchema>;

// ─── Vault Items ───────────────────────────────────────────────────────────

export const vaultItemTypeSchema = z.enum(["password", "card", "note", "identity", "other"]);

export const newVaultItemSchema = z.object({
  name: z.string().min(1).max(200),
  type: vaultItemTypeSchema,
  username: z.string().max(200).nullable().optional(),
  url: z.string().url().nullable().optional().or(z.literal("")),
  encrypted_data: z.string().min(1, "Encrypted data is required"),
  notes: z.string().max(2000).nullable().optional(),
  is_favorite: z.boolean().default(false),
  tags: z.array(z.string().max(50)).nullable().optional(),
  user_id: uuidSchema,
});

export type NewVaultItemInput = z.infer<typeof newVaultItemSchema>;

// ─── Finance Categories ─────────────────────────────────────────────────────

export const financeCategoryTypeSchema = z.enum([
  "income", "expense", "revenue", "cogs", "opex", "other", "business",
]);

export const newFinanceCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  type: financeCategoryTypeSchema,
  color: z.string().max(20).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().nonnegative().default(0),
  created_by: uuidSchema.nullable().optional(),
  updated_by: uuidSchema.nullable().optional(),
});

export type NewFinanceCategoryInput = z.infer<typeof newFinanceCategorySchema>;

// ─── Notes ────────────────────────────────────────────────────────────────

export const newNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000).optional(),
  folder_id: uuidSchema.nullable().optional(),
  is_pinned: z.boolean().default(false),
  is_encrypted: z.boolean().default(false),
  tags: z.array(z.string().max(50)).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  user_id: uuidSchema,
});

export type NewNoteInput = z.infer<typeof newNoteSchema>;

// ─── Tasks ────────────────────────────────────────────────────────────────

export const taskStatusSchema = z.enum(["backlog", "todo", "in_progress", "in_review", "done", "cancelled"]);
export const taskPrioritySchema = z.enum(["no_priority", "urgent", "high", "medium", "low"]);

export const newTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).nullable().optional(),
  status: taskStatusSchema.default("todo"),
  priority: taskPrioritySchema.default("no_priority"),
  assigned_to: uuidSchema.nullable().optional(),
  creator_id: uuidSchema,
  project_id: uuidSchema.nullable().optional(),
  due_date: dateSchema.nullable().optional(),
  estimate: z.number().nonnegative().nullable().optional(),
  labels: z.array(z.string().max(50)).default([]),
  parent_id: uuidSchema.nullable().optional(),
});

export type NewTaskInput = z.infer<typeof newTaskSchema>;

// ─── Social Posts ──────────────────────────────────────────────────────────

export const socialPostStatusSchema = z.enum(["draft", "scheduled", "published", "deleted"]);
export const socialPlatformSchema = z.enum(["instagram", "twitter", "facebook", "linkedin", "tiktok", "youtube", "other"]);

export const newSocialPostSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().max(5000),
  platform: socialPlatformSchema,
  status: socialPostStatusSchema.default("draft"),
  scheduled_at: z.string().datetime().nullable().optional(),
  media_urls: z.array(z.string()).nullable().optional(),
  hashtags: z.array(z.string().max(100)).nullable().optional(),
  creator_id: uuidSchema,
});

export type NewSocialPostInput = z.infer<typeof newSocialPostSchema>;

// ─── Validation helper ─────────────────────────────────────────────────────

/**
 * Safely parse with a schema. Returns { success: true, data } or { success: false, errors }.
 * Never throws.
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, input: unknown):
  | { success: true; data: T }
  | { success: false; errors: string[] } {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}
