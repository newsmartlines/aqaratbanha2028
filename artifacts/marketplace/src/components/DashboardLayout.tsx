/**
 * DashboardLayout — Unified dashboard shell for both "user" and "provider" roles.
 * Replaces the separate UserLayout and ProviderLayout with a single source of truth.
 *
 * • Same sidebar, same component tree, same visual language
 * • Nav items, role badge, and CTA adapt automatically based on user.role
 * • role badge shown directly under the avatar name:
 *     مستخدم عادي  (role === "user")
 *     شركة عقارية  (role === "provider")
 */

import { ReactNode, useEffect } from "react";
import { Link, useLocation, Redirect } from "wouter";
import {
  LayoutDashboard, Bell, CreditCard, Settings, LogOut, Menu,
  Home, MessageCircle as MessageCircleIcon,
  Ticket, Building2, Package, Heart, BellRing, Plus, User2,
  Briefcase, AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface DashboardLayoutProps {
  children: ReactNode;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Nav definitions ────────────────────────────────────────────────────────────

function unifiedNav(unreadCount: number, msgUnread: number) {
  return [
    { name: "لوحة التحكم الرئيسية", href: "/dashboard",                 icon: LayoutDashboard,   badge: 0 },
    { name: "باقاتي",               href: "/dashboard/packages",        icon: Package,           badge: 0 },
    { name: "عقاراتي",              href: "/dashboard/properties",      icon: Building2,         badge: 0 },
    { name: "المفضلة",              href: "/dashboard/favorites",       icon: Heart,             badge: 0 },
    { name: "تنبيهات البحث",        href: "/dashboard/saved-searches",  icon: BellRing,          badge: 0 },
    { name: "المدفوعات",            href: "/dashboard/payments",        icon: CreditCard,        badge: 0 },
    { name: "رسائلي",               href: "/dashboard/messages",        icon: MessageCircleIcon, badge: msgUnread },
    { name: "الإشعارات",            href: "/dashboard/notifications",   icon: Bell,              badge: unreadCount },
    { name: "تذاكر الدعم",          href: "/dashboard/support",         icon: Ticket,            badge: 0 },
    { name: "الإعدادات",            href: "/dashboard/settings",        icon: Settings,          badge: 0 },
  ];
}

// ── Role badge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: "user" | "provider" | "admin" }) {
  if (role === "provider") {
    return (
      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 tracking-wide">
        <Briefcase className="w-2.5 h-2.5" />
        شركة عقارية
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30 tracking-wide">
      <User2 className="w-2.5 h-2.5" />
      مستخدم عادي
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, setUser, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Welcome toast on first login
  useEffect(() => {
    if (!user) return;
    const name = localStorage.getItem("newUserWelcome");
    if (!name) return;
    localStorage.removeItem("newUserWelcome");
    const isProvider = user.role === "provider";
    setTimeout(() => {
      toast({
        title: `أهلاً وسهلاً، ${name}! 🎉`,
        description: isProvider
          ? "تم تسجيل شركتك بنجاح. ابدأ بإضافة عقاراتك الآن."
          : "تم إنشاء حسابك بنجاح. يمكنك الآن البحث عن العقارات وإدارة مفضلتك.",
        duration: 6000,
      });
    }, 500);
  }, [user]);

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: api.notifications.unreadCount,
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const unreadCount = typeof unreadData === "number" ? unreadData : 0;

  // Unread messages
  const { data: msgUnreadData = 0 } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: api.messages.unreadCount,
    enabled: !!user,
    refetchInterval: 15_000,
  });
  const msgUnread = typeof msgUnreadData === "number" ? msgUnreadData : 0;

  // Redirect admins away
  if (!authLoading && user?.role === "admin") {
    return <Redirect to="/admin/dashboard" />;
  }
  // Redirect unauthenticated → login
  if (!authLoading && !user) {
    return <Redirect to="/login" />;
  }

  const isProvider = user?.role === "provider";
  const navItems = unifiedNav(unreadCount, msgUnread);
  const displayName = user?.name ?? (isProvider ? "الشركة العقارية" : "المستخدم");

  // ── Sidebar ──────────────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#0a1628] text-white overflow-hidden">

      {/* Mobile logo strip */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-white/10 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#0a1628] font-bold text-lg">✦</div>
          <span className="font-bold text-xl tracking-tight text-white">عقاراتي</span>
        </Link>
      </div>

      {/* ── Profile card ── */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`shrink-0 overflow-hidden border-2 border-white/20 shadow-md ${isProvider ? "w-11 h-11 rounded-xl" : "w-10 h-10 rounded-full"}`}>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="w-full h-full object-cover bg-white/10"
              />
            ) : (
              <div className="w-full h-full bg-[#1e3a5c] flex items-center justify-center text-white font-bold text-base">
                {getInitials(displayName)}
              </div>
            )}
          </div>

          {/* Name + role badge */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
            <RoleBadge role={(user?.role ?? "user") as "user" | "provider" | "admin"} />
          </div>
        </div>

        {/* "Add property" CTA — shown for both roles */}
        <Link
          href={isProvider ? "/dashboard/properties" : "/add-property"}
          className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors bg-teal-600 hover:bg-teal-500 text-white"
        >
          <Plus className="w-3.5 h-3.5" />
          {isProvider ? "إضافة عقار جديد" : "أضف عقارك"}
        </Link>
      </div>

      {/* ── Nav links ── */}
      <div className="flex-1 min-h-0 overflow-y-auto py-4 px-3 hide-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-blue-300/40">
          {isProvider ? "لوحة التحكم" : "القائمة"}
        </p>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && item.href !== "/dashboard" && location.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon
                  className={`ml-3 shrink-0 h-4 w-4 transition-colors ${
                    isActive ? "text-teal-300" : "text-blue-300/50 group-hover:text-teal-300"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {item.badge > 0 && (
                  <span className="shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-[#0a1628] text-[10px] font-bold flex items-center justify-center">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-3 border-t border-white/10" />

          {/* Back to site */}
          <Link
            href="/"
            className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-blue-100/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Home className="ml-3 shrink-0 h-4 w-4 text-blue-300/50 group-hover:text-white" />
            العودة للموقع
          </Link>

          {/* Logout */}
          <button
            onClick={async () => {
              try { await api.auth.logout(); } catch { }
              setUser(null);
              queryClient.clear();
              window.location.href = "/login";
            }}
            className="group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl text-red-300/80 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="ml-3 shrink-0 h-4 w-4 text-red-400/50 group-hover:text-red-300" />
            تسجيل الخروج
          </button>
        </nav>
      </div>
    </div>
  );

  // ── Shell ────────────────────────────────────────────────────────────────────

  const mobileTitle = isProvider ? "لوحة الشركة العقارية" : "لوحة المستخدم";

  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">
      <Header />

      <div className="flex min-h-[calc(100vh-64px)]">

        {/* Sticky sidebar — desktop only */}
        <aside
          className="hidden lg:flex lg:flex-col lg:w-72 shrink-0 sticky top-16"
          style={{ height: "calc(100vh - 4rem)" }}
        >
          <SidebarContent />
        </aside>

        {/* Page content */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Mobile sub-header */}
          <div className="lg:hidden sticky top-16 z-30 flex h-12 items-center gap-3 border-b bg-background px-4 shadow-sm">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="p-0 w-72 border-l-0 bg-[#0a1628] border-none text-white h-full overflow-hidden"
              >
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold text-foreground">{mobileTitle}</span>
          </div>

          <main className="flex-1 pb-10">
            {/* Provider pending-approval banner */}
            {isProvider && user?.providerApproved === false && (
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
