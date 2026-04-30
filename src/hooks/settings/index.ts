import { usePortalData } from "../usePortalData";
import { supabase } from "../../lib/supabase";
import { usePortalDB } from "../../lib/portalContextDB";
import { useState, useEffect, useCallback } from "react";
import type {
  IncomeCategory, ExpenseCategory, SubscriptionCategory,
  PaymentMethod, RecurrenceRule, CurrencySettings, TaxRate,
  ProjectStatus, TaskPriority, TaskLabel, TaskTemplate,
  SocialPublishingRules, HashtagSet, ContentCategory, CaptionTemplate, SocialConnection,
  Role, RolePermission, Department, NotificationChannel, AlertRule,
  PortalProfile, AppearanceSettings,
} from "../../types/settings";

// Finance
export const useIncomeCategories       = () => usePortalData<IncomeCategory>("income_categories",             { orderBy: "sort_order" });
export const useExpenseCategories      = () => usePortalData<ExpenseCategory>("expense_categories",            { orderBy: "sort_order" });
export const useSubscriptionCategories = () => usePortalData<SubscriptionCategory>("subscription_categories", { orderBy: "sort_order" });
export const usePaymentMethods         = () => usePortalData<PaymentMethod>("payment_methods",                 { orderBy: "sort_order" });
export const useRecurrenceRules        = () => usePortalData<RecurrenceRule>("recurrence_rules",               { orderBy: "created_at" });
export const useTaxRates               = () => usePortalData<TaxRate>("tax_rates",                             { orderBy: "rate" });

// Projects
export const useProjectStatuses  = () => usePortalData<ProjectStatus>("project_statuses", { orderBy: "sort_order" });
export const useTaskPriorities   = () => usePortalData<TaskPriority>("task_priorities",   { orderBy: "sort_order" });
export const useTaskLabels       = () => usePortalData<TaskLabel>("task_labels",           { orderBy: "name" });
export const useTaskTemplates    = () => usePortalData<TaskTemplate>("task_templates",     { orderBy: "name" });

// Social
export const useSocialConnections = () => usePortalData<SocialConnection>("social_connections", { orderBy: "created_at" });
export const useHashtagSets       = () => usePortalData<HashtagSet>("hashtag_sets",            { orderBy: "name" });
export const useContentCategories = () => usePortalData<ContentCategory>("content_categories",  { orderBy: "sort_order" });
export const useCaptionTemplates  = () => usePortalData<CaptionTemplate>("caption_templates",   { orderBy: "name" });

// Team
export const useRoles       = () => usePortalData<Role>("roles",             { orderBy: "sort_order" });
export const useDepartments = () => usePortalData<Department>("departments", { orderBy: "sort_order" });

// Notifications
export const useAlertRules = () => usePortalData<AlertRule>("alert_rules", { orderBy: "created_at" });

function singletonSwrKey(table: string, portalId: string) {
  return `swr_single_${table}_${portalId}`;
}

function readSingletonCache<T>(table: string, portalId: string): T | null {
  try {
    const raw = localStorage.getItem(singletonSwrKey(table, portalId));
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return null;
}

function writeSingletonCache<T>(table: string, portalId: string, row: T) {
  try { localStorage.setItem(singletonSwrKey(table, portalId), JSON.stringify(row)); } catch { /* quota exceeded */ }
}

// Singleton hooks (one row per portal)
function useSingleton<T>(tableName: string) {
  const { currentPortalId } = usePortalDB();

  const [data, setData] = useState<T | null>(() => {
    if (!currentPortalId) return null;
    return readSingletonCache<T>(tableName, currentPortalId);
  });

  const [loading, setLoading] = useState(() => {
    if (!currentPortalId) return true;
    return readSingletonCache(tableName, currentPortalId) === null;
  });

  const fetchData = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }

    // Show cache immediately, fetch fresh in background
    const cached = readSingletonCache<T>(tableName, currentPortalId);
    if (cached !== null) { setData(cached); setLoading(false); }

    const { data: row } = await supabase
      .from(tableName).select("*").eq("portal_id", currentPortalId).single();
    setData(row as T | null);
    if (row) writeSingletonCache(tableName, currentPortalId, row as T);
    setLoading(false);
  }, [currentPortalId, tableName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const upsert = useCallback(async (payload: Partial<T>) => {
    const { data: row, error } = await supabase
      .from(tableName)
      .upsert({ ...payload, portal_id: currentPortalId }, { onConflict: "portal_id" })
      .select().single();
    if (!error && row) {
      setData(row as T);
      if (currentPortalId) writeSingletonCache(tableName, currentPortalId, row as T);
    }
    return { data: row as T | null, error: error?.message ?? null };
  }, [currentPortalId, tableName]);

  return { data, loading, refetch: fetchData, upsert };
}

export const useCurrencySettings      = () => useSingleton<CurrencySettings>("currency_settings");
export const useSocialPublishingRules = () => useSingleton<SocialPublishingRules>("social_publishing_rules");
export const usePortalProfile         = () => useSingleton<PortalProfile>("portal_profiles");
export const useAppearanceSettings    = () => useSingleton<AppearanceSettings>("appearance_settings");

// Notification channels (list but auto-seeded per portal)
export const useNotificationChannels = () => usePortalData<NotificationChannel>("notification_channels", { orderBy: "channel_type" });

// Role permissions (list scoped by role_id usually)
export const useRolePermissions = (roleId?: string) =>
  usePortalData<RolePermission>("role_permissions", roleId ? { filter: { role_id: roleId } } : {});
