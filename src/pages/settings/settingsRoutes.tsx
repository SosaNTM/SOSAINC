import React, { Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { AdminRoute } from "@/components/AdminRoute";
import { Skeleton } from "@/components/ui/skeleton";
import SettingsLayout from "./SettingsLayout";

// ── Lazy-loaded settings pages ──────────────────────────────────────────────
const PortalProfile = React.lazy(() => import("./general/PortalProfile"));
const Appearance = React.lazy(() => import("./general/Appearance"));
const IncomeCategories = React.lazy(() => import("./finance/IncomeCategories"));
const ExpenseCategories = React.lazy(() => import("./finance/ExpenseCategories"));
const SubscriptionCategories = React.lazy(() => import("./finance/SubscriptionCategories"));
const PaymentMethods = React.lazy(() => import("./finance/PaymentMethods"));
const RecurrenceRules = React.lazy(() => import("./finance/RecurrenceRules"));
const CurrencyTax = React.lazy(() => import("./finance/CurrencyTax"));
const TransactionCategories = React.lazy(() => import("./finance/TransactionCategories"));
const ProjectStatuses = React.lazy(() => import("./projects/ProjectStatuses"));
const PrioritiesLabels = React.lazy(() => import("./projects/PrioritiesLabels"));
const TaskTemplates = React.lazy(() => import("./projects/TaskTemplates"));
const SocialAccountsSettings = React.lazy(() => import("./social/SocialAccountsSettings"));
const PublishingRules = React.lazy(() => import("./social/PublishingRules"));
const ContentCategories = React.lazy(() => import("./social/ContentCategories"));
const RolesPermissions = React.lazy(() => import("./team/RolesPermissions"));
const Departments = React.lazy(() => import("./team/Departments"));
const NotificationChannels = React.lazy(() => import("./notifications/NotificationChannels"));
const AlertRules = React.lazy(() => import("./notifications/AlertRules"));
const DangerZone = React.lazy(() => import("./DangerZone"));
const LeadgenSettingsPage = React.lazy(() => import("../leadgen/LeadgenSettings"));

function SettingsLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function SLazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SettingsLoader />}>{children}</Suspense>;
}

export function SettingsRoutes() {
  return (
    <Route path="settings" element={<AdminRoute />}>
      <Route element={<SettingsLayout />}>
        <Route index element={<Navigate to="general/profile" replace />} />
        {/* General */}
        <Route path="general/profile"               element={<SLazy><PortalProfile /></SLazy>} />
        <Route path="general/aspetto"               element={<SLazy><Appearance /></SLazy>} />
        {/* Finanza */}
        <Route path="finance/categorie-entrate"     element={<SLazy><IncomeCategories /></SLazy>} />
        <Route path="finance/categorie-uscite"      element={<SLazy><ExpenseCategories /></SLazy>} />
        <Route path="finance/categorie-abbonamenti" element={<SLazy><SubscriptionCategories /></SLazy>} />
        <Route path="finance/metodi-pagamento"      element={<SLazy><PaymentMethods /></SLazy>} />
        <Route path="finance/regole-ricorrenze"     element={<SLazy><RecurrenceRules /></SLazy>} />
        <Route path="finance/valute-tasse"          element={<SLazy><CurrencyTax /></SLazy>} />
        <Route path="finance/categorie-transazioni" element={<SLazy><TransactionCategories /></SLazy>} />
        {/* Progetti */}
        <Route path="progetti/stati"                element={<SLazy><ProjectStatuses /></SLazy>} />
        <Route path="progetti/priorita-label"       element={<SLazy><PrioritiesLabels /></SLazy>} />
        <Route path="progetti/template-task"        element={<SLazy><TaskTemplates /></SLazy>} />
        {/* Social */}
        <Route path="social/account-collegati"      element={<SLazy><SocialAccountsSettings /></SLazy>} />
        <Route path="social/regole-pubblicazione"   element={<SLazy><PublishingRules /></SLazy>} />
        <Route path="social/categorie-contenuti"    element={<SLazy><ContentCategories /></SLazy>} />
        {/* Team */}
        <Route path="team/ruoli-permessi"           element={<SLazy><RolesPermissions /></SLazy>} />
        <Route path="team/reparti"                  element={<SLazy><Departments /></SLazy>} />
        {/* Notifiche */}
        <Route path="notifiche/canali"              element={<SLazy><NotificationChannels /></SLazy>} />
        <Route path="notifiche/regole-alert"        element={<SLazy><AlertRules /></SLazy>} />
        {/* Lead Generation — REDX only */}
        <Route path="leadgen/impostazioni"          element={<SLazy><LeadgenSettingsPage /></SLazy>} />
        {/* Danger Zone */}
        <Route path="danger-zone"                   element={<SLazy><DangerZone /></SLazy>} />
      </Route>
    </Route>
  );
}
