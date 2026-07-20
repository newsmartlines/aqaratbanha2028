import type { ComponentType } from "react";
import { useEffect, createContext, useContext } from "react";
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
import AiChat from "@/components/AiChat";
import { useSse } from "@/lib/use-sse";

// ── Site-settings context ───────────────────────────────────────────────────
export const SiteSettingsContext = createContext<SiteSettings | null>(null);
export function useSiteSettings() { return useContext(SiteSettingsContext); }
import Home from "@/pages/home";
import SearchPage from "@/pages/search";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProviders from "@/pages/admin/providers";
import AdminPayments from "@/pages/admin/payments";
import AdminReports from "@/pages/admin/reports";
import AdminComplaints from "@/pages/admin/complaints";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminSettings from "@/pages/admin/settings";
import AdminUsers from "@/pages/admin/users";
import AdminRealEstateCategories from "@/pages/admin/real-estate-categories";
import AdminLocations from "@/pages/admin/locations";
import DashboardOverview from "@/pages/dashboard/index";
import DashboardProperties from "@/pages/dashboard/properties";
import DashboardPackages from "@/pages/dashboard/packages";
import DashboardPromotions from "@/pages/dashboard/promotions";
import DashboardMessages from "@/pages/dashboard/messages";
import DashboardFavorites from "@/pages/dashboard/favorites";
import DashboardSavedSearches from "@/pages/dashboard/saved-searches";
import DashboardPayments from "@/pages/dashboard/payments";
import DashboardSettings from "@/pages/dashboard/settings";
import DashboardNotifications from "@/pages/dashboard/notifications";
import DashboardReviews from "@/pages/dashboard/reviews";
import DashboardInbox from "@/pages/dashboard/inbox";
import DashboardSupport from "@/pages/dashboard/support";
import DashboardSupportTickets from "@/pages/dashboard/support-tickets";
import SubscriptionPayPage from "@/pages/pay/subscription";
import ListingPayPage from "@/pages/pay/listing";
import ProviderCheckout from "@/pages/dashboard/checkout";
import CheckoutResult from "@/pages/dashboard/checkout-result";
import UserEditProperty from "@/pages/user/edit-property";
import AdminStaff from "@/pages/admin/staff";
import AdminSupportTickets from "@/pages/admin/support-tickets";
import AdminProviderEdit from "@/pages/admin/provider-edit";
import AdminProperties from "@/pages/admin/properties";
import AdminPropertyReview from "@/pages/admin/property-review";
import AdminPropertyEdit from "@/pages/admin/property-edit";
import AdminPropertyAdd from "@/pages/admin/property-add";
import AdminWatermark from "@/pages/admin/watermark";
import AdminSeo from "@/pages/admin/seo";
import AdminGoogleKit from "@/pages/admin/google-kit";
import AdminEmailTemplates from "@/pages/admin/email-templates";
import AdminMessages from "@/pages/admin/messages";
import AdminPlansCommissions from "@/pages/admin/plans-commissions";
import AdminChatbot from "@/pages/admin/chatbot";
import AdminFeaturedAreas from "@/pages/admin/featured-areas";
import AdminPropertyFeatures from "@/pages/admin/property-features";
import AdminPropertyTypeConfigs from "@/pages/admin/property-type-configs";
import AdminDemoContent from "@/pages/admin/demo-content";
import AdminBackup from "@/pages/admin/backup";
import AdminWpImport from "@/pages/admin/wp-import";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminAds from "@/pages/admin/ads";
import AdminPopups from "@/pages/admin/popups";
import AdminPromotions from "@/pages/admin/promotions";
import AdminCategories from "@/pages/admin/categories";
import AdminCommission from "@/pages/admin/commission";
import AdminSettingsAppearance from "@/pages/admin/settings-appearance";
import AdminMenu from "@/pages/admin/menu";
import { PopupRenderer } from "@/components/PopupRenderer";
import PropertyDetail from "@/pages/property-detail";
import ComparePage from "@/pages/compare";
import AdvertiserPage from "@/pages/advertiser";
import PropertiesPage from "@/pages/properties";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import FaqPage from "@/pages/faq";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import SitemapPage from "@/pages/sitemap";
import AddPropertyPage from "@/pages/add-property";
import PricingPage from "@/pages/pricing";
import MapSearchPage from "@/pages/map-search";
import MarketInsightsPage from "@/pages/market-insights";
import CompanyRegisterPage from "@/pages/company-register";

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

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm" dir="rtl">
        جاري التحميل...
      </div>
    );
  }

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

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm" dir="rtl">
        جاري التحميل...
      </div>
    );
  }

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
  const clientId = (settings as any)?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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
              {/* AiChat hidden */}
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
