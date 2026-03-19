-- Fix infinite recursion in portal_members RLS policies.
-- The self-referencing SELECT policy caused a loop.
-- Solution: use a SECURITY DEFINER function to fetch portal IDs outside RLS.

CREATE OR REPLACE FUNCTION public.get_my_portal_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ARRAY(SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid())
$$;

-- ── Fix portal_members policies ───────────────────────────────────────
DROP POLICY IF EXISTS "view_own_portal_members"  ON public.portal_members;
DROP POLICY IF EXISTS "admins_manage_members"    ON public.portal_members;

CREATE POLICY "view_own_portal_members" ON public.portal_members
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));

CREATE POLICY "admins_manage_members" ON public.portal_members
  FOR ALL USING (
    portal_id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')
    )
  );

-- ── Fix portals policies ──────────────────────────────────────────────
DROP POLICY IF EXISTS "portal_members_can_view"  ON public.portals;
DROP POLICY IF EXISTS "owners_can_manage_portal" ON public.portals;

CREATE POLICY "portal_members_can_view" ON public.portals
  FOR SELECT USING (id = ANY(public.get_my_portal_ids()));

CREATE POLICY "owners_can_manage_portal" ON public.portals
  FOR ALL USING (owner_id = auth.uid());

-- ── Fix portal_settings policies ─────────────────────────────────────
DROP POLICY IF EXISTS "members_view_portal_settings"   ON public.portal_settings;
DROP POLICY IF EXISTS "admins_update_portal_settings"  ON public.portal_settings;

CREATE POLICY "members_view_portal_settings" ON public.portal_settings
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));

CREATE POLICY "admins_update_portal_settings" ON public.portal_settings
  FOR ALL USING (
    portal_id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')
    )
  );

-- ── Fix all other tables that reference portal_members ────────────────
-- Finance
DROP POLICY IF EXISTS "portal_members_select_income_categories"  ON public.income_categories;
DROP POLICY IF EXISTS "portal_admins_manage_income_categories"   ON public.income_categories;
CREATE POLICY "portal_members_select_income_categories" ON public.income_categories
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "portal_admins_manage_income_categories" ON public.income_categories
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "portal_members_select_expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "portal_admins_manage_expense_categories"  ON public.expense_categories;
CREATE POLICY "portal_members_select_expense_categories" ON public.expense_categories
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "portal_admins_manage_expense_categories" ON public.expense_categories
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "portal_members_select_sub_categories" ON public.subscription_categories;
DROP POLICY IF EXISTS "portal_admins_manage_sub_categories"  ON public.subscription_categories;
CREATE POLICY "portal_members_select_sub_categories" ON public.subscription_categories
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "portal_admins_manage_sub_categories" ON public.subscription_categories
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "portal_members_select_payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "portal_admins_manage_payment_methods"  ON public.payment_methods;
CREATE POLICY "portal_members_select_payment_methods" ON public.payment_methods
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "portal_admins_manage_payment_methods" ON public.payment_methods
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "portal_members_select_recurrence_rules" ON public.recurrence_rules;
DROP POLICY IF EXISTS "portal_admins_manage_recurrence_rules"  ON public.recurrence_rules;
CREATE POLICY "portal_members_select_recurrence_rules" ON public.recurrence_rules
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "portal_admins_manage_recurrence_rules" ON public.recurrence_rules
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "portal_members_select_currency_settings" ON public.currency_settings;
DROP POLICY IF EXISTS "portal_admins_manage_currency_settings"  ON public.currency_settings;
CREATE POLICY "portal_members_select_currency_settings" ON public.currency_settings
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "portal_admins_manage_currency_settings" ON public.currency_settings
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "portal_members_select_tax_rates" ON public.tax_rates;
DROP POLICY IF EXISTS "portal_admins_manage_tax_rates"  ON public.tax_rates;
CREATE POLICY "portal_members_select_tax_rates" ON public.tax_rates
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "portal_admins_manage_tax_rates" ON public.tax_rates
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

