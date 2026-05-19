# Settings Inventory

Dati raccolti da: `src/pages/settings/`, `src/hooks/settings/index.ts`, `src/hooks/usePortalData.ts`, Supabase MCP `list_tables` + `pg_policies`.

---

## Legenda Stato

- ✅ Per-portale OK — hook corretto, RLS corretta, nessun leak
- ⚠️ Parziale — applicazione corretta ma RLS incompleta o issue minore
- ❌ Leak cross-portale — dati visibili/modificabili da altri portali
- 🚧 Non implementato

---

## Generale

| Voce | Rotta | File pagina | Hook | Tabella DB | Has portal_id | RLS SELECT | RLS INSERT WITH CHECK | Stato |
|---|---|---|---|---|---|---|---|---|
| Profilo Portale | `/settings/profile` | `general/PortalProfile.tsx` | `usePortalProfile()` → `useSingleton` | `portal_profiles` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Aspetto | `/settings/appearance` | `general/Appearance.tsx` | `useAppearanceSettings()` → `useSingleton` | `appearance_settings` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |

---

## Finanza

| Voce | Rotta | File pagina | Hook | Tabella DB | Has portal_id | RLS SELECT | RLS INSERT WITH CHECK | Stato |
|---|---|---|---|---|---|---|---|---|
| Categorie Entrate | `/settings/finance/income-categories` | `finance/IncomeCategories.tsx` | `useIncomeCategories()` → `usePortalData` | `income_categories` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Categorie Uscite | `/settings/finance/expense-categories` | `finance/ExpenseCategories.tsx` | `useExpenseCategories()` → `usePortalData` | `expense_categories` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Categorie Abbonamenti | `/settings/finance/subscription-categories` | `finance/SubscriptionCategories.tsx` | `useSubscriptionCategories()` → `usePortalData` | `subscription_categories` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Metodi di Pagamento | `/settings/finance/payment-methods` | `finance/PaymentMethods.tsx` | `usePaymentMethods()` → `usePortalData` | `payment_methods` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Regole Ricorrenza | `/settings/finance/recurrence-rules` | `finance/RecurrenceRules.tsx` | `useRecurrenceRules()` → `usePortalData` | `recurrence_rules` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Valuta & Tasse | `/settings/finance/currency-tax` | `finance/CurrencyTax.tsx` | `useCurrencySettings()` → `useSingleton`; `useTaxRates()` → `usePortalData` | `currency_settings`, `tax_rates` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Categorie Transazioni | `/settings/finance/transaction-categories` | `finance/TransactionCategories.tsx` | `useFinanceCategories()` (custom hook separato) | `finance_transaction_categories` | ✅ UUID | ✅ portal_members (public role) | ❌ NULL | ⚠️ |

---

## Progetti

| Voce | Rotta | File pagina | Hook | Tabella DB | Has portal_id | RLS SELECT | RLS INSERT WITH CHECK | Stato |
|---|---|---|---|---|---|---|---|---|
| Stati Progetto | `/settings/projects/statuses` | `projects/ProjectStatuses.tsx` | `useProjectStatuses()` → `usePortalData` | `project_statuses` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Priorità e Label | `/settings/projects/priorities` | `projects/PrioritiesLabels.tsx` | `useTaskPriorities()`, `useTaskLabels()` → `usePortalData` | `task_priorities`, `task_labels` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Template Attività | `/settings/projects/templates` | `projects/TaskTemplates.tsx` | `useTaskTemplates()` → `usePortalData` | `task_templates` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |

---

## Social Media

| Voce | Rotta | File pagina | Hook | Tabella DB | Has portal_id | RLS SELECT | RLS INSERT WITH CHECK | Stato |
|---|---|---|---|---|---|---|---|---|
| Account Social | `/settings/social/accounts` | `social/SocialAccountsSettings.tsx` | `useSocialConnections()` → `usePortalData` | `social_connections` | ✅ UUID | ❌ user_id ONLY — non usa portal_id | ❌ NULL | ❌ |
| Regole Pubblicazione | `/settings/social/publishing` | `social/PublishingRules.tsx` | `useSocialPublishingRules()` → `useSingleton`; `useHashtagSets()`, `useCaptionTemplates()` → `usePortalData` | `social_publishing_rules`, `hashtag_sets`, `caption_templates` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Categorie Contenuti | `/settings/social/content-categories` | `social/ContentCategories.tsx` | `useContentCategories()` → `usePortalData` | `content_categories` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |

---

## Team

| Voce | Rotta | File pagina | Hook | Tabella DB | Has portal_id | RLS SELECT | RLS INSERT WITH CHECK | Stato |
|---|---|---|---|---|---|---|---|---|
| Reparti | `/settings/team/departments` | `team/Departments.tsx` | `useDepartments()` → `usePortalData` | `departments` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Ruoli e Permessi | `/settings/team/roles` | `team/RolesPermissions.tsx` | `useRoles()`, `useRolePermissions(roleId)` → `usePortalData` | `roles`, `role_permissions` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |

---

## Notifiche

| Voce | Rotta | File pagina | Hook | Tabella DB | Has portal_id | RLS SELECT | RLS INSERT WITH CHECK | Stato |
|---|---|---|---|---|---|---|---|---|
| Canali Notifica | `/settings/notifications/channels` | `notifications/NotificationChannels.tsx` | `useNotificationChannels()` → `usePortalData` | `notification_channels` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |
| Regole Avviso | `/settings/notifications/alerts` | `notifications/AlertRules.tsx` | `useAlertRules()` → `usePortalData` | `alert_rules` | ✅ UUID | ✅ portal_members | ❌ NULL | ⚠️ |

---

## Zona Pericolosa

| Voce | Rotta | File pagina | Hook | Tabella DB | Has portal_id | RLS SELECT | RLS INSERT WITH CHECK | Stato |
|---|---|---|---|---|---|---|---|---|
| Reset Portale | `/settings/danger` | `DangerZone.tsx` | Direct Supabase (isOwner check) | Tutte le tabelle del portale | N/A | N/A | N/A | 🚧 |

---

## Tabelle con Politiche Duplicate (Conflict Risk)

Queste 4 tabelle hanno sia le policy `*_portal_*` (authenticated role) che le policy legacy `pa_manage_*` / `pm_select_*` (public role). Tutte PERMISSIVE — possono confliggere:

| Tabella | Policy Set 1 | Policy Set 2 |
|---|---|---|
| `appearance_settings` | `appearance_settings_portal_*` | `pa_manage_appearance`, `pm_select_appearance` |
| `notification_channels` | `notification_channels_portal_*` | `pa_manage_notif_channels`, `pm_select_notif_channels` |
| `portal_profiles` | `portal_profiles_portal_*` | `pa_manage_portal_profile`, `pm_select_portal_profile` |
| `subscription_categories` | `subscription_categories_portal_*` | `portal_admins_manage_sub_categories`, `portal_members_select_sub_categories` |

---

## Conteggio Finale

| Stato | Count |
|---|---|
| ✅ Per-portale OK | 0 |
| ⚠️ Parziale (INSERT no WITH CHECK) | 19 |
| ❌ Leak cross-portale | 1 (`social_connections`) |
| 🚧 Non implementato | 1 (Reset Portale) |
