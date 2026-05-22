import { ReactNode } from "react";
import { Link, useLocation, Redirect } from "wouter";
import {
  LayoutDashboard, Crown, Bell, Star,
  CreditCard, Settings, LogOut, Menu,
  Briefcase, Home,
  HelpCircle, AlertTriangle, MessageCircle as MessageCircleIcon,
  Ticket, Building2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface ProviderLayoutProps {
  children: ReactNode;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ProviderLayout({ children }: ProviderLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, setUser, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  // Unread count for sidebar badge
  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: api.notifications.unreadCount,
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const unreadCount = typeof unreadData === "number" ? unreadData : 0;

  const dashboardNav = [
    { name: "لوحة التحكم",   href: "/provider/dashboard",        icon: LayoutDashboard,   badge: 0 },
    { name: "الاشتراك",      href: "/provider/subscription",     icon: Crown,             badge: 0 },
    { name: "عقاراتي",       href: "/dashboard/my-properties",   icon: Building2,         badge: 0 },
    { name: "الطلبات",       href: "/dashboard/orders",          icon: Bell,              badge: 0 },
    { name: "الإشعارات",     href: "/dashboard/notifications",   icon: Bell,              badge: unreadCount },
    { name: "الرسائل",       href: "/dashboard/inbox",           icon: MessageCircleIcon, badge: 0 },
    { name: "تذاكر الدعم",   href: "/dashboard/support-tickets", icon: Ticket,            badge: 0 },
    { name: "التقييمات",     href: "/dashboard/reviews",         icon: Star,              badge: 0 },
    { name: "المدفوعات",     href: "/dashboard/payments",        icon: CreditCard,        badge: 0 },
    { name: "الإعدادات",     href: "/dashboard/settings",        icon: Settings,          badge: 0 },
    { name: "المساعدة",      href: "/dashboard/support",         icon: HelpCircle,        badge: 0 },
  ];

  const handleLogout = async () => {
    try { await api.auth.logout(); } catch { }
    setUser(null);
    queryClient.clear();
    window.location.href = "/login";
  };

  if (!authLoading && user && user.role !== "provider") {
    if (user.role === "admin") return <Redirect to="/admin/dashboard" />;
    return <Redirect to="/" />;
  }

  const displayName = user?.name ?? "الشركة العقارية";
  const avatarSrc = user?.avatar
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-teal-900 text-white overflow-hidden">

      {/* Mobile header — hidden on desktop */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-white/10 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-teal-800 font-bold text-lg">✦</div>
          <span className="font-bold text-xl tracking-tight text-white">عقارتي</span>
        </Link>
      </div>

      {/* Provider profile card */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white/25 shadow-lg shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} className="w-full h-full object-contain bg-teal-800/20" />
            ) : (
              <div className="w-full h-full bg-teal-600 flex items-center justify-center text-white font-bold text-base">
                {getInitials(displayName)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15 text-teal-100 border border-white/20">
              <Briefcase className="w-2.5 h-2.5" /> شركة عقارية
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard navigation */}
      <div className="flex-1 min-h-0 overflow-y-auto py-4 px-3 hide-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-300/50">لوحة التحكم</p>
        <nav className="space-y-0.5">
          {dashboardNav.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  isActive
                    ? "bg-teal-500/20 text-teal-200"
                    : "text-teal-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className={`ml-3 shrink-0 h-4 w-4 ${isActive ? "text-teal-300" : "text-teal-300/60 group-hover:text-white"}`} />
                <span className="flex-1">{item.name}</span>
                {item.badge > 0 && (
                  <span className="shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-teal-950 text-[10px] font-bold flex items-center justify-center">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer: view marketplace + logout */}
      <div className="p-4 border-t border-white/10 space-y-1">
        <Link href="/">
          <span className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-teal-100/70 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <Home className="ml-3 shrink-0 h-4 w-4 text-teal-300/60 group-hover:text-white" />
            العودة للموقع
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl text-red-300/80 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="ml-3 shrink-0 h-4 w-4 text-red-400/60 group-hover:text-red-300" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">

      <Header />

      {/* ══════════════════════════════════════════
          BODY — Main Content + Right Sidebar
      ══════════════════════════════════════════ */}
      <div className="flex min-h-[calc(100vh-64px)]">

        {/* Fixed right sidebar — desktop only */}
        <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:top-16 lg:bottom-0 right-0 z-40">
          <SidebarContent />
        </div>

        {/* Page content */}
        <div className="flex flex-col flex-1 lg:pr-72 w-full">

          {/* Mobile sub-header: dashboard sidebar trigger + page label */}
          <div className="lg:hidden sticky top-16 z-30 flex h-12 items-center gap-3 border-b bg-background px-4 shadow-sm">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-72 border-l-0 bg-teal-900 border-none text-white h-full overflow-hidden">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold text-foreground">لوحة الشركة العقارية</span>
          </div>

          <main className="flex-1 pb-10">
            {user?.providerApproved === false && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3" dir="rtl">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 font-medium">
                  حسابك قيد المراجعة — سيتم تفعيله بعد موافقة فريق الإدارة. قد يستغرق ذلك حتى 24 ساعة.
                </p>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
