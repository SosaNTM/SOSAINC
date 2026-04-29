import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { STORAGE_APP_RESET_VERSION, STORAGE_PROFILE_PREFIX, STORAGE_AUDIT_LOG, STORAGE_THEME, STORAGE_ACCENT, STORAGE_NUMBER_FORMAT } from "@/constants/storageKeys";
import { Skeleton } from "@/components/ui/skeleton";
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

// ── Non-lazy imports (critical path: login, hub, not-found) ─────────────────
import LoginPage from "./pages/LoginPage";
import HubPage from "./pages/HubPage";
import NotFound from "./pages/NotFound";

// ── Lazy-loaded page components ─────────────────────────────────────────────
const Dashboard = React.lazy(() => import("./pages/dashboard/Dashboard"));
const Budget = React.lazy(() => import("./pages/Budget"));
const Transactions = React.lazy(() => import("./pages/Transactions"));
const Goals = React.lazy(() => import("./pages/Goals"));
const Invoices = React.lazy(() => import("./pages/Invoices"));
const Subscriptions = React.lazy(() => import("./pages/Subscriptions"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const CryptoPage = React.lazy(() => import("./pages/crypto/CryptoPage"));
const GiftCardsPage = React.lazy(() => import("./pages/gift-cards/GiftCardsPage"));
const PlaceholderPage = React.lazy(() => import("./pages/PlaceholderPage"));
const VaultPage = React.lazy(() => import("./pages/VaultPage"));
const CloudPage = React.lazy(() => import("./pages/CloudPage"));
const TasksPage = React.lazy(() => import("./pages/TasksPage"));
const NotesPage = React.lazy(() => import("./pages/NotesPage"));
const InventoryPage = React.lazy(() => import("./pages/InventoryPage"));
const AdministrationPage = React.lazy(() => import("./pages/AdministrationPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const SocialOverview = React.lazy(() => import("./pages/social/SocialOverview"));
const SocialAccounts = React.lazy(() => import("./pages/social/SocialAccounts"));
const SocialAnalytics = React.lazy(() => import("./pages/social/SocialAnalytics"));
const SocialContent = React.lazy(() => import("./pages/social/SocialContent"));
const SocialAudience = React.lazy(() => import("./pages/social/SocialAudience"));
const SocialCompetitors = React.lazy(() => import("./pages/social/SocialCompetitors"));
const OAuthCallback = React.lazy(() => import("./pages/social/OAuthCallback"));

// Settings routes — lazy-loaded internally via settingsRoutes.tsx
import { SettingsRoutes } from "./pages/settings/settingsRoutes";

// ── Page loader skeleton ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="p-6 space-y-4 min-h-screen" style={{ background: "#0a0a0a" }}>
      <Skeleton className="h-8 w-48 mb-6" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

const queryClient = new QueryClient();

// ── One-time data reset ──────────────────────────────────────────────────────
// Bumping this version clears all cached demo data from localStorage on next load.
// Safe to increment whenever a clean slate is needed.
const RESET_VERSION = "portal_shared_v6";
if (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_APP_RESET_VERSION) !== RESET_VERSION) {
  const KEEP_PREFIXES = [STORAGE_PROFILE_PREFIX, STORAGE_AUDIT_LOG, "sb-", STORAGE_APP_RESET_VERSION, STORAGE_THEME, STORAGE_ACCENT, STORAGE_NUMBER_FORMAT, "period_"];
  Object.keys(localStorage).forEach((key) => {
    if (!KEEP_PREFIXES.some((p) => key.startsWith(p))) {
      localStorage.removeItem(key);
    }
  });
  localStorage.setItem(STORAGE_APP_RESET_VERSION, RESET_VERSION);
}

/* Helper: wrap a lazy element in Suspense with the page loader */
function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/* Shared portal routes — rendered inside each /:portalId layout */
function PortalRoutes() {
  return (
    <>
      <Route path="dashboard" element={<Lazy><Dashboard /></Lazy>} />
      <Route path="profile" element={<Lazy><ProfilePage /></Lazy>} />
      <Route path="profile/:userId" element={<Lazy><ProfilePage /></Lazy>} />
      <Route path="revenue" element={<Navigate to="dashboard" replace />} />
      <Route path="costs" element={<Lazy><Budget /></Lazy>} />
      <Route path="transactions" element={<Lazy><Transactions /></Lazy>} />
      <Route path="channels" element={<Lazy><Subscriptions /></Lazy>} />
      <Route path="pl-rules" element={<Lazy><Goals /></Lazy>} />
      <Route path="crypto" element={<Lazy><CryptoPage /></Lazy>} />
      <Route path="gift-cards" element={<Lazy><GiftCardsPage /></Lazy>} />
      {/* Business finance sub-pages removed — classification handled via transactions + dashboard */}
      <Route path="analytics" element={<Lazy><Analytics /></Lazy>} />
      <Route path="invoices" element={<Lazy><Invoices /></Lazy>} />
      <Route path="vault" element={<Lazy><VaultPage /></Lazy>} />
      <Route path="cloud" element={<Lazy><CloudPage /></Lazy>} />
      <Route path="tasks" element={<Lazy><TasksPage /></Lazy>} />
      <Route path="notes" element={<Lazy><NotesPage /></Lazy>} />
      <Route path="inventory" element={<Lazy><InventoryPage /></Lazy>} />
      <Route path="admin" element={<AdminRoute />}>
        <Route index element={<Lazy><AdministrationPage /></Lazy>} />
      </Route>
      <Route path="reports" element={<Lazy><PlaceholderPage name="Reports" /></Lazy>} />
      <Route path="forecast" element={<Lazy><PlaceholderPage name="Forecast" /></Lazy>} />
      <Route path="social" element={<Navigate to="overview" replace />} />
      <Route path="social/overview" element={<Lazy><SocialOverview /></Lazy>} />
      <Route path="social/accounts" element={<Lazy><SocialAccounts /></Lazy>} />
      <Route path="social/analytics" element={<Lazy><SocialAnalytics /></Lazy>} />
      <Route path="social/content" element={<Lazy><SocialContent /></Lazy>} />
      <Route path="social/audience" element={<Lazy><SocialAudience /></Lazy>} />
      <Route path="social/competitors" element={<Lazy><SocialCompetitors /></Lazy>} />
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
