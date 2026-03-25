import { Route, Navigate } from "react-router-dom";
import { AdminRoute } from "@/components/AdminRoute";
import SettingsLayout from "./SettingsLayout";
import PortalProfile from "./general/PortalProfile";
import Appearance from "./general/Appearance";
import IncomeCategories from "./finance/IncomeCategories";
import ExpenseCategories from "./finance/ExpenseCategories";
import SubscriptionCategories from "./finance/SubscriptionCategories";
import PaymentMethods from "./finance/PaymentMethods";
import RecurrenceRules from "./finance/RecurrenceRules";
import CurrencyTax from "./finance/CurrencyTax";
import TransactionCategories from "./finance/TransactionCategories";
import ProjectStatuses from "./projects/ProjectStatuses";
import PrioritiesLabels from "./projects/PrioritiesLabels";
import TaskTemplates from "./projects/TaskTemplates";
import SocialAccountsSettings from "./social/SocialAccountsSettings";
import PublishingRules from "./social/PublishingRules";
import ContentCategories from "./social/ContentCategories";
import RolesPermissions from "./team/RolesPermissions";
import Departments from "./team/Departments";
import NotificationChannels from "./notifications/NotificationChannels";
import AlertRules from "./notifications/AlertRules";
import DangerZone from "./DangerZone";

export function SettingsRoutes() {
  return (
    <Route path="settings" element={<AdminRoute />}>
      <Route element={<SettingsLayout />}>
        <Route index element={<Navigate to="general/profilo" replace />} />
        {/* Generale */}
        <Route path="general/profilo"               element={<PortalProfile />} />
        <Route path="general/aspetto"               element={<Appearance />} />
        {/* Finanza */}
        <Route path="finance/categorie-entrate"     element={<IncomeCategories />} />
        <Route path="finance/categorie-uscite"      element={<ExpenseCategories />} />
        <Route path="finance/categorie-abbonamenti" element={<SubscriptionCategories />} />
        <Route path="finance/metodi-pagamento"      element={<PaymentMethods />} />
        <Route path="finance/regole-ricorrenze"     element={<RecurrenceRules />} />
        <Route path="finance/valute-tasse"          element={<CurrencyTax />} />
        <Route path="finance/categorie-transazioni" element={<TransactionCategories />} />
        {/* Progetti */}
        <Route path="progetti/stati"                element={<ProjectStatuses />} />
        <Route path="progetti/priorita-label"       element={<PrioritiesLabels />} />
        <Route path="progetti/template-task"        element={<TaskTemplates />} />
        {/* Social */}
        <Route path="social/account-collegati"      element={<SocialAccountsSettings />} />
        <Route path="social/regole-pubblicazione"   element={<PublishingRules />} />
        <Route path="social/categorie-contenuti"    element={<ContentCategories />} />
        {/* Team */}
        <Route path="team/ruoli-permessi"           element={<RolesPermissions />} />
        <Route path="team/reparti"                  element={<Departments />} />
        {/* Notifiche */}
        <Route path="notifiche/canali"              element={<NotificationChannels />} />
        <Route path="notifiche/regole-alert"        element={<AlertRules />} />
        {/* Danger Zone */}
        <Route path="danger-zone"                   element={<DangerZone />} />
      </Route>
    </Route>
  );
}
