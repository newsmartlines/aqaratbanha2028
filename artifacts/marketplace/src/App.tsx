import type { ComponentType } from "react";
import { lazy, Suspense, useEffect, createContext, useContext } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/ThemeProvider";
import { api, mediaUrl, type SiteSettings } from "@/lib/api";
import { ScrollRestorer, ScrollToTopButton } from "@/components/ScrollToTop";
import { useSse } from "@/lib/use-sse";

// ── Site-settings context ───────────────────────────────────────────────────
export const SiteSettingsContext = createContext<SiteSettings | null>(null);
export function useSiteSettings() { return useContext(SiteSettingsContext); }

// ── Lazy page imports (code splitting) ─────────────────────────────────────
// Public pages
const Home = lazy(() => import("@/pages/home"));
const SearchPage = lazy(() => import("@/pages/search"));
const NotFound = lazy(() => import("@/pages/not-found"));
const PropertyDetail = lazy(() => import("@/pages/property-detail"));
const ComparePage = lazy(() => import("@/pages/compare"));
const AdvertiserPage = lazy(() => import("@/pages/advertiser"));
const PropertiesPage = lazy(() => import("@/pages/properties"));
const AboutPage = lazy(() => import("@/pages/about"));
const ContactPage = lazy(() => import("@/pages/contact"));
const FaqPage = lazy(() => import("@/pages/faq"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const TermsPage = lazy(() => import("@/pages/terms"));
const SitemapPage = lazy(() => import("@/pages/sitemap"));
const AddPropertyPage = lazy(() => import("@/pages/add-property"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const MapSearchPage = lazy(() => import("@/pages/map-search"));
const MarketInsightsPage = lazy(() => import("@/pages/market-insights"));
const CompanyRegisterPage = lazy(() => import("@/pages/company-register"));

// Auth pages
const AuthPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));

// Dashboard pages
const DashboardOverview = lazy(() => import("@/pages/dashboard/index"));
const DashboardProperties = lazy(() => import("@/pages/dashboard/properties"));
const DashboardPackages = lazy(() => import("@/pages/dashboard/packages"));
const DashboardPromotions = lazy(() => import("@/pages/dashboard/promotions"));
const DashboardMessages = lazy(() => import("@/pages/dashboard/messages"));
const DashboardFavorites = lazy(() => import("@/pages/dashboard/favorites"));
const DashboardSavedSearches = lazy(() => import("@/pages/dashboard/saved-searches"));
const DashboardPayments = lazy(() => import("@/pages/dashboard/payments"));
const DashboardSettings = lazy(() => import("@/pages/dashboard/settings"));
const DashboardNotifications = lazy(() => import("@/pages/dashboard/notifications"));
const DashboardReviews = lazy(() => import("@/pages/dashboard/reviews"));
const DashboardInbox = lazy(() => import("@/pages/dashboard/inbox"));
const DashboardSupport = lazy(() => import("@/pages/dashboard/support"));
const DashboardSupportTickets = lazy(() => import("@/pages/dashboard/support-tickets"));
const ProviderCheckout = lazy(() => import("@/pages/dashboard/checkout"));
const CheckoutResult = lazy(() => import("@/pages/dashboard/checkout-result"));
const UserEditProperty = lazy(() => import("@/pages/user/edit-property"));
const SubscriptionPayPage = lazy(() => import("@/pages/pay/subscription"));
const ListingPayPage = lazy(() => import("@/pages/pay/listing"));

// Admin pages
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminProviders = lazy(() => import("@/pages/admin/providers"));
const AdminPayments = lazy(() => import("@/pages/admin/payments"));
const AdminReports = lazy(() => import("@/pages/admin/reports"));
const AdminComplaints = lazy(() => import("@/pages/admin/complaints"));
const AdminSubscriptions = lazy(() => import("@/pages/admin/subscriptions"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminRealEstateCategories = lazy(() => import("@/pages/admin/real-estate-categories"));
const AdminLocations = lazy(() => import("@/pages/admin/locations"));
const AdminStaff = lazy(() => import("@/pages/admin/staff"));
const AdminSupportTickets = lazy(() => import("@/pages/admin/support-tickets"));
const AdminProviderEdit = lazy(() => import("@/pages/admin/provider-edit"));
const AdminProperties = lazy(() => import("@/pages/admin/properties"));
const AdminPropertyReview = lazy(() => import("@/pages/admin/property-review"));
const AdminPropertyEdit = lazy(() => import("@/pages/admin/property-edit"));
const AdminPropertyAdd = lazy(() => import("@/pages/admin/property-add"));
const AdminWatermark = lazy(() => import("@/pages/admin/watermark"));
const AdminSeo = lazy(() => import("@/pages/admin/seo"));
const AdminGoogleKit = lazy(() => import("@/pages/admin/google-kit"));
const AdminEmailTemplates = lazy(() => import("@/pages/admin/email-templates"));
const AdminMessages = lazy(() => import("@/pages/admin/messages"));
const AdminPlansCommissions = lazy(() => import("@/pages/admin/plans-commissions"));
const AdminChatbot = lazy(() => import("@/pages/admin/chatbot"));
const AdminFeaturedAreas = lazy(() => import("@/pages/admin/featured-areas"));
const AdminPropertyFeatures = lazy(() => import("@/pages/admin/property-features"));
const AdminPropertyTypeConfigs = lazy(() => import("@/pages/admin/property-type-configs"));
const AdminDemoContent = lazy(() => import("@/pages/admin/demo-content"));
const AdminBackup = lazy(() => import("@/pages/admin/backup"));
const AdminUpdates = lazy(() => import("@/pages/admin/updates"));
const AdminWpImport = lazy(() => import("@/pages/admin/wp-import"));
const AdminAnalytics = lazy(() => import("@/pages/admin/analytics"));
const AdminAds = lazy(() => import("@/pages/admin/ads"));
const AdminPopups = lazy(() => import("@/pages/admin/popups"));
const AdminPromotions = lazy(() => import("@/pages/admin/promotions"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminCommission = lazy(() => import("@/pages/admin/commission"));
const AdminSettingsAppearance = lazy(() => import("@/pages/admin/settings-appearance"));
const AdminMenu = lazy(() => import("@/pages/admin/menu"));
import { PopupRenderer } from "@/components/PopupRenderer";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

type AppRole = "admin" | "provider" | "user";

function roleHome(role: string): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "provider") return "/dashboard";
  if (role === "user") return "/dashboard";
  return "/";
}

function PageLoader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden">
      <div
        className="h-full bg-teal-500 animate-pulse"
        style={{ animation: "page-progress 1.2s ease-in-out infinite" }}
      />
      <style>{`
        @keyframes page-progress {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 70%;  margin-left: 15%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

function RoleProtectedRoute({
  component: Component,
  roles,
  loginPath = "/login",
}: {
  component: ComponentType;
  roles?: readonly AppRole[];
  loginPath?: string;
}) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    const sep = loginPath.includes("?") ? "&" : "?";
    return <Redirect to={`${loginPath}${sep}returnTo=${encodeURIComponent(location)}`} />;
  }

  if (roles?.length && !(roles as readonly string[]).includes(user.role)) {
    return <Redirect to={roleHome(user.role)} />;
  }

  return <Component />;
}

/** Allows main admin (role==="admin") OR any active staff member (staffRole set). */
function AdminProtectedRoute({ component: Component }: { component: ComponentType }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Redirect to={`/admin/login?returnTo=${encodeURIComponent(location)}`} />;
  }

  if (user.role !== "admin" && !user.staffRole) {
    return <Redirect to={roleHome(user.role)} />;
  }

  return <Component />;
}

// ── Router ─────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={Home} />
        <Route path="/search" component={SearchPage} />
        <Route path="/add-property" component={AddPropertyPage} />
        <Route path="/map-search" component={MapSearchPage} />
        <Route path="/properties" component={PropertiesPage} />
        <Route path="/property/:id" component={PropertyDetail} />
        <Route path="/compare" component={ComparePage} />
        <Route path="/advertiser/:id" component={AdvertiserPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/faq" component={FaqPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/sitemap" component={SitemapPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/market" component={MarketInsightsPage} />

        <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
        <Route path="/provider" component={() => <Redirect to="/dashboard" />} />
        <Route path="/user" component={() => <Redirect to="/dashboard" />} />

        {/* Auth routes */}
        <Route path="/login">{() => <AuthPage />}</Route>
        <Route path="/register" component={RegisterPage} />
        <Route path="/company-register" component={CompanyRegisterPage} />
        <Route path="/admin/login" component={AdminLogin} />

        {/* Real-estate onboarding — redirected to unified add-property form */}
        <Route path="/real-estate-onboarding">{() => <Redirect to="/add-property" />}</Route>

        {/* ── Unified Dashboard (user + provider) ────────────────────────── */}
        <Route path="/dashboard">
          {() => <RoleProtectedRoute component={DashboardOverview} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/properties">
          {() => <RoleProtectedRoute component={DashboardProperties} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/promotions">
          {() => <RoleProtectedRoute component={DashboardPromotions} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/packages">
          {() => <RoleProtectedRoute component={DashboardPackages} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/messages">
          {() => <RoleProtectedRoute component={DashboardMessages} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/favorites">
          {() => <RoleProtectedRoute component={DashboardFavorites} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/saved-searches">
          {() => <RoleProtectedRoute component={DashboardSavedSearches} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/payments">
          {() => <RoleProtectedRoute component={DashboardPayments} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/settings">
          {() => <RoleProtectedRoute component={DashboardSettings} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/notifications">
          {() => <RoleProtectedRoute component={DashboardNotifications} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/reviews">
          {() => <RoleProtectedRoute component={DashboardReviews} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/inbox">
          {() => <RoleProtectedRoute component={DashboardInbox} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/support">
          {() => <RoleProtectedRoute component={DashboardSupport} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/support-tickets">
          {() => <RoleProtectedRoute component={DashboardSupportTickets} roles={["user", "provider"]} />}
        </Route>
        <Route path="/dashboard/edit-property/:id">
          {() => <RoleProtectedRoute component={UserEditProperty} roles={["user", "provider"]} />}
        </Route>

        {/* Provider-only: checkout + payment pages */}
        <Route path="/dashboard/checkout">
          {() => <RoleProtectedRoute component={ProviderCheckout} roles={["provider"]} />}
        </Route>
        <Route path="/dashboard/checkout/result">
          {() => <RoleProtectedRoute component={CheckoutResult} roles={["provider"]} />}
        </Route>
        <Route path="/pay/subscription" component={SubscriptionPayPage} />
        <Route path="/pay/listing" component={ListingPayPage} />

        {/* Legacy redirects — old /provider/* and /user/* URLs */}
        <Route path="/provider/dashboard" component={() => <Redirect to="/dashboard" />} />
        <Route path="/provider/subscription" component={() => <Redirect to="/dashboard/packages" />} />
        <Route path="/dashboard/subscription" component={() => <Redirect to="/dashboard/packages" />} />
        <Route path="/dashboard/my-plan" component={() => <Redirect to="/dashboard/packages" />} />
        <Route path="/dashboard/my-properties" component={() => <Redirect to="/dashboard/properties" />} />
        <Route path="/user/dashboard" component={() => <Redirect to="/dashboard" />} />
        <Route path="/user/favorites" component={() => <Redirect to="/dashboard/favorites" />} />
        <Route path="/user/saved-searches" component={() => <Redirect to="/dashboard/saved-searches" />} />
        <Route path="/user/payments" component={() => <Redirect to="/dashboard/payments" />} />
        <Route path="/user/inbox" component={() => <Redirect to="/dashboard/messages" />} />
        <Route path="/user/support" component={() => <Redirect to="/dashboard/support" />} />
        <Route path="/user/settings" component={() => <Redirect to="/dashboard/settings" />} />
        <Route path="/user/profile" component={() => <Redirect to="/dashboard/settings" />} />
        <Route path="/user/my-properties" component={() => <Redirect to="/dashboard/properties" />} />
        <Route path="/user/add-property" component={() => <Redirect to="/add-property" />} />
        <Route path="/user/edit-property/:id">
          {(params) => <Redirect to={`/dashboard/edit-property/${params.id}`} />}
        </Route>

        <Route path="/user/reviews" component={() => <Redirect to="/dashboard/reviews" />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard">
          {() => <AdminProtectedRoute component={AdminDashboard} />}
        </Route>
        <Route path="/admin/providers">
          {() => <AdminProtectedRoute component={AdminProviders} />}
        </Route>
        <Route path="/admin/providers/:id/edit">
          {() => <AdminProtectedRoute component={AdminProviderEdit} />}
        </Route>
        <Route path="/admin/properties">
          {() => <AdminProtectedRoute component={AdminProperties} />}
        </Route>
        <Route path="/admin/properties/new">
          {() => <AdminProtectedRoute component={AdminPropertyAdd} />}
        </Route>
        <Route path="/admin/properties/:id/review">
          {() => <AdminProtectedRoute component={AdminPropertyReview} />}
        </Route>
        <Route path="/admin/properties/:id/edit">
          {() => <AdminProtectedRoute component={AdminPropertyEdit} />}
        </Route>
        <Route path="/admin/watermark">
          {() => <AdminProtectedRoute component={AdminWatermark} />}
        </Route>
        <Route path="/admin/seo">
          {() => <AdminProtectedRoute component={AdminSeo} />}
        </Route>
        <Route path="/admin/google-kit">
          {() => <AdminProtectedRoute component={AdminGoogleKit} />}
        </Route>
        <Route path="/admin/payments">
          {() => <AdminProtectedRoute component={AdminPayments} />}
        </Route>
        <Route path="/admin/reports">
          {() => <AdminProtectedRoute component={AdminReports} />}
        </Route>
        <Route path="/admin/complaints">
          {() => <AdminProtectedRoute component={AdminComplaints} />}
        </Route>
        <Route path="/admin/subscriptions">
          {() => <AdminProtectedRoute component={AdminSubscriptions} />}
        </Route>
        <Route path="/admin/settings">
          {() => <AdminProtectedRoute component={AdminSettings} />}
        </Route>
        <Route path="/admin/users">
          {() => <AdminProtectedRoute component={AdminUsers} />}
        </Route>
        <Route path="/admin/real-estate-categories">
          {() => <AdminProtectedRoute component={AdminRealEstateCategories} />}
        </Route>
        <Route path="/admin/locations">
          {() => <AdminProtectedRoute component={AdminLocations} />}
        </Route>
        <Route path="/admin/support-tickets">
          {() => <AdminProtectedRoute component={AdminSupportTickets} />}
        </Route>
        <Route path="/admin/staff">
          {() => <AdminProtectedRoute component={AdminStaff} />}
        </Route>
        <Route path="/admin/email-templates">
          {() => <AdminProtectedRoute component={AdminEmailTemplates} />}
        </Route>
        <Route path="/admin/messages">
          {() => <AdminProtectedRoute component={AdminMessages} />}
        </Route>
        <Route path="/admin/plans-commissions">
          {() => <AdminProtectedRoute component={AdminPlansCommissions} />}
        </Route>
        <Route path="/admin/chatbot">
          {() => <AdminProtectedRoute component={AdminChatbot} />}
        </Route>
        <Route path="/admin/featured-areas">
          {() => <AdminProtectedRoute component={AdminFeaturedAreas} />}
        </Route>
        <Route path="/admin/property-features">
          {() => <AdminProtectedRoute component={AdminPropertyFeatures} />}
        </Route>
        <Route path="/admin/property-type-configs">
          {() => <AdminProtectedRoute component={AdminPropertyTypeConfigs} />}
        </Route>
        <Route path="/admin/demo-content">
          {() => <AdminProtectedRoute component={AdminDemoContent} />}
        </Route>
        <Route path="/admin/backup">
          {() => <AdminProtectedRoute component={AdminBackup} />}
        </Route>
        <Route path="/admin/updates">
          {() => <AdminProtectedRoute component={AdminUpdates} />}
        </Route>
        <Route path="/admin/wp-import">
          {() => <AdminProtectedRoute component={AdminWpImport} />}
        </Route>
        <Route path="/admin/analytics">
          {() => <AdminProtectedRoute component={AdminAnalytics} />}
        </Route>
        <Route path="/admin/ads">
          {() => <AdminProtectedRoute component={AdminAds} />}
        </Route>
        <Route path="/admin/popups">
          {() => <AdminProtectedRoute component={AdminPopups} />}
        </Route>
        <Route path="/admin/promotions">
          {() => <AdminProtectedRoute component={AdminPromotions} />}
        </Route>
        <Route path="/admin/categories">
          {() => <AdminProtectedRoute component={AdminCategories} />}
        </Route>
        <Route path="/admin/commission">
          {() => <AdminProtectedRoute component={AdminCommission} />}
        </Route>
        <Route path="/admin/settings-appearance">
          {() => <AdminProtectedRoute component={AdminSettingsAppearance} />}
        </Route>
        <Route path="/admin/menu">
          {() => <AdminProtectedRoute component={AdminMenu} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function FaviconUpdater() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const faviconUrl = settings?.faviconUrl;
    if (!faviconUrl) return;
    const url = mediaUrl(faviconUrl);
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [settings?.faviconUrl]);

  return null;
}

function GoogleWrapper({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
  const clientId = (settings as SiteSettings & { googleClientId?: string })?.googleClientId
    || import.meta.env.VITE_GOOGLE_CLIENT_ID
    || "";

  return (
    <SiteSettingsContext.Provider value={settings ?? null}>
      <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
    </SiteSettingsContext.Provider>
  );
}

function SseConnector() {
  useSse(true);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <GoogleWrapper>
            <TooltipProvider>
              <SseConnector />
              <FaviconUpdater />
              <ThemeProvider />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <ScrollRestorer />
                <Router />
              </WouterRouter>
              <ScrollToTopButton />
              <PopupRenderer />
              <Toaster />
              <HotToaster position="top-center" />
            </TooltipProvider>
          </GoogleWrapper>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