-- Projects
DROP POLICY IF EXISTS "pm_select_project_statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "pa_manage_project_statuses" ON public.project_statuses;
CREATE POLICY "pm_select_project_statuses" ON public.project_statuses
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_project_statuses" ON public.project_statuses
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_task_priorities" ON public.task_priorities;
DROP POLICY IF EXISTS "pa_manage_task_priorities" ON public.task_priorities;
CREATE POLICY "pm_select_task_priorities" ON public.task_priorities
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_task_priorities" ON public.task_priorities
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_task_labels" ON public.task_labels;
DROP POLICY IF EXISTS "pa_manage_task_labels" ON public.task_labels;
CREATE POLICY "pm_select_task_labels" ON public.task_labels
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_task_labels" ON public.task_labels
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_task_templates" ON public.task_templates;
DROP POLICY IF EXISTS "pa_manage_task_templates" ON public.task_templates;
CREATE POLICY "pm_select_task_templates" ON public.task_templates
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_task_templates" ON public.task_templates
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

-- Social
DROP POLICY IF EXISTS "pm_select_social_publishing_rules" ON public.social_publishing_rules;
DROP POLICY IF EXISTS "pa_manage_social_publishing_rules" ON public.social_publishing_rules;
CREATE POLICY "pm_select_social_publishing_rules" ON public.social_publishing_rules
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_social_publishing_rules" ON public.social_publishing_rules
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_hashtag_sets" ON public.hashtag_sets;
DROP POLICY IF EXISTS "pa_manage_hashtag_sets" ON public.hashtag_sets;
CREATE POLICY "pm_select_hashtag_sets" ON public.hashtag_sets
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_hashtag_sets" ON public.hashtag_sets
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_content_categories" ON public.content_categories;
DROP POLICY IF EXISTS "pa_manage_content_categories" ON public.content_categories;
CREATE POLICY "pm_select_content_categories" ON public.content_categories
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_content_categories" ON public.content_categories
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_caption_templates" ON public.caption_templates;
DROP POLICY IF EXISTS "pa_manage_caption_templates" ON public.caption_templates;
CREATE POLICY "pm_select_caption_templates" ON public.caption_templates
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_caption_templates" ON public.caption_templates
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

-- Team
DROP POLICY IF EXISTS "pm_select_roles" ON public.roles;
DROP POLICY IF EXISTS "pa_manage_roles" ON public.roles;
CREATE POLICY "pm_select_roles" ON public.roles
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_roles" ON public.roles
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "pa_manage_role_permissions" ON public.role_permissions;
CREATE POLICY "pm_select_role_permissions" ON public.role_permissions
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_role_permissions" ON public.role_permissions
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_departments" ON public.departments;
DROP POLICY IF EXISTS "pa_manage_departments" ON public.departments;
CREATE POLICY "pm_select_departments" ON public.departments
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_departments" ON public.departments
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_member_roles" ON public.portal_member_roles;
DROP POLICY IF EXISTS "pa_manage_member_roles" ON public.portal_member_roles;
CREATE POLICY "pm_select_member_roles" ON public.portal_member_roles
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_member_roles" ON public.portal_member_roles
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

-- Notifications
DROP POLICY IF EXISTS "pm_select_notif_channels" ON public.notification_channels;
DROP POLICY IF EXISTS "pa_manage_notif_channels" ON public.notification_channels;
CREATE POLICY "pm_select_notif_channels" ON public.notification_channels
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_notif_channels" ON public.notification_channels
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "pa_manage_alert_rules" ON public.alert_rules;
CREATE POLICY "pm_select_alert_rules" ON public.alert_rules
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_alert_rules" ON public.alert_rules
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

-- General
DROP POLICY IF EXISTS "pm_select_portal_profile" ON public.portal_profiles;
DROP POLICY IF EXISTS "pa_manage_portal_profile" ON public.portal_profiles;
CREATE POLICY "pm_select_portal_profile" ON public.portal_profiles
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_portal_profile" ON public.portal_profiles
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));

DROP POLICY IF EXISTS "pm_select_appearance" ON public.appearance_settings;
DROP POLICY IF EXISTS "pa_manage_appearance" ON public.appearance_settings;
CREATE POLICY "pm_select_appearance" ON public.appearance_settings
  FOR SELECT USING (portal_id = ANY(public.get_my_portal_ids()));
CREATE POLICY "pa_manage_appearance" ON public.appearance_settings
  FOR ALL USING (portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid() AND pm.role IN ('owner','admin')));
