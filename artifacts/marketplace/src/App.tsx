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

// ── Site-settings context ───────────────────────────────────────────────────
export const SiteSettingsContext = createContext<SiteSettings | null>(null);
export function useSiteSettings() { return useContext(SiteSettingsContext); }
export function useServicesEnabled() {
  const s = useSiteSettings();
  return s ? s.servicesModuleEnabled !== "false" : true;
}
import Home from "@/pages/home";
import Home2 from "@/pages/home2";
import SearchPage from "@/pages/search";
import ProviderPage from "@/pages/provider";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import OnboardingPage from "@/pages/onboarding";
import RealEstateOnboardingPage from "@/pages/real-estate-onboarding";
import ProviderRegisterPage from "@/pages/provider-register";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProviders from "@/pages/admin/providers";
import AdminListings from "@/pages/admin/listings";
import AdminCommission from "@/pages/admin/commission";
import AdminPayments from "@/pages/admin/payments";
import AdminReports from "@/pages/admin/reports";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminSettings from "@/pages/admin/settings";
import AdminUsers from "@/pages/admin/users";
import AdminCategories from "@/pages/admin/categories";
import AdminRealEstateCategories from "@/pages/admin/real-estate-categories";
import AdminOrders from "@/pages/admin/orders";
import AdminLocations from "@/pages/admin/locations";
import ProviderDashboard from "@/pages/dashboard/index";
import ProviderSubscription from "@/pages/dashboard/subscription";
import ProviderCheckout from "@/pages/dashboard/checkout";
import CheckoutResult from "@/pages/dashboard/checkout-result";
import ProviderServices from "@/pages/dashboard/services";
import ProviderOrders from "@/pages/dashboard/orders";
import ProviderReviews from "@/pages/dashboard/reviews";
import ProviderPayments from "@/pages/dashboard/payments";
import ProviderSettings from "@/pages/dashboard/settings";
import ProviderNotifications from "@/pages/dashboard/notifications";
import UserDashboard from "@/pages/user/index";
import UserFavorites from "@/pages/user/favorites";
import UserRequests from "@/pages/user/requests";
import UserPayments from "@/pages/user/payments";
import UserReviews from "@/pages/user/reviews";
import UserSettings from "@/pages/user/settings";
import AdminStaff from "@/pages/admin/staff";
import AdminSupportTickets from "@/pages/admin/support-tickets";
import AdminProviderEdit from "@/pages/admin/provider-edit";
import AdminProperties from "@/pages/admin/properties";
import AdminPropertyEdit from "@/pages/admin/property-edit";
import AdminWatermark from "@/pages/admin/watermark";
import AdminSeo from "@/pages/admin/seo";
import AdminGoogleKit from "@/pages/admin/google-kit";
import AdminEmailTemplates from "@/pages/admin/email-templates";
import AdminMessages from "@/pages/admin/messages";
import AdminPlansCommissions from "@/pages/admin/plans-commissions";
import PropertyDetail from "@/pages/property-detail";
import ComparePage from "@/pages/compare";
import AdvertiserPage from "@/pages/advertiser";
import PropertiesPage from "@/pages/properties";
import ServicesPage from "@/pages/services";
import CategoriesPage from "@/pages/categories";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import FaqPage from "@/pages/faq";
import ProviderInbox from "@/pages/dashboard/inbox";
import ProviderSupport from "@/pages/dashboard/support";
import ProviderSupportTicketsPage from "@/pages/dashboard/support-tickets";
import UserInbox from "@/pages/user/inbox";
import UserSupport from "@/pages/user/support";
import AddPropertyPage from "@/pages/add-property";
import MyPropertiesPage from "@/pages/dashboard/my-properties";
import MapSearchPage from "@/pages/map-search";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

type AppRole = "admin" | "provider" | "user";

function roleHome(role: string): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "provider") return "/provider/dashboard";
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

  // Allow main admin OR any staff member with a staffRole
  if (user.role !== "admin" && !user.staffRole) {
    return <Redirect to={roleHome(user.role)} />;
  }

  return <Component />;
}

/** Redirects to "/" when the services module is disabled in site settings. */
function ServicesGate({ component: Component }: { component: ComponentType }) {
  const servicesEnabled = useServicesEnabled();
  if (!servicesEnabled) return <Redirect to="/" />;
  return <Component />;
}

