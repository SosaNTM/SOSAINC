# Settings Section Audit

## BEFORE — Issues Found

### Critical (no-op / wrong data source)
| Page | Issue |
|------|-------|
| `social/SocialAccountsSettings` | Hardcoded `INITIAL_ACCOUNTS` constant — no Supabase integration. Connect/Disconnect buttons only mutate local React state. |
| `DangerZone` | All "reset" actions clear localStorage keys only — no DB records deleted. "Delete Portal" is `toast.success("simulazione")`. |
| `general/Appearance` | `useAccent` and `useNumberFormat` are localStorage-only providers. Changes never written to `appearance_settings` table. |

### Missing DB columns in form
| Page | Missing |
|------|---------|
| `general/PortalProfile` | `address_line2`, `state` columns exist in DB and type but not rendered in form. |

### Validation gaps
| Page | Gap |
|------|-----|
| `projects/PrioritiesLabels` | Priority and Label modals silently return on empty name — no error message shown to user. |
| `general/PortalProfile` | No format validation on phone, website, VAT number. |

### UI inconsistencies
| Page | Issue |
|------|-------|
| `projects/PrioritiesLabels` | Labels section uses pill buttons + custom empty state instead of `SettingsTable` pattern. |
| `projects/Departments` | Card grid layout instead of `SettingsTable`. Edit/Delete as text links inside card header. |
| `projects/TaskTemplates` | Card grid layout instead of `SettingsTable`. |
| `general/Appearance` | Language card had hardcoded `'Bebas Neue'` font and `#e8ff00` color. |
| `general/PortalProfile` | No "Annulla" cancel button. |

### Hardcoded content
- `SocialAccountsSettings`: hardcoded platform handles from "ICONOFF Studio" — business data in source code.
- `DangerZone`: localStorage key references (`STORAGE_PERSONAL_TX_PREFIX`) instead of DB table names.
- `TransactionCategories`: hardcoded hex colors (`#22c55e`, `#f97316`, `#ef4444`) instead of CSS variables.
- `Appearance` Language card: hardcoded `'Bebas Neue'`, `#e8ff00` (fixed in session).

### No-op buttons
| Page | Button | Reality |
|------|--------|---------|
| `NotificationChannels` | "Invia Test" (Telegram) | `toast.success()` only — no actual Telegram API call |
| `SocialAccountsSettings` | "Connetti" / "Disconnetti" | Local state only |
| `DangerZone` | "Elimina Portale" | `toast.success("simulazione")` |

### Tables without hooks
- `social_connections` table exists in DB, used by social features, but no `useSocialConnections` hook in `hooks/settings/index.ts`.

---

## AFTER — What Was Fixed

### Session (prior to this audit run)
- `SettingsTable`: added loading skeleton, empty-state add button, item count footer
- All 11 list pages: added `loading` + `onAdd` props
- All 12 list pages: added `errors` state + field-level validation display
- `PortalProfile`: added "Annulla" button that resets form to last saved DB state
- `Appearance` Language card: replaced hardcoded fonts/colors with CSS variables

### This audit run
| File | Fix |
|------|-----|
| `types/settings.ts` | Added `SocialConnection` interface matching DB schema |
| `hooks/settings/index.ts` | Added `useSocialConnections` hook |
| `social/SocialAccountsSettings` | Rewired to `social_connections` table — real connect/disconnect flow |
| `general/Appearance` | Wired accent color to `appearance_settings` table — persists to DB on each click |
| `DangerZone` | Replaced all localStorage operations with Supabase DELETE calls |
| `general/PortalProfile` | Added `address_line2` and `state` form fields |
| `projects/PrioritiesLabels` | Added `errors` state + inline validation for Priority and Label modals |

### Intentionally skipped
| Item | Reason |
|------|--------|
| Real OAuth for social platforms | Requires backend OAuth app credentials — out of scope for frontend settings |
| Telegram "Invia Test" real API | Requires bot token validation server-side |
| Drag-to-reorder for sort_order | UX enhancement beyond current task scope |
| `Departments`/`TaskTemplates` card→table migration | Card layout works, inconsistency non-critical |
| Bulk operations / search | Not in spec requirements |

---

## DB Tables Used by Settings

| Page | Table(s) |
|------|----------|
| PortalProfile | `portal_profiles` |
| Appearance | `appearance_settings` |
| IncomeCategories | `income_categories` |
| ExpenseCategories | `expense_categories` |
| SubscriptionCategories | `subscription_categories` |
| PaymentMethods | `payment_methods` |
| RecurrenceRules | `recurrence_rules` |
| CurrencyTax | `currency_settings`, `tax_rates` |
| TransactionCategories | `finance_transaction_categories` |
| ProjectStatuses | `project_statuses` |
| PrioritiesLabels | `task_priorities`, `task_labels` |
| TaskTemplates | `task_templates` |
| SocialAccounts | `social_connections` |
| PublishingRules | `social_publishing_rules`, `hashtag_sets`, `caption_templates` |
| ContentCategories | `content_categories` |
| RolesPermissions | `roles`, `role_permissions` |
| Departments | `departments` |
| NotificationChannels | `notification_channels` |
| AlertRules | `alert_rules` |
| DangerZone | `portals`, `income_categories`, `expense_categories`, `subscription_categories`, `payment_methods`, `recurrence_rules`, `tax_rates`, `finance_transaction_categories`, `portal_profiles`, `appearance_settings` |

---

## Migrations Applied

None required in this run — all referenced tables already exist in DB.
