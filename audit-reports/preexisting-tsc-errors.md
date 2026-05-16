# Pre-existing TypeScript errors — baseline 2026-05-16

> Captured at Phase 0 of the recap-pipeline audit. None of these were introduced by the audit; they exist on the codebase as of `feat/sosa-design-system` HEAD.

## Summary

- Tool: `npx tsc -p tsconfig.app.json --noEmit`
- Total errors: 64
- Distinct files: 37

## Errors by file

```
src/components/PWAUpdatePrompt.tsx(1,31): error TS2307: Cannot find module 'virtual:pwa-register/react' or its corresponding type declarations.
src/components/RoleBadge.tsx(3,7): error TS2741: Property 'viewer' is missing in type '{ owner: { bg: string; text: string; label: string; emoji: string; }; admin: { bg: string; text: string; label: string; emoji: string; }; manager: { bg: string; text: string; label: string; emoji: string; }; member: { ...; }; }' but required in type 'Record<Role, { bg: string; text: string; label: string; emoji: string; }>'.
src/components/social/SocialAnalyticsDashboard.tsx(161,72): error TS2339: Property 'last_synced_at' does not exist on type 'DbSocialConnection'.
src/components/social/SocialAudienceModal.tsx(532,31): error TS2322: Type 'string' is not assignable to type 'SocialPlatform'.
src/components/social/SocialConnections.tsx(197,31): error TS2339: Property 'account_avatar_url' does not exist on type 'DbSocialConnection'.
src/components/social/SocialConnections.tsx(198,42): error TS2339: Property 'account_avatar_url' does not exist on type 'DbSocialConnection'.
src/components/ui/glass-card.tsx(85,15): error TS17001: JSX elements cannot have multiple attributes with the same name.
src/components/ui/Glitchy404.tsx(146,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(149,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(152,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(155,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(158,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(161,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(164,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(167,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(170,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(173,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(176,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(179,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(182,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(185,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(188,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(191,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/components/ui/Glitchy404.tsx(194,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
src/lib/services/goalsService.ts(28,63): error TS2339: Property 'errors' does not exist on type '{ success: false; errors: string[]; } | { success: true; data: { color?: string; name?: string; target?: number; category?: string; user_id?: string; saved?: number; deadline?: string; emoji?: string; is_achieved?: boolean; }; }'.
src/lib/services/investmentService.ts(27,68): error TS2339: Property 'errors' does not exist on type '{ success: false; errors: string[]; } | { success: true; data: { type?: "other" | "crypto" | "stock" | "etf" | "bonds" | "real_estate"; color?: string; name?: string; notes?: string; currency?: string; ... 5 more ...; current_price?: number; }; }'.
src/lib/services/personalTransactionService.ts(58,69): error TS2339: Property 'errors' does not exist on type '{ success: false; errors: string[]; } | { success: true; data: { title?: string; type?: "income" | "expense" | "transfer"; date?: string; description?: string; category?: string; amount?: number; currency?: string; ... 7 more ...; is_recurring?: boolean; }; }'.
src/lib/services/vaultService.ts(41,67): error TS2339: Property 'errors' does not exist on type '{ success: false; errors: string[]; } | { success: true; data: { type?: string; name?: string; url?: string; notes?: string; category?: string; created_by?: string; user_id?: string; tags?: string[]; is_favorite?: boolean; is_locked?: boolean; encrypted_data?: string; expires_at?: string; username?: string; }; }'.
src/lib/supabase.ts(2,15): error TS2305: Module '"./supabase.types"' has no exported member 'Database'.
src/pages/AdministrationPage.tsx(135,34): error TS2322: Type 'string' is not assignable to type 'Role'.
src/pages/AdministrationPage.tsx(674,14): error TS2304: Cannot find name 'ALL_USERS'.
src/pages/AdministrationPage.tsx(764,78): error TS2304: Cannot find name 'ALL_USERS'.
src/pages/crypto/CryptoPage.tsx(282,40): error TS2322: Type '{ hidden: { opacity: number; y: number; filter: string; }; visible: (delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
src/pages/crypto/CryptoPage.tsx(298,21): error TS2322: Type '{ hidden: { opacity: number; y: number; filter: string; }; visible: (delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
src/pages/crypto/CryptoPage.tsx(348,90): error TS2322: Type '{ hidden: { opacity: number; y: number; filter: string; }; visible: (delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
src/pages/crypto/CryptoPage.tsx(431,23): error TS2322: Type '{ hidden: { opacity: number; y: number; filter: string; }; visible: (delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
src/pages/gift-cards/GiftCardsPage.tsx(164,40): error TS2322: Type '{ hidden: { opacity: number; y: number; }; visible: (d?: number) => { opacity: number; y: number; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
src/pages/Goals.tsx(86,39): error TS2345: Argument of type '{ saved: number; user_id: string; name: string; target: number; deadline: string; category: string; color: string; emoji: string; }' is not assignable to parameter of type 'Omit<NewDbFinancialGoal, "portal_id">'.
src/pages/leadgen/LeadgenSearch.tsx(411,60): error TS2304: Cannot find name 'setFilterOpen'.
src/pages/leadgen/LeadgenToday.tsx(448,38): error TS2739: Type 'PostgrestFilterBuilder<any, any, any, null, "leadgen_outreach_events", any, "POST">' is missing the following properties from type 'Promise<unknown>': catch, finally, [Symbol.toStringTag]
src/pages/leadgen/LeadgenToday.tsx(450,16): error TS2345: Argument of type 'PostgrestFilterBuilder<any, any, any, null, "leadgen_leads", any, "PATCH">' is not assignable to parameter of type 'Promise<unknown>'.
src/pages/Recap.tsx(1250,10): error TS2741: Property 'onSave' is missing in type '{ open: boolean; onClose: () => void; initialData: PersonalTransaction; }' but required in type 'Props'.
src/pages/settings/finance/CurrencyTax.tsx(113,41): error TS2345: Argument of type '{ applies_to: "both"; is_active: true; name: string; rate: number; is_default: boolean; }' is not assignable to parameter of type 'Omit<TaxRate, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/ExpenseCategories.tsx(88,38): error TS2345: Argument of type '{ is_active: true; sort_order: number; name: string; icon: string; color: string; description: string; monthly_budget: number; alert_threshold: number; }' is not assignable to parameter of type 'Omit<ExpenseCategory, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/IncomeCategories.tsx(74,38): error TS2345: Argument of type '{ name: string; icon: string; color: string; description: string; is_active: true; sort_order: number; }' is not assignable to parameter of type 'Omit<IncomeCategory, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/PaymentMethods.tsx(90,38): error TS2345: Argument of type '{ last_four: null; is_active: true; last_used_at: null; sort_order: number; name: string; type: PaymentMethod["type"]; is_default: boolean; }' is not assignable to parameter of type 'Omit<PaymentMethod, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/RecurrenceRules.tsx(102,38): error TS2345: Argument of type '{ name: string; amount: number; frequency: Frequency; category_id: string; direction: Direction; next_run_at: string; is_active: boolean; }' is not assignable to parameter of type 'Omit<RecurrenceRule, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/SubscriptionCategories.tsx(67,38): error TS2345: Argument of type '{ billing_cycle: "monthly"; reminder_days: number; is_active: true; sort_order: number; name: string; icon: string; color: string; }' is not assignable to parameter of type 'Omit<SubscriptionCategory, "id" | "created_at" | "updated_at">'.
src/pages/settings/notifications/AlertRules.tsx(94,38): error TS2345: Argument of type '{ name: string; trigger_type: string; conditions: Record<string, unknown>; channels: string[]; priority: Priority; is_active: boolean; }' is not assignable to parameter of type 'Omit<AlertRule, "id" | "created_at" | "updated_at">'.
src/pages/settings/projects/PrioritiesLabels.tsx(59,39): error TS2345: Argument of type '{ name: string; color: string; icon: string; level: number; is_default: false; sort_order: number; }' is not assignable to parameter of type 'Omit<TaskPriority, "id" | "created_at" | "updated_at">'.
src/pages/settings/projects/PrioritiesLabels.tsx(92,39): error TS2345: Argument of type '{ name: string; color: string; description: null; }' is not assignable to parameter of type 'Omit<TaskLabel, "id" | "created_at" | "updated_at">'.
src/pages/settings/projects/ProjectStatuses.tsx(70,38): error TS2345: Argument of type '{ name: string; color: string; icon: string; is_default: boolean; is_final: boolean; sort_order: number; }' is not assignable to parameter of type 'Omit<ProjectStatus, "id" | "created_at" | "updated_at">'.
src/pages/settings/projects/TaskTemplates.tsx(76,38): error TS2345: Argument of type '{ name: string; description: string; priority_id: string; estimated_h: number; checklist: ChecklistItem[]; tags: string[]; }' is not assignable to parameter of type 'Omit<TaskTemplate, "id" | "created_at" | "updated_at">'.
src/pages/settings/social/ContentCategories.tsx(67,38): error TS2345: Argument of type '{ name: string; color: string; platforms: undefined[]; frequency: null; description: string; is_active: true; sort_order: number; }' is not assignable to parameter of type 'Omit<ContentCategory, "id" | "created_at" | "updated_at">'.
src/pages/settings/social/PublishingRules.tsx(71,39): error TS2345: Argument of type '{ name: string; hashtags: string[]; platforms: undefined[]; is_active: true; }' is not assignable to parameter of type 'Omit<HashtagSet, "id" | "created_at" | "updated_at">'.
src/pages/settings/social/PublishingRules.tsx(109,39): error TS2345: Argument of type '{ name: string; body: string; platform: string; variables: undefined[]; category_id: null; is_active: true; }' is not assignable to parameter of type 'Omit<CaptionTemplate, "id" | "created_at" | "updated_at">'.
src/pages/settings/social/SocialAccountsSettings.tsx(58,36): error TS2345: Argument of type '{ user_id: string; platform: Platform; account_handle: string; account_name: string; is_active: true; access_token: null; refresh_token: null; token_expires_at: null; connected_at: string; }' is not assignable to parameter of type 'Omit<SocialConnection, "id" | "created_at" | "updated_at">'.
src/pages/settings/team/Departments.tsx(67,38): error TS2345: Argument of type '{ name: string; color: string; head_user_id: string; member_count: number; description: string; sort_order: number; }' is not assignable to parameter of type 'Omit<Department, "id" | "created_at" | "updated_at">'.
src/pages/settings/team/Members.tsx(86,8): error TS2739: Type '{ title: string; }' is missing the following properties from type 'SettingsPageHeaderProps': icon, description
src/pages/settings/team/RolesPermissions.tsx(76,42): error TS2345: Argument of type '{ name: string; description: string; color: string; is_system: false; sort_order: number; }' is not assignable to parameter of type 'Omit<Role, "id" | "created_at" | "updated_at">'.
src/pages/settings/team/RolesPermissions.tsx(117,24): error TS2345: Argument of type '{ role_id: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_export: boolean; }' is not assignable to parameter of type 'Omit<RolePermission, "id" | "created_at" | "updated_at">'.
src/pages/social/SocialAccounts.tsx(355,55): error TS2339: Property 'name' does not exist on type 'User'.
src/pages/social/SocialAccounts.tsx(360,65): error TS2339: Property 'name' does not exist on type 'User'.
src/pages/VaultPage.tsx(400,7): error TS2345: Argument of type '{ type: VaultItemType; name: string; category: string; encrypted_data: string; is_locked: boolean; is_favorite: false; tags: null; user_id: string; created_by: string; expires_at: string; }' is not assignable to parameter of type 'Omit<NewDbVaultItem, "portal_id">'.
```