// ── Router ─────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/home2" component={Home2} />
      <Route path="/search" component={SearchPage} />
      <Route path="/provider/register">
        {() => <ServicesGate component={ProviderRegisterPage} />}
      </Route>
      {/* Must be before `/provider/:id` — otherwise "dashboard" is parsed as a provider id */}
      <Route path="/provider/dashboard">
        {() => <RoleProtectedRoute component={ProviderDashboard} roles={["provider"]} />}
      </Route>
      <Route path="/provider/subscription">
        {() => <RoleProtectedRoute component={ProviderSubscription} roles={["provider"]} />}
      </Route>
      <Route path="/provider/:id">
        {() => <ServicesGate component={ProviderPage} />}
      </Route>
      <Route path="/add-property" component={AddPropertyPage} />
      <Route path="/map-search" component={MapSearchPage} />
      <Route path="/properties" component={PropertiesPage} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/advertiser/:id" component={AdvertiserPage} />
      <Route path="/services">
        {() => <ServicesGate component={ServicesPage} />}
      </Route>
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/faq" component={FaqPage} />

      <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
      <Route path="/provider" component={() => <Redirect to="/provider/dashboard" />} />
      <Route path="/user" component={() => <Redirect to="/user/dashboard" />} />

      {/* Auth routes */}
      <Route path="/login">{() => <AuthPage />}</Route>
      <Route path="/register" component={RegisterPage} />
      <Route path="/admin/login" component={AdminLogin} />

      {/* Onboarding — signed-in providers only */}
      <Route path="/onboarding">
        {() => <RoleProtectedRoute component={OnboardingPage} roles={["provider"]} />}
      </Route>
      <Route path="/real-estate-onboarding">
        {() => <RoleProtectedRoute component={RealEstateOnboardingPage} roles={["provider"]} />}
      </Route>

      {/* Provider dashboard (canonical paths) */}
      <Route path="/dashboard">
        {() => <RoleProtectedRoute component={ProviderDashboard} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/subscription">
        {() => <RoleProtectedRoute component={ProviderSubscription} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/checkout">
        {() => <RoleProtectedRoute component={ProviderCheckout} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/checkout/result">
        {() => <RoleProtectedRoute component={CheckoutResult} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/my-properties">
        {() => <RoleProtectedRoute component={MyPropertiesPage} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/services">
        {() => <RoleProtectedRoute component={ProviderServices} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/orders">
        {() => <RoleProtectedRoute component={ProviderOrders} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/reviews">
        {() => <RoleProtectedRoute component={ProviderReviews} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/payments">
        {() => <RoleProtectedRoute component={ProviderPayments} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/settings">
        {() => <RoleProtectedRoute component={ProviderSettings} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/notifications">
        {() => <RoleProtectedRoute component={ProviderNotifications} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/inbox">
        {() => <RoleProtectedRoute component={ProviderInbox} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/support">
        {() => <RoleProtectedRoute component={ProviderSupport} roles={["provider"]} />}
      </Route>
      <Route path="/dashboard/support-tickets">
        {() => <RoleProtectedRoute component={ProviderSupportTicketsPage} roles={["provider"]} />}
      </Route>

      {/* User area — regular accounts only */}
      <Route path="/user/dashboard">
        {() => <RoleProtectedRoute component={UserDashboard} roles={["user"]} />}
      </Route>
      <Route path="/user/favorites">
        {() => <RoleProtectedRoute component={UserFavorites} roles={["user"]} />}
      </Route>
      <Route path="/user/requests">
        {() => <RoleProtectedRoute component={UserRequests} roles={["user"]} />}
      </Route>
      <Route path="/user/reviews">
        {() => <RoleProtectedRoute component={UserReviews} roles={["user"]} />}
      </Route>
      <Route path="/user/settings">
        {() => <RoleProtectedRoute component={UserSettings} roles={["user"]} />}
      </Route>
      <Route path="/user/profile">
        {() => <RoleProtectedRoute component={UserSettings} roles={["user"]} />}
      </Route>
      <Route path="/user/payments">
        {() => <RoleProtectedRoute component={UserPayments} roles={["user"]} />}
      </Route>
      <Route path="/user/inbox">
        {() => <RoleProtectedRoute component={UserInbox} roles={["user"]} />}
      </Route>
      <Route path="/user/support">
        {() => <RoleProtectedRoute component={UserSupport} roles={["user"]} />}
      </Route>

      {/* Admin routes — accessible to main admin OR any staff member with staffRole */}
      <Route path="/admin/dashboard">
        {() => <AdminProtectedRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin/providers">
        {() => <AdminProtectedRoute component={AdminProviders} />}
      </Route>
      <Route path="/admin/providers/:id/edit">
        {() => <AdminProtectedRoute component={AdminProviderEdit} />}
      </Route>
      <Route path="/admin/listings">
        {() => <AdminProtectedRoute component={AdminListings} />}
      </Route>
      <Route path="/admin/properties">
        {() => <AdminProtectedRoute component={AdminProperties} />}
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
      <Route path="/admin/commission">
        {() => <AdminProtectedRoute component={AdminCommission} />}
      </Route>
      <Route path="/admin/payments">
        {() => <AdminProtectedRoute component={AdminPayments} />}
      </Route>
      <Route path="/admin/reports">
        {() => <AdminProtectedRoute component={AdminReports} />}
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
      <Route path="/admin/categories">
        {() => <AdminProtectedRoute component={AdminCategories} />}
      </Route>
      <Route path="/admin/orders">
        {() => <AdminProtectedRoute component={AdminOrders} />}
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
      <Route path="/admin/real-estate-categories">
        {() => <AdminProtectedRoute component={AdminRealEstateCategories} />}
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

      <Route component={NotFound} />
    </Switch>
  );
}

function FaviconUpdater() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 60_000,
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
    staleTime: 60_000,
  });
  const clientId = (settings as any)?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <SiteSettingsContext.Provider value={settings ?? null}>
      <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
    </SiteSettingsContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <GoogleWrapper>
            <TooltipProvider>
              <FaviconUpdater />
              <ThemeProvider />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <ScrollRestorer />
                <Router />
              </WouterRouter>
              <ScrollToTopButton />
              <AiChat />
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
