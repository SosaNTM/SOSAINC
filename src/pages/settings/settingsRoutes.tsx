import { Route, Navigate } from "react-router-dom";
import SettingsLayout from "./SettingsLayout";
import PortalProfile from "./general/PortalProfile";
import Appearance from "./general/Appearance";
import IncomeCategories from "./finance/IncomeCategories";
import ExpenseCategories from "./finance/ExpenseCategories";
import SubscriptionCategories from "./finance/SubscriptionCategories";
import PaymentMethods from "./finance/PaymentMethods";
import RecurrenceRules from "./finance/RecurrenceRules";
import CurrencyTax from "./finance/CurrencyTax";
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

export function SettingsRoutes() {
  return (
    <Route path="settings" element={<SettingsLayout />}>
      <Route index element={<Navigate to="general/profilo" replace />} />
      <Route path="general/profilo"               element={<PortalProfile />} />
      <Route path="general/aspetto"               element={<Appearance />} />
      <Route path="finance/categorie-entrate"     element={<IncomeCategories />} />
      <Route path="finance/categorie-uscite"      element={<ExpenseCategories />} />
      <Route path="finance/categorie-abbonamenti" element={<SubscriptionCategories />} />
      <Route path="finance/metodi-pagamento"      element={<PaymentMethods />} />
      <Route path="finance/regole-ricorrenze"     element={<RecurrenceRules />} />
      <Route path="finance/valute-tasse"          element={<CurrencyTax />} />
      <Route path="progetti/stati"                element={<ProjectStatuses />} />
      <Route path="progetti/priorita-label"       element={<PrioritiesLabels />} />
      <Route path="progetti/template-task"        element={<TaskTemplates />} />
      <Route path="social/account-collegati"      element={<SocialAccountsSettings />} />
      <Route path="social/regole-pubblicazione"   element={<PublishingRules />} />
      <Route path="social/categorie-contenuti"    element={<ContentCategories />} />
      <Route path="team/ruoli-permessi"           element={<RolesPermissions />} />
      <Route path="team/reparti"                  element={<Departments />} />
      <Route path="notifiche/canali"              element={<NotificationChannels />} />
      <Route path="notifiche/regole-alert"        element={<AlertRules />} />
    </Route>
  );
}
