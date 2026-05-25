import { ReactNode, useEffect } from "react";
import { Link, useLocation, Redirect } from "wouter";
import {
  LayoutDashboard, Bell, CreditCard, Settings, LogOut, Menu,
  Home, HelpCircle, MessageCircle as MessageCircleIcon,
  Ticket, Building2, Package, Heart, BellRing, Plus, User2,
  Briefcase, AlertTriangle, ChevronRight,
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

function unifiedNav(unreadCount: number, msgUnread: number) {
  return [
    { name: "لوحة التحكم الرئيسية", href: "/dashboard",                icon: LayoutDashboard,   badge: 0 },
    { name: "باقاتي",               href: "/dashboard/packages",       icon: Package,           badge: 0 },
    { name: "عقاراتي",              href: "/dashboard/properties",     icon: Building2,         badge: 0 },
    { name: "المفضلة",              href: "/dashboard/favorites",      icon: Heart,             badge: 0 },
    { name: "تنبيهات البحث",        href: "/dashboard/saved-searches", icon: BellRing,          badge: 0 },
    { name: "المدفوعات",            href: "/dashboard/payments",       icon: CreditCard,        badge: 0 },
    { name: "رسائلي",               href: "/dashboard/messages",       icon: MessageCircleIcon, badge: msgUnread },
    { name: "الإشعارات",            href: "/dashboard/notifications",  icon: Bell,              badge: unreadCount },
    { name: "تذاكر الدعم",          href: "/dashboard/support",        icon: Ticket,            badge: 0 },
    { name: "الإعدادات",            href: "/dashboard/settings",       icon: Settings,          badge: 0 },
    { name: "المساعدة",             href: "/dashboard/help",           icon: HelpCircle,        badge: 0 },
  ];
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, setUser, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const name = localStorage.getItem("newUserWelcome");
    if (!name) return;
    localStorage.removeItem("newUserWelcome");
    const isProvider = user.role === "provider";
    setTimeout(() => {
      toast({
        title: `أهلاً وسهلاً، ${name}!`,
        description: isProvider
          ? "تم تسجيل شركتك بنجاح. ابدأ بإضافة عقاراتك الآن."
          : "تم إنشاء حسابك بنجاح. يمكنك الآن البحث عن العقارات وإدارة مفضلتك.",
        duration: 5000,
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

  const { data: msgUnreadData = 0 } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: api.messages.unreadCount,
    enabled: !!user,
    refetchInterval: 15_000,
  });
  const msgUnread = typeof msgUnreadData === "number" ? msgUnreadData : 0;

  if (!authLoading && user?.role === "admin") return <Redirect to="/admin/dashboard" />;
  if (!authLoading && !user) return <Redirect to="/login" />;

  const isProvider = user?.role === "provider";
  const navItems = unifiedNav(unreadCount, msgUnread);
  const displayName = user?.name ?? (isProvider ? "الشركة العقارية" : "المستخدم");

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white overflow-hidden border-l border-gray-100">

      {/* Mobile logo */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-gray-100 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">ع</span>
          </div>
          <span className="font-bold text-base text-gray-900">عقارات بنها</span>
        </Link>
      </div>

      {/* Profile */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-gray-600">{getInitials(displayName)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{displayName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isProvider ? "شركة عقارية" : "مستخدم"}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Link href={isProvider ? "/add-property" : "/add-property"}>
          <div className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-gray-900 text-gray-900 text-sm font-semibold cursor-pointer hover:bg-gray-900 hover:text-white transition-colors duration-150">
            <Plus className="w-3.5 h-3.5" />
            أضف عقارك
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-3 space-y-0.5 hide-scrollbar">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && item.href !== "/dashboard" && location.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-100 ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium"
              }`}
            >
              <item.icon
                className={`shrink-0 h-4 w-4 ${isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-700"}`}
              />
              <span className="flex-1">{item.name}</span>
              {item.badge > 0 && (
                <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            </Link>
          );
        })}

        <div className="my-2 border-t border-gray-100" />

        <Link
          href="/"
          className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-100"
        >
          <Home className="shrink-0 h-4 w-4 text-gray-400 group-hover:text-gray-700" />
          العودة للموقع
        </Link>

        <button
          onClick={async () => {
            try { await api.auth.logout(); } catch { }
            setUser(null);
            queryClient.clear();
            window.location.href = "/login";
          }}
          className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-100"
        >
          <LogOut className="shrink-0 h-4 w-4 text-gray-400 group-hover:text-red-500" />
          تسجيل الخروج
        </button>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      <Header />
      <div className="flex min-h-[calc(100vh-64px)]">

        {/* Sidebar — desktop */}
        <aside
          className="hidden lg:flex lg:flex-col lg:w-64 shrink-0 sticky top-16"
          style={{ height: "calc(100vh - 4rem)" }}
        >
          <SidebarContent />
        </aside>

        {/* Content */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Mobile header */}
          <div className="lg:hidden sticky top-16 z-30 flex h-12 items-center gap-3 border-b bg-white px-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-64 border-none bg-white h-full overflow-hidden">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold text-gray-800">
              {isProvider ? "لوحة تحكم الشركة" : "لوحة التحكم"}
            </span>
          </div>

          <main className="flex-1 pb-12">
            {isProvider && user?.providerApproved === false && (
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-3" dir="rtl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  حسابك قيد المراجعة — سيتم تفعيله بعد موافقة فريق الإدارة خلال 24 ساعة.
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
