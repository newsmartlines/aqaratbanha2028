import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  List,
  Tags,
  ShoppingCart,
  CreditCard,
  Percent,
  Package,
  BarChart3,
  Settings,
  Bell,
  Menu,
  LogOut,
  ChevronRight,
  ChevronLeft,
  CheckCheck,
  Layers3,
  Mail,
  MessageSquare,
  UserCog,
  ShieldCheck,
  MapPin,
  Ticket,
  Languages,
  Building2,
  Stamp,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api, type Notification } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, useT, commonDict } from "@/lib/i18n";

type SidebarCounts = {
  pendingProviders: number;
  suspendedUsers: number;
  pendingOrders: number;
  openTickets: number;
};

function pendingForHref(href: string, c: SidebarCounts | undefined): number {
  if (!c) return 0;
  if (href === "/admin/providers") return c.pendingProviders;
  if (href === "/admin/users") return c.suspendedUsers;
  if (href === "/admin/orders") return c.pendingOrders;
  if (href === "/admin/support-tickets") return c.openTickets;
  return 0;
}

const layoutDict = {
  brand: { ar: "سمارت لاينز للنظم المتطورة - المسؤول", en: "Dalil Admin" },
  brandShort: { ar: "المسؤول", en: "Admin" },
  superAdmin: { ar: "مسؤول عام", en: "Super Admin" },
  menu: { ar: "القائمة", en: "Menu" },
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  providers: { ar: "مقدمو الخدمة", en: "Providers" },
  users: { ar: "المستخدمون", en: "Users" },
  staff: { ar: "الموظفون والصلاحيات", en: "Staff & Roles" },
  listings: { ar: "الخدمات", en: "Listings" },
  categories: { ar: "التصنيفات", en: "Categories" },
  locations: { ar: "المحافظات والمدن والمناطق", en: "Locations" },
  orders: { ar: "الطلبات", en: "Orders" },
  supportTickets: { ar: "تذاكر الدعم", en: "Support Tickets" },
  payments: { ar: "المدفوعات", en: "Payments" },
  commission: { ar: "العمولات", en: "Commission" },
  subscriptions: { ar: "الاشتراكات", en: "Subscriptions" },
  reports: { ar: "التقارير", en: "Reports" },
  settings: { ar: "الإعدادات", en: "Settings" },
  switchLang: { ar: "English", en: "العربية" },
};

const NOTIF_TYPE_STYLE: Record<string, string> = {
  info:    "bg-blue-100 text-blue-600",
  success: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  error:   "bg-red-100 text-red-600",
};

