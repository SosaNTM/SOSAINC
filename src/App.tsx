import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { STORAGE_APP_RESET_VERSION, STORAGE_PROFILE_PREFIX, STORAGE_AUDIT_LOG, STORAGE_THEME, STORAGE_ACCENT, STORAGE_NUMBER_FORMAT, STORAGE_CURRENCY } from "@/constants/storageKeys";
import { PortalLayout } from "./components/PortalLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { AuthProvider } from "./lib/authContext";
import { PortalProvider } from "./lib/portalContext";
import { PortalDBProvider } from "./lib/portalContextDB";
import { ThemeProvider } from "./lib/theme";
import { NumberFormatProvider } from "./lib/numberFormat";
import { PeriodProvider } from "./lib/periodContext";
import { AccentProvider } from "./lib/accent";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";

// ── Eager imports — instant navigation, no per-route chunk delay ────────────
import LoginPage from "./pages/LoginPage";
import HubPage from "./pages/HubPage";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/dashboard/Dashboard";
import Budget from "./pages/Budget";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import Invoices from "./pages/Invoices";
import Subscriptions from "./pages/Subscriptions";
import Analytics from "./pages/Analytics";
import CryptoPage from "./pages/crypto/CryptoPage";
import GiftCardsPage from "./pages/gift-cards/GiftCardsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import Recap from "./pages/Recap";
import VaultPage from "./pages/VaultPage";
import CloudPage from "./pages/CloudPage";
import TasksPage from "./pages/TasksPage";
import NotesPage from "./pages/NotesPage";
import InventoryPage from "./pages/InventoryPage";
import AdministrationPage from "./pages/AdministrationPage";
import ProfilePage from "./pages/ProfilePage";
import SocialOverview from "./pages/social/SocialOverview";
import SocialAccounts from "./pages/social/SocialAccounts";
import SocialAnalytics from "./pages/social/SocialAnalytics";
import SocialContent from "./pages/social/SocialContent";
import SocialAudience from "./pages/social/SocialAudience";
import SocialCompetitors from "./pages/social/SocialCompetitors";

// ── Rarely-used pages stay lazy (auth flows, OAuth) ─────────────────────────
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const OAuthCallback = React.lazy(() => import("./pages/social/OAuthCallback"));

// Settings routes — lazy-loaded internally via settingsRoutes.tsx
import { SettingsRoutes } from "./pages/settings/settingsRoutes";

// ── Leadgen — lazy, REDX-only feature ────────────────────────────────────────
const LeadgenDashboard    = React.lazy(() => import("./pages/leadgen/LeadgenDashboard"));
const LeadgenSearch       = React.lazy(() => import("./pages/leadgen/LeadgenSearch"));
const LeadgenSearchHistory = React.lazy(() => import("./pages/leadgen/LeadgenSearchHistory"));
const LeadgenNoWebsite    = React.lazy(() => import("./pages/leadgen/LeadgenNoWebsite"));
const LeadgenWithWebsite  = React.lazy(() => import("./pages/leadgen/LeadgenWithWebsite"));
const LeadgenLeadDetail   = React.lazy(() => import("./pages/leadgen/LeadgenLeadDetail"));

const queryClient = new QueryClient();

// ── One-time data reset ──────────────────────────────────────────────────────
// Bumping this version clears all cached demo data from localStorage on next load.
// Safe to increment whenever a clean slate is needed.
const RESET_VERSION = "portal_shared_v6";
if (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_APP_RESET_VERSION) !== RESET_VERSION) {
  const KEEP_PREFIXES = [STORAGE_PROFILE_PREFIX, STORAGE_AUDIT_LOG, "sb-", STORAGE_APP_RESET_VERSION, STORAGE_THEME, STORAGE_ACCENT, STORAGE_NUMBER_FORMAT, STORAGE_CURRENCY, "period_"];
  Object.keys(localStorage).forEach((key) => {
    if (!KEEP_PREFIXES.some((p) => key.startsWith(p))) {
      localStorage.removeItem(key);
    }
  });
  localStorage.setItem(STORAGE_APP_RESET_VERSION, RESET_VERSION);
}

/* Helper: wrap a lazy element in Suspense — only for truly lazy-loaded pages */
function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

/* Shared portal routes — rendered inside each /:portalId layout */
function PortalRoutes() {
  return (
    <>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="profile/:userId" element={<ProfilePage />} />
      <Route path="revenue" element={<Navigate to="dashboard" replace />} />
      <Route path="costs" element={<Budget />} />
      <Route path="recap" element={<Recap />} />
      <Route path="transactions" element={<Transactions />} />
      <Route path="channels" element={<Subscriptions />} />
      <Route path="pl-rules" element={<Goals />} />
      <Route path="crypto" element={<CryptoPage />} />
      <Route path="gift-cards" element={<GiftCardsPage />} />
      {/* Business finance sub-pages removed — classification handled via transactions + dashboard */}
      <Route path="analytics" element={<Analytics />} />
      <Route path="invoices" element={<Invoices />} />
      <Route path="vault" element={<VaultPage />} />
      <Route path="cloud" element={<CloudPage />} />
      <Route path="tasks" element={<TasksPage />} />
      <Route path="notes" element={<NotesPage />} />
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="admin" element={<AdminRoute />}>
        <Route index element={<AdministrationPage />} />
      </Route>
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
      <Route path="leadgen" element={<Lazy><LeadgenDashboard /></Lazy>} />
      <Route path="leadgen/search" element={<Lazy><LeadgenSearch /></Lazy>} />
      <Route path="leadgen/searches" element={<Lazy><LeadgenSearchHistory /></Lazy>} />
      <Route path="leadgen/no-website" element={<Lazy><LeadgenNoWebsite /></Lazy>} />
      <Route path="leadgen/with-website" element={<Lazy><LeadgenWithWebsite /></Lazy>} />
      <Route path="leadgen/lead/:id" element={<Lazy><LeadgenLeadDetail /></Lazy>} />
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
            <PWAUpdatePrompt />
            <AuthProvider>
              <PortalDBProvider>
              <PortalProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<Lazy><ForgotPasswordPage /></Lazy>} />
                  <Route path="/reset-password" element={<Lazy><ResetPasswordPage /></Lazy>} />
                  <Route path="/oauth/callback" element={<Lazy><OAuthCallback /></Lazy>} />

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