## Full output

```
src/components/PWAUpdatePrompt.tsx(1,31): error TS2307: Cannot find module 'virtual:pwa-register/react' or its corresponding type declarations.
src/components/RoleBadge.tsx(3,7): error TS2741: Property 'viewer' is missing in type '{ owner: { bg: string; text: string; label: string; emoji: string; }; admin: { bg: string; text: string; label: string; emoji: string; }; manager: { bg: string; text: string; label: string; emoji: string; }; member: { ...; }; }' but required in type 'Record<Role, { bg: string; text: string; label: string; emoji: string; }>'.
src/components/social/SocialAnalyticsDashboard.tsx(161,72): error TS2339: Property 'last_synced_at' does not exist on type 'DbSocialConnection'.
src/components/social/SocialAudienceModal.tsx(532,31): error TS2322: Type 'string' is not assignable to type 'SocialPlatform'.
src/components/social/SocialConnections.tsx(197,31): error TS2339: Property 'account_avatar_url' does not exist on type 'DbSocialConnection'.
src/components/social/SocialConnections.tsx(198,42): error TS2339: Property 'account_avatar_url' does not exist on type 'DbSocialConnection'.
src/components/ui/glass-card.tsx(85,15): error TS17001: JSX elements cannot have multiple attributes with the same name.
src/components/ui/Glitchy404.tsx(146,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(149,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(152,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(155,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(158,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(161,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(164,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(167,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(170,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(173,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(176,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(179,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(182,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(185,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(188,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(191,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/components/ui/Glitchy404.tsx(194,21): error TS2322: Type '{ shake: { x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }; }' is not assignable to type 'Variants'.
  Property 'shake' is incompatible with index signature.
    Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'Variant'.
      Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type 'TargetAndTransition'.
        Type '{ x: number[]; transition: { duration: number; repeat: number; repeatType: "loop"; ease: string; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
          Types of property 'transition' are incompatible.
            Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'Transition<any>'.
              Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                Type '{ duration: number; repeat: number; repeatType: "loop"; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                  Types of property 'ease' are incompatible.
                    Type 'string' is not assignable to type 'Easing | Easing[]'.
src/lib/services/goalsService.ts(28,63): error TS2339: Property 'errors' does not exist on type '{ success: false; errors: string[]; } | { success: true; data: { color?: string; name?: string; target?: number; category?: string; user_id?: string; saved?: number; deadline?: string; emoji?: string; is_achieved?: boolean; }; }'.
  Property 'errors' does not exist on type '{ success: true; data: { color?: string; name?: string; target?: number; category?: string; user_id?: string; saved?: number; deadline?: string; emoji?: string; is_achieved?: boolean; }; }'.
src/lib/services/investmentService.ts(27,68): error TS2339: Property 'errors' does not exist on type '{ success: false; errors: string[]; } | { success: true; data: { type?: "other" | "crypto" | "stock" | "etf" | "bonds" | "real_estate"; color?: string; name?: string; notes?: string; currency?: string; ... 5 more ...; current_price?: number; }; }'.
  Property 'errors' does not exist on type '{ success: true; data: { type?: "other" | "crypto" | "stock" | "etf" | "bonds" | "real_estate"; color?: string; name?: string; notes?: string; currency?: string; user_id?: string; emoji?: string; ticker?: string; units?: number; avg_buy_price?: number; current_price?: number; }; }'.
src/lib/services/personalTransactionService.ts(58,69): error TS2339: Property 'errors' does not exist on type '{ success: false; errors: string[]; } | { success: true; data: { title?: string; type?: "income" | "expense" | "transfer"; date?: string; description?: string; category?: string; amount?: number; currency?: string; ... 7 more ...; is_recurring?: boolean; }; }'.
  Property 'errors' does not exist on type '{ success: true; data: { title?: string; type?: "income" | "expense" | "transfer"; date?: string; description?: string; category?: string; amount?: number; currency?: string; user_id?: string; category_id?: string; ... 5 more ...; is_recurring?: boolean; }; }'.
src/lib/services/vaultService.ts(41,67): error TS2339: Property 'errors' does not exist on type '{ success: false; errors: string[]; } | { success: true; data: { type?: string; name?: string; url?: string; notes?: string; category?: string; created_by?: string; user_id?: string; tags?: string[]; is_favorite?: boolean; is_locked?: boolean; encrypted_data?: string; expires_at?: string; username?: string; }; }'.
  Property 'errors' does not exist on type '{ success: true; data: { type?: string; name?: string; url?: string; notes?: string; category?: string; created_by?: string; user_id?: string; tags?: string[]; is_favorite?: boolean; is_locked?: boolean; encrypted_data?: string; expires_at?: string; username?: string; }; }'.
src/lib/supabase.ts(2,15): error TS2305: Module '"./supabase.types"' has no exported member 'Database'.
src/pages/AdministrationPage.tsx(135,34): error TS2322: Type 'string' is not assignable to type 'Role'.
src/pages/AdministrationPage.tsx(674,14): error TS2304: Cannot find name 'ALL_USERS'.
src/pages/AdministrationPage.tsx(764,78): error TS2304: Cannot find name 'ALL_USERS'.
src/pages/crypto/CryptoPage.tsx(282,40): error TS2322: Type '{ hidden: { opacity: number; y: number; filter: string; }; visible: (delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
  Property 'visible' is incompatible with index signature.
    Type '(delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'Variant'.
      Type '(delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetResolver'.
        Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'string | TargetAndTransition'.
          Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetAndTransition'.
            Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
              Types of property 'transition' are incompatible.
                Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'Transition<any>'.
                  Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                    Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'ValueAnimationTransition<any>'.
                      Types of property 'ease' are incompatible.
                        Type 'number[]' is not assignable to type 'Easing | Easing[]'.
                          Type 'number[]' is not assignable to type 'EasingFunction | Easing[]'.
                            Type 'number[]' is not assignable to type 'Easing[]'.
                              Type 'number' is not assignable to type 'Easing'.
src/pages/crypto/CryptoPage.tsx(298,21): error TS2322: Type '{ hidden: { opacity: number; y: number; filter: string; }; visible: (delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
  Property 'visible' is incompatible with index signature.
    Type '(delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'Variant'.
      Type '(delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetResolver'.
        Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'string | TargetAndTransition'.
          Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetAndTransition'.
            Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
              Types of property 'transition' are incompatible.
                Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'Transition<any>'.
                  Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                    Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'ValueAnimationTransition<any>'.
                      Types of property 'ease' are incompatible.
                        Type 'number[]' is not assignable to type 'Easing | Easing[]'.
                          Type 'number[]' is not assignable to type 'EasingFunction | Easing[]'.
                            Type 'number[]' is not assignable to type 'Easing[]'.
                              Type 'number' is not assignable to type 'Easing'.
src/pages/crypto/CryptoPage.tsx(348,90): error TS2322: Type '{ hidden: { opacity: number; y: number; filter: string; }; visible: (delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
  Property 'visible' is incompatible with index signature.
    Type '(delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'Variant'.
      Type '(delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetResolver'.
        Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'string | TargetAndTransition'.
          Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetAndTransition'.
            Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
              Types of property 'transition' are incompatible.
                Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'Transition<any>'.
                  Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                    Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'ValueAnimationTransition<any>'.
                      Types of property 'ease' are incompatible.
                        Type 'number[]' is not assignable to type 'Easing | Easing[]'.
                          Type 'number[]' is not assignable to type 'EasingFunction | Easing[]'.
                            Type 'number[]' is not assignable to type 'Easing[]'.
                              Type 'number' is not assignable to type 'Easing'.
src/pages/crypto/CryptoPage.tsx(431,23): error TS2322: Type '{ hidden: { opacity: number; y: number; filter: string; }; visible: (delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
  Property 'visible' is incompatible with index signature.
    Type '(delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'Variant'.
      Type '(delay?: number) => { opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetResolver'.
        Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'string | TargetAndTransition'.
          Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetAndTransition'.
            Type '{ opacity: number; y: number; filter: string; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
              Types of property 'transition' are incompatible.
                Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'Transition<any>'.
                  Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                    Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'ValueAnimationTransition<any>'.
                      Types of property 'ease' are incompatible.
                        Type 'number[]' is not assignable to type 'Easing | Easing[]'.
                          Type 'number[]' is not assignable to type 'EasingFunction | Easing[]'.
                            Type 'number[]' is not assignable to type 'Easing[]'.
                              Type 'number' is not assignable to type 'Easing'.
src/pages/gift-cards/GiftCardsPage.tsx(164,40): error TS2322: Type '{ hidden: { opacity: number; y: number; }; visible: (d?: number) => { opacity: number; y: number; transition: { duration: number; delay: number; ease: number[]; }; }; }' is not assignable to type 'Variants'.
  Property 'visible' is incompatible with index signature.
    Type '(d?: number) => { opacity: number; y: number; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'Variant'.
      Type '(d?: number) => { opacity: number; y: number; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetResolver'.
        Type '{ opacity: number; y: number; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'string | TargetAndTransition'.
          Type '{ opacity: number; y: number; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type 'TargetAndTransition'.
            Type '{ opacity: number; y: number; transition: { duration: number; delay: number; ease: number[]; }; }' is not assignable to type '{ transition?: Transition<any>; transitionEnd?: ResolvedValues$1; }'.
              Types of property 'transition' are incompatible.
                Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'Transition<any>'.
                  Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
                    Type '{ duration: number; delay: number; ease: number[]; }' is not assignable to type 'ValueAnimationTransition<any>'.
                      Types of property 'ease' are incompatible.
                        Type 'number[]' is not assignable to type 'Easing | Easing[]'.
                          Type 'number[]' is not assignable to type 'EasingFunction | Easing[]'.
                            Type 'number[]' is not assignable to type 'Easing[]'.
                              Type 'number' is not assignable to type 'Easing'.
src/pages/Goals.tsx(86,39): error TS2345: Argument of type '{ saved: number; user_id: string; name: string; target: number; deadline: string; category: string; color: string; emoji: string; }' is not assignable to parameter of type 'Omit<NewDbFinancialGoal, "portal_id">'.
  Property 'is_achieved' is missing in type '{ saved: number; user_id: string; name: string; target: number; deadline: string; category: string; color: string; emoji: string; }' but required in type 'Omit<NewDbFinancialGoal, "portal_id">'.
src/pages/leadgen/LeadgenSearch.tsx(411,60): error TS2304: Cannot find name 'setFilterOpen'.
src/pages/leadgen/LeadgenToday.tsx(448,38): error TS2739: Type 'PostgrestFilterBuilder<any, any, any, null, "leadgen_outreach_events", any, "POST">' is missing the following properties from type 'Promise<unknown>': catch, finally, [Symbol.toStringTag]
src/pages/leadgen/LeadgenToday.tsx(450,16): error TS2345: Argument of type 'PostgrestFilterBuilder<any, any, any, null, "leadgen_leads", any, "PATCH">' is not assignable to parameter of type 'Promise<unknown>'.
  Type 'PostgrestFilterBuilder<any, any, any, null, "leadgen_leads", any, "PATCH">' is missing the following properties from type 'Promise<unknown>': catch, finally, [Symbol.toStringTag]
src/pages/Recap.tsx(1250,10): error TS2741: Property 'onSave' is missing in type '{ open: boolean; onClose: () => void; initialData: PersonalTransaction; }' but required in type 'Props'.
src/pages/settings/finance/CurrencyTax.tsx(113,41): error TS2345: Argument of type '{ applies_to: "both"; is_active: true; name: string; rate: number; is_default: boolean; }' is not assignable to parameter of type 'Omit<TaxRate, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ applies_to: "both"; is_active: true; name: string; rate: number; is_default: boolean; }' but required in type 'Omit<TaxRate, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/ExpenseCategories.tsx(88,38): error TS2345: Argument of type '{ is_active: true; sort_order: number; name: string; icon: string; color: string; description: string; monthly_budget: number; alert_threshold: number; }' is not assignable to parameter of type 'Omit<ExpenseCategory, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ is_active: true; sort_order: number; name: string; icon: string; color: string; description: string; monthly_budget: number; alert_threshold: number; }' but required in type 'Omit<ExpenseCategory, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/IncomeCategories.tsx(74,38): error TS2345: Argument of type '{ name: string; icon: string; color: string; description: string; is_active: true; sort_order: number; }' is not assignable to parameter of type 'Omit<IncomeCategory, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; icon: string; color: string; description: string; is_active: true; sort_order: number; }' but required in type 'Omit<IncomeCategory, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/PaymentMethods.tsx(90,38): error TS2345: Argument of type '{ last_four: null; is_active: true; last_used_at: null; sort_order: number; name: string; type: PaymentMethod["type"]; is_default: boolean; }' is not assignable to parameter of type 'Omit<PaymentMethod, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ last_four: null; is_active: true; last_used_at: null; sort_order: number; name: string; type: PaymentMethod["type"]; is_default: boolean; }' but required in type 'Omit<PaymentMethod, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/RecurrenceRules.tsx(102,38): error TS2345: Argument of type '{ name: string; amount: number; frequency: Frequency; category_id: string; direction: Direction; next_run_at: string; is_active: boolean; }' is not assignable to parameter of type 'Omit<RecurrenceRule, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; amount: number; frequency: Frequency; category_id: string; direction: Direction; next_run_at: string; is_active: boolean; }' but required in type 'Omit<RecurrenceRule, "id" | "created_at" | "updated_at">'.
src/pages/settings/finance/SubscriptionCategories.tsx(67,38): error TS2345: Argument of type '{ billing_cycle: "monthly"; reminder_days: number; is_active: true; sort_order: number; name: string; icon: string; color: string; }' is not assignable to parameter of type 'Omit<SubscriptionCategory, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ billing_cycle: "monthly"; reminder_days: number; is_active: true; sort_order: number; name: string; icon: string; color: string; }' but required in type 'Omit<SubscriptionCategory, "id" | "created_at" | "updated_at">'.
src/pages/settings/notifications/AlertRules.tsx(94,38): error TS2345: Argument of type '{ name: string; trigger_type: string; conditions: Record<string, unknown>; channels: string[]; priority: Priority; is_active: boolean; }' is not assignable to parameter of type 'Omit<AlertRule, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; trigger_type: string; conditions: Record<string, unknown>; channels: string[]; priority: Priority; is_active: boolean; }' but required in type 'Omit<AlertRule, "id" | "created_at" | "updated_at">'.
src/pages/settings/projects/PrioritiesLabels.tsx(59,39): error TS2345: Argument of type '{ name: string; color: string; icon: string; level: number; is_default: false; sort_order: number; }' is not assignable to parameter of type 'Omit<TaskPriority, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; color: string; icon: string; level: number; is_default: false; sort_order: number; }' but required in type 'Omit<TaskPriority, "id" | "created_at" | "updated_at">'.
src/pages/settings/projects/PrioritiesLabels.tsx(92,39): error TS2345: Argument of type '{ name: string; color: string; description: null; }' is not assignable to parameter of type 'Omit<TaskLabel, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; color: string; description: null; }' but required in type 'Omit<TaskLabel, "id" | "created_at" | "updated_at">'.
src/pages/settings/projects/ProjectStatuses.tsx(70,38): error TS2345: Argument of type '{ name: string; color: string; icon: string; is_default: boolean; is_final: boolean; sort_order: number; }' is not assignable to parameter of type 'Omit<ProjectStatus, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; color: string; icon: string; is_default: boolean; is_final: boolean; sort_order: number; }' but required in type 'Omit<ProjectStatus, "id" | "created_at" | "updated_at">'.
src/pages/settings/projects/TaskTemplates.tsx(76,38): error TS2345: Argument of type '{ name: string; description: string; priority_id: string; estimated_h: number; checklist: ChecklistItem[]; tags: string[]; }' is not assignable to parameter of type 'Omit<TaskTemplate, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; description: string; priority_id: string; estimated_h: number; checklist: ChecklistItem[]; tags: string[]; }' but required in type 'Omit<TaskTemplate, "id" | "created_at" | "updated_at">'.
src/pages/settings/social/ContentCategories.tsx(67,38): error TS2345: Argument of type '{ name: string; color: string; platforms: undefined[]; frequency: null; description: string; is_active: true; sort_order: number; }' is not assignable to parameter of type 'Omit<ContentCategory, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; color: string; platforms: undefined[]; frequency: null; description: string; is_active: true; sort_order: number; }' but required in type 'Omit<ContentCategory, "id" | "created_at" | "updated_at">'.
src/pages/settings/social/PublishingRules.tsx(71,39): error TS2345: Argument of type '{ name: string; hashtags: string[]; platforms: undefined[]; is_active: true; }' is not assignable to parameter of type 'Omit<HashtagSet, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; hashtags: string[]; platforms: undefined[]; is_active: true; }' but required in type 'Omit<HashtagSet, "id" | "created_at" | "updated_at">'.
src/pages/settings/social/PublishingRules.tsx(109,39): error TS2345: Argument of type '{ name: string; body: string; platform: string; variables: undefined[]; category_id: null; is_active: true; }' is not assignable to parameter of type 'Omit<CaptionTemplate, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; body: string; platform: string; variables: undefined[]; category_id: null; is_active: true; }' but required in type 'Omit<CaptionTemplate, "id" | "created_at" | "updated_at">'.
src/pages/settings/social/SocialAccountsSettings.tsx(58,36): error TS2345: Argument of type '{ user_id: string; platform: Platform; account_handle: string; account_name: string; is_active: true; access_token: null; refresh_token: null; token_expires_at: null; connected_at: string; }' is not assignable to parameter of type 'Omit<SocialConnection, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ user_id: string; platform: Platform; account_handle: string; account_name: string; is_active: true; access_token: null; refresh_token: null; token_expires_at: null; connected_at: string; }' but required in type 'Omit<SocialConnection, "id" | "created_at" | "updated_at">'.
src/pages/settings/team/Departments.tsx(67,38): error TS2345: Argument of type '{ name: string; color: string; head_user_id: string; member_count: number; description: string; sort_order: number; }' is not assignable to parameter of type 'Omit<Department, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; color: string; head_user_id: string; member_count: number; description: string; sort_order: number; }' but required in type 'Omit<Department, "id" | "created_at" | "updated_at">'.
src/pages/settings/team/Members.tsx(86,8): error TS2739: Type '{ title: string; }' is missing the following properties from type 'SettingsPageHeaderProps': icon, description
src/pages/settings/team/RolesPermissions.tsx(76,42): error TS2345: Argument of type '{ name: string; description: string; color: string; is_system: false; sort_order: number; }' is not assignable to parameter of type 'Omit<Role, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ name: string; description: string; color: string; is_system: false; sort_order: number; }' but required in type 'Omit<Role, "id" | "created_at" | "updated_at">'.
src/pages/settings/team/RolesPermissions.tsx(117,24): error TS2345: Argument of type '{ role_id: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_export: boolean; }' is not assignable to parameter of type 'Omit<RolePermission, "id" | "created_at" | "updated_at">'.
  Property 'portal_id' is missing in type '{ role_id: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_export: boolean; }' but required in type 'Omit<RolePermission, "id" | "created_at" | "updated_at">'.
src/pages/social/SocialAccounts.tsx(355,55): error TS2339: Property 'name' does not exist on type 'User'.
src/pages/social/SocialAccounts.tsx(360,65): error TS2339: Property 'name' does not exist on type 'User'.
src/pages/VaultPage.tsx(400,7): error TS2345: Argument of type '{ type: VaultItemType; name: string; category: string; encrypted_data: string; is_locked: boolean; is_favorite: false; tags: null; user_id: string; created_by: string; expires_at: string; }' is not assignable to parameter of type 'Omit<NewDbVaultItem, "portal_id">'.
  Property 'last_accessed_at' is missing in type '{ type: VaultItemType; name: string; category: string; encrypted_data: string; is_locked: boolean; is_favorite: false; tags: null; user_id: string; created_by: string; expires_at: string; }' but required in type 'Omit<NewDbVaultItem, "portal_id">'.
```