function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const tc = useT(commonDict);
  const { lang, formatDateTime } = useLanguage();

  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: api.admin.notifications.list,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.admin.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.admin.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className={`absolute top-1 ${lang === "ar" ? "left-1" : "right-1"} w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border border-white`}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-xl border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-slate-800">{tc("notifications")}</h3>
          {unreadCount > 0 && (
            <button
              className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-3 h-3" /> {tc("markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">{tc("noNotifications")}</div>
          ) : (
            notifications.map((n: Notification) => (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? "bg-blue-50/50" : ""}`}
                onClick={() => !n.read && markRead.mutate(n.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${NOTIF_TYPE_STYLE[n.type] ?? NOTIF_TYPE_STYLE.info}`}>
                  {n.type === "success" ? "✓" : n.type === "warning" ? "!" : n.type === "error" ? "✗" : "i"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${!n.read ? "text-slate-800" : "text-slate-600"}`}>{n.title}</p>
                  {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const t = useT(layoutDict);
  const tc = useT(commonDict);
  const { isRTL } = useLanguage();

  const { data: sidebarCounts } = useQuery({
    queryKey: ["admin-sidebar-counts"],
    queryFn: api.admin.sidebarCounts,
    refetchInterval: 45_000,
  });

  const allMenuItems = [
    { icon: LayoutDashboard, label: t("dashboard"),       href: "/admin/dashboard",        perm: null },
    { icon: Users,           label: t("providers"),       href: "/admin/providers",        perm: "providers" },
    { icon: UserCog,         label: t("users"),           href: "/admin/users",            perm: "users" },
    { icon: ShieldCheck,     label: t("staff"),           href: "/admin/staff",            perm: "staff" },
    { icon: List,            label: t("listings"),        href: "/admin/listings",         perm: "listings" },
    { icon: Building2,       label: "العقارات",           href: "/admin/properties",        perm: null },
    { icon: Stamp,           label: "الصورة المائية",    href: "/admin/watermark",         perm: null },
    { icon: Search,          label: "إدارة السيو",       href: "/admin/seo",               perm: null },
    { icon: Tags,            label: t("categories"),      href: "/admin/categories",       perm: "categories" },
    { icon: Building2,       label: "التصنيفات العقارية", href: "/admin/real-estate-categories", perm: "categories" },
    { icon: MapPin,          label: t("locations"),       href: "/admin/locations",        perm: "locations" },
    { icon: ShoppingCart,    label: t("orders"),          href: "/admin/orders",           perm: "orders" },
    { icon: Ticket,          label: t("supportTickets"),  href: "/admin/support-tickets",  perm: "support" },
    { icon: CreditCard,      label: t("payments"),        href: "/admin/payments",         perm: "payments" },
    { icon: Percent,         label: t("commission"),      href: "/admin/commission",       perm: "commission" },
    { icon: Package,         label: t("subscriptions"),   href: "/admin/subscriptions",    perm: "subscriptions" },
    { icon: BarChart3,       label: t("reports"),         href: "/admin/reports",          perm: "reports" },
    { icon: MessageSquare,   label: "الرسائل والقوالب",   href: "/admin/messages",         perm: "settings" },
    { icon: Mail,            label: "البريد الإلكتروني", href: "/admin/email-templates",  perm: "settings" },
    { icon: Layers3,         label: "الباقات والعمولات", href: "/admin/plans-commissions", perm: "commission" },
    { icon: Settings,        label: t("settings"),        href: "/admin/settings",         perm: "settings" },
  ];

  const isSuper = user?.isSuperAdmin || user?.role === "admin" && !user?.staffRole;
  const perms = user?.permissions ?? {};
  const menuItems = allMenuItems.filter(item => {
    if (!item.perm) return true;        // dashboard always visible
    if (isSuper) return true;           // super-admin sees all
    return perms[item.perm] === true;
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-white/10 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-lg">✦</div>
          <span className="font-bold text-lg text-white tracking-tight">{t("brand")}</span>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shrink-0 bg-teal-600 flex items-center justify-center text-white font-bold text-lg">
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              : (user?.name?.[0]?.toUpperCase() ?? "A")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name ?? t("brandShort")}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t("superAdmin")}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 hide-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{t("menu")}</p>
        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const n = pendingForHref(item.href, sidebarCounts);
            return (
              <Link key={item.href} href={item.href}>
                <span
                  onClick={onNavigate}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                    isActive
                      ? "bg-teal-600/20 text-teal-300"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon
                    size={17}
                    className={`shrink-0 ${isActive ? "text-teal-400" : "text-slate-500 group-hover:text-white"}`}
                  />
                  <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  {n > 0 && (
                    <span className="shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                      {n > 99 ? "99+" : n}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10 space-y-1">
        <Link href="/">
          <span
            onClick={onNavigate}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <Chevron size={17} className="shrink-0 text-slate-500 group-hover:text-white" />
            {tc("backToSite")}
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={17} className="shrink-0 text-red-500/60 group-hover:text-red-400" />
          {tc("signOut")}
        </button>
      </div>
    </div>
  );
}

function LanguageToggle() {
  const { toggle } = useLanguage();
  const t = useT(layoutDict);
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
      title={t("switchLang")}
    >
      <Languages size={15} />
      <span className="hidden sm:inline">{t("switchLang")}</span>
    </button>
  );
}

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const SIDEBAR_W = "w-64";
  const t = useT(layoutDict);
  const { dir, isRTL } = useLanguage();
  const sideClass = isRTL ? "right-0" : "left-0";
  const mainOffset = isRTL ? "lg:mr-64" : "lg:ml-64";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans" dir={dir}>
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-slate-600">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? "right" : "left"} className="p-0 w-64 bg-slate-900 border-none text-white">
              <SidebarContent onNavigate={() => {}} />
            </SheetContent>
          </Sheet>

          <Link href="/admin/dashboard">
            <span className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow">✦</div>
              <span className="font-bold text-slate-800 hidden sm:block">{t("brand")}</span>
            </span>
          </Link>

          <span className="hidden sm:block text-slate-300 mx-1">|</span>
          <h1 className="text-sm font-semibold text-slate-600 hidden sm:block">{title ?? t("dashboard")}</h1>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <NotificationBell />
          <div className="h-7 w-px bg-slate-200 mx-1 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">A</div>
            <span className="text-xs font-medium text-slate-700">{t("brandShort")}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <main className={`flex-1 min-w-0 overflow-auto p-4 lg:p-8 ${mainOffset}`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <aside className={`hidden lg:flex flex-col fixed top-14 ${sideClass} bottom-0 ${SIDEBAR_W} z-40`}>
          <SidebarContent />
        </aside>
      </div>
    </div>
  );
}
