import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import Home from "@/pages/home";
import SearchPage from "@/pages/search";
import ProviderPage from "@/pages/provider";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import OnboardingPage from "@/pages/onboarding";
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
import AdminOrders from "@/pages/admin/orders";
import AdminLocations from "@/pages/admin/locations";
import ProviderDashboard from "@/pages/dashboard/index";
import ProviderSubscription from "@/pages/dashboard/subscription";
import ProviderServices from "@/pages/dashboard/services";
import ProviderOrders from "@/pages/dashboard/orders";
import ProviderReviews from "@/pages/dashboard/reviews";
import ProviderPayments from "@/pages/dashboard/payments";
import ProviderSettings from "@/pages/dashboard/settings";
import UserDashboard from "@/pages/user/index";
import UserFavorites from "@/pages/user/favorites";
import UserRequests from "@/pages/user/requests";
import UserReviews from "@/pages/user/reviews";
import UserSettings from "@/pages/user/settings";
import AdminStaff from "@/pages/admin/staff";
import AdminProviderEdit from "@/pages/admin/provider-edit";
import CategoriesPage from "@/pages/categories";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import FaqPage from "@/pages/faq";
import ProviderInbox from "@/pages/dashboard/inbox";
import ProviderSupport from "@/pages/dashboard/support";
import UserInbox from "@/pages/user/inbox";
import UserSupport from "@/pages/user/support";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// ── Protected Route Component (BYPASSED FOR DEMO) ─────────────────────────
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any>, roles?: string[], loginPath?: string, accessDeniedRedirect?: string }) {
  return <Component />;
}

// ── Public-only route (BYPASSED FOR DEMO) ─────────────────────────────────
function PublicOnlyRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return <Component />;
}

// ── Router ─────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/provider/register" component={ProviderRegisterPage} />
      <Route path="/provider/:id" component={ProviderPage} />
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/faq" component={FaqPage} />

      {/* Demo Direct Access Links */}
      <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
      <Route path="/provider" component={() => <Redirect to="/dashboard" />} />
      <Route path="/user" component={() => <Redirect to="/user/dashboard" />} />

      {/* Auth routes */}
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/admin/login" component={AdminLogin} />

      {/* Onboarding */}
      <Route path="/onboarding">
        {() => <ProtectedRoute component={OnboardingPage} />}
      </Route>

      {/* Provider dashboard routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={ProviderDashboard} />}
      </Route>
      <Route path="/dashboard/subscription">
        {() => <ProtectedRoute component={ProviderSubscription} />}
      </Route>
      <Route path="/dashboard/services">
        {() => <ProtectedRoute component={ProviderServices} />}
      </Route>
      <Route path="/dashboard/orders">
        {() => <ProtectedRoute component={ProviderOrders} />}
      </Route>
      <Route path="/dashboard/reviews">
        {() => <ProtectedRoute component={ProviderReviews} />}
      </Route>
      <Route path="/dashboard/payments">
        {() => <ProtectedRoute component={ProviderPayments} />}
      </Route>
      <Route path="/dashboard/settings">
        {() => <ProtectedRoute component={ProviderSettings} />}
      </Route>
      <Route path="/dashboard/inbox">
        {() => <ProtectedRoute component={ProviderInbox} />}
      </Route>
      <Route path="/dashboard/support">
        {() => <ProtectedRoute component={ProviderSupport} />}
      </Route>

      {/* User dashboard routes */}
      <Route path="/user/dashboard">
        {() => <ProtectedRoute component={UserDashboard} />}
      </Route>
      <Route path="/user/favorites">
        {() => <ProtectedRoute component={UserFavorites} />}
      </Route>
      <Route path="/user/requests">
        {() => <ProtectedRoute component={UserRequests} />}
      </Route>
      <Route path="/user/reviews">
        {() => <ProtectedRoute component={UserReviews} />}
      </Route>
      <Route path="/user/settings">
        {() => <ProtectedRoute component={UserSettings} />}
      </Route>
      <Route path="/user/inbox">
        {() => <ProtectedRoute component={UserInbox} />}
      </Route>
      <Route path="/user/support">
        {() => <ProtectedRoute component={UserSupport} />}
      </Route>

      {/* Admin routes */}
      <Route path="/admin/dashboard">
        {() => <ProtectedRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin/providers">
        {() => <ProtectedRoute component={AdminProviders} />}
      </Route>
      <Route path="/admin/providers/:id/edit">
        {() => <ProtectedRoute component={AdminProviderEdit} />}
      </Route>
      <Route path="/admin/listings">
        {() => <ProtectedRoute component={AdminListings} />}
      </Route>
      <Route path="/admin/commission">
        {() => <ProtectedRoute component={AdminCommission} />}
      </Route>
      <Route path="/admin/payments">
        {() => <ProtectedRoute component={AdminPayments} />}
      </Route>
      <Route path="/admin/reports">
        {() => <ProtectedRoute component={AdminReports} />}
      </Route>
      <Route path="/admin/subscriptions">
        {() => <ProtectedRoute component={AdminSubscriptions} />}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute component={AdminSettings} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} />}
      </Route>
      <Route path="/admin/categories">
        {() => <ProtectedRoute component={AdminCategories} />}
      </Route>
      <Route path="/admin/orders">
        {() => <ProtectedRoute component={AdminOrders} />}
      </Route>
      <Route path="/admin/locations">
        {() => <ProtectedRoute component={AdminLocations} />}
      </Route>
      <Route path="/admin/staff">
        {() => <ProtectedRoute component={AdminStaff} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
