import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PortalLayout } from "./components/PortalLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./lib/authContext";
import { PortalProvider } from "./lib/portalContext";
import { PortalDBProvider } from "./lib/portalContextDB";
import HubPage from "./pages/HubPage";
import Dashboard from "./pages/Dashboard";
import Budget from "./pages/Budget";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import Invoices from "./pages/Invoices";
import Subscriptions from "./pages/Subscriptions";
import Analytics from "./pages/Analytics";
import { SettingsRoutes } from "./pages/settings/settingsRoutes";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";
import VaultPage from "./pages/VaultPage";
import CloudPage from "./pages/CloudPage";
import TasksPage from "./pages/TasksPage";
import NotesPage from "./pages/NotesPage";
import AdministrationPage from "./pages/AdministrationPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SocialOverview from "./pages/social/SocialOverview";
import SocialAccounts from "./pages/social/SocialAccounts";
import SocialAnalytics from "./pages/social/SocialAnalytics";
import SocialContent from "./pages/social/SocialContent";
import SocialAudience from "./pages/social/SocialAudience";
import SocialCompetitors from "./pages/social/SocialCompetitors";
import { ThemeProvider } from "./lib/theme";
import { NumberFormatProvider } from "./lib/numberFormat";
import { PeriodProvider } from "./lib/periodContext";
import { AccentProvider } from "./lib/accent";

const queryClient = new QueryClient();

/* Shared portal routes — rendered inside each /:portalId layout */
function PortalRoutes() {
  return (
    <>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="profile/:userId" element={<ProfilePage />} />
      <Route path="revenue" element={<Navigate to="dashboard" replace />} />
      <Route path="costs" element={<Budget />} />
      <Route path="transactions" element={<Transactions />} />
      <Route path="channels" element={<Subscriptions />} />
      <Route path="pl-rules" element={<Goals />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="invoices" element={<Invoices />} />
      <Route path="vault" element={<VaultPage />} />
      <Route path="cloud" element={<CloudPage />} />
      <Route path="tasks" element={<TasksPage />} />
      <Route path="notes" element={<NotesPage />} />
      <Route path="admin" element={<AdministrationPage />} />
      <Route path="reports" element={<PlaceholderPage name="Reports" />} />
      <Route path="forecast" element={<PlaceholderPage name="Forecast" />} />
      <Route path="social" element={<Navigate to="overview" replace />} />
      <Route path="social/overview" element={<SocialOverview />} />
      <Route path="social/accounts" element={<SocialAccounts />} />
      <Route path="social/analytics" element={<SocialAnalytics />} />
      <Route path="social/content" element={<SocialContent />} />
      <Route path="social/audience" element={<SocialAudience />} />
      <Route path="social/competitors" element={<SocialCompetitors />} />
      {SettingsRoutes()}
      {/* Default: redirect to dashboard */}
      <Route index element={<Navigate to="dashboard" replace />} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AccentProvider>
      <NumberFormatProvider>
        <PeriodProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthProvider>
              <PortalDBProvider>
              <PortalProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    {/* Hub — portal selector */}
                    <Route path="/hub" element={<HubPage />} />

                    {/* Portal routes — each portal uses the same layout + pages */}
                    <Route path="/:portalId" element={<PortalLayout />}>
                      {PortalRoutes()}
                    </Route>
                  </Route>

                  {/* Root redirect */}
                  <Route path="/" element={<Navigate to="/hub" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </PortalProvider>
              </PortalDBProvider>
            </AuthProvider>
          </TooltipProvider>
        </PeriodProvider>
      </NumberFormatProvider>
      </AccentProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
