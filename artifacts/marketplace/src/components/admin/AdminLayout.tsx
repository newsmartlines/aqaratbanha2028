import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, Tags, CreditCard, Package, BarChart3,
  Settings, Bell, Menu, LogOut, ChevronLeft, ChevronRight, ChevronDown,
  CheckCheck, Layers3, Mail, MessageSquare, UserCog, ShieldCheck, MapPin,
  Ticket, Languages, Building2, Stamp, Search, KeyRound, Bot, Star,
  Database, HardDrive, TrendingUp, Megaphone, Flag, FileUp, Zap,
  Globe, Wallet, LifeBuoy, Navigation,
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
  openTickets: number;
  pendingProperties: number;
};

function pendingForHref(href: string, c: SidebarCounts | undefined): number {
  if (!c) return 0;
  if (href === "/admin/providers") return c.pendingProviders;
  if (href === "/admin/users") return c.suspendedUsers;
  if (href === "/admin/support-tickets") return c.openTickets;
  if (href === "/admin/properties") return c.pendingProperties;
  return 0;
}

const layoutDict = {
  brand: { ar: "عقارات بنها - لوحة التحكم", en: "Aqarat Banha Admin" },
  brandShort: { ar: "المسؤول", en: "Admin" },
  superAdmin: { ar: "مسؤول عام", en: "Super Admin" },
  menu: { ar: "القائمة", en: "Menu" },
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  switchLang: { ar: "English", en: "العربية" },
};

const NOTIF_TYPE_STYLE: Record<string, string> = {
  info:    "bg-blue-100 text-blue-600",
  success: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  error:   "bg-red-100 text-red-600",
};

// ─── Menu groups definition ───────────────────────────────────────────────────

type MenuItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  perm: string | null;
};

type MenuGroup = {
  id: string;
  icon: React.ElementType;
  label: string;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    id: "users",
    icon: Users,
    label: "إدارة المستخدمين",
    items: [
      { icon: UserCog,     label: "المستخدمون",          href: "/admin/users",      perm: "users" },
      { icon: Building2,   label: "الشركات العقارية",    href: "/admin/providers",  perm: "providers" },
      { icon: ShieldCheck, label: "الموظفون والصلاحيات", href: "/admin/staff",      perm: "staff" },
    ],
  },
  {
    id: "properties",
    icon: Building2,
    label: "إدارة العقارات",
    items: [
      { icon: Building2, label: "العقارات",              href: "/admin/properties",              perm: null },
      { icon: Tags,      label: "التصنيفات العقارية",    href: "/admin/real-estate-categories",  perm: "categories" },
      { icon: Star,      label: "مميزات وخدمات العقار",  href: "/admin/property-features",       perm: null },
      { icon: Layers3,   label: "حقول أنواع العقار",     href: "/admin/property-type-configs",   perm: null },
      { icon: Stamp,     label: "الصورة المائية",        href: "/admin/watermark",               perm: null },
    ],
  },
  {
    id: "locations",
    icon: MapPin,
    label: "إدارة المناطق",
    items: [
      { icon: MapPin, label: "المحافظات والمدن والمناطق", href: "/admin/locations",      perm: "locations" },
      { icon: Globe,  label: "أهم المناطق",               href: "/admin/featured-areas", perm: null },
    ],
  },
  {
    id: "billing",
    icon: Package,
    label: "الاشتراكات والباقات",
    items: [
      { icon: Package,    label: "الاشتراكات",          href: "/admin/subscriptions",     perm: "subscriptions" },
      { icon: Layers3,    label: "الباقات",              href: "/admin/plans-commissions", perm: null },
      { icon: TrendingUp, label: "الترقيات والبوستات",  href: "/admin/promotions",        perm: null },
      { icon: CreditCard, label: "المدفوعات",           href: "/admin/payments",          perm: "payments" },
      { icon: Wallet,     label: "الكوبونات",           href: "/admin/plans-commissions", perm: null },
    ],
  },
  {
    id: "marketing",
    icon: Megaphone,
    label: "الإعلانات والتسويق",
    items: [
      { icon: Megaphone, label: "إدارة الإعلانات",      href: "/admin/ads",                    perm: null },
      { icon: Megaphone, label: "البوب آب والإعلانات",  href: "/admin/popups",                 perm: null },
      { icon: Star,      label: "عقار مميز",            href: "/admin/settings?tab=spotlight", perm: "settings" },
    ],
  },
  {
    id: "support",
    icon: LifeBuoy,
    label: "التواصل والدعم",
    items: [
      { icon: MessageSquare, label: "الرسائل والقوالب", href: "/admin/messages",        perm: "settings" },
      { icon: Ticket,        label: "تذاكر الدعم",      href: "/admin/support-tickets", perm: "support" },
      { icon: Mail,          label: "البريد الإلكتروني",href: "/admin/email-templates", perm: "settings" },
      { icon: Flag,          label: "البلاغات",         href: "/admin/complaints",      perm: null },
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    label: "التحليلات والتقارير",
    items: [
      { icon: BarChart3,   label: "التقارير",         href: "/admin/reports",    perm: "reports" },
      { icon: TrendingUp,  label: "تحليلات الذكاء",  href: "/admin/analytics",  perm: "reports" },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    label: "الإعدادات والأدوات",
    items: [
      { icon: Settings,    label: "إعدادات الموقع",    href: "/admin/settings",      perm: "settings" },
      { icon: Navigation,  label: "القائمة الرئيسية",  href: "/admin/menu",          perm: "settings" },
      { icon: Search,      label: "إدارة السيو",        href: "/admin/seo",           perm: null },
      { icon: KeyRound,  label: "Google Kit",         href: "/admin/google-kit",    perm: "settings" },
      { icon: Bot,       label: "المساعد الذكي",     href: "/admin/chatbot",       perm: "settings" },
      { icon: Database,  label: "المحتوى التجريبي",  href: "/admin/demo-content",  perm: null },
      { icon: HardDrive, label: "النسخ الاحتياطي",   href: "/admin/backup",        perm: null },
      { icon: FileUp,    label: "استيراد WordPress", href: "/admin/wp-import",     perm: null },
    ],
  },
];

// ─── Notification Bell ─────────────────────────────────────────────────────────

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
            <button className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1" onClick={() => markAllRead.mutate()}>
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

// ─── Messages Badge ────────────────────────────────────────────────────────────

function MessagesBadge() {
  const { data: count = 0 } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: api.messages.unreadCount,
    refetchInterval: 15_000,
  });
  const n = typeof count === "number" ? count : 0;
  return (
    <Link href="/admin/messages">
      <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title="الرسائل">
        <MessageSquare size={20} />
        {n > 0 && (
          <span className="absolute top-1 left-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border border-white">
            {n > 9 ? "9+" : n}
          </span>
        )}
      </button>
    </Link>
  );
}

// ─── Language Toggle ───────────────────────────────────────────────────────────

function LanguageToggle() {
  const { toggle } = useLanguage();
  const t = useT(layoutDict);
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
    >
      <Languages size={15} />
      <span className="hidden sm:inline">{t("switchLang")}</span>
    </button>
  );
}

// ─── Sidebar Group (Collapsible) ───────────────────────────────────────────────

function SidebarGroup({
  group,
  isOpen,
  onToggle,
  location,
  sidebarCounts,
  isSuper,
  perms,
  onNavigate,
}: {
  group: MenuGroup;
  isOpen: boolean;
  onToggle: () => void;
  location: string;
  sidebarCounts: SidebarCounts | undefined;
  isSuper: boolean;
  perms: Record<string, boolean>;
  onNavigate?: () => void;
}) {
  const visibleItems = group.items.filter(item => {
    if (!item.perm) return true;
    if (isSuper) return true;
    return perms[item.perm] === true;
  });

  if (visibleItems.length === 0) return null;

  const groupBadge = visibleItems.reduce((acc, item) => acc + pendingForHref(item.href, sidebarCounts), 0);
  const isGroupActive = visibleItems.some(item => {
    const base = item.href.split("?")[0];
    return location === item.href || location === base || location.startsWith(base + "/");
  });

  const GroupIcon = group.icon;

  return (
    <div className="mb-0.5">
      {/* Group header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 group ${
          isGroupActive && !isOpen
            ? "bg-teal-600/15 text-teal-300"
            : "text-white/80 hover:bg-white/5 hover:text-white"
        }`}
      >
        <GroupIcon
          size={15}
          className={`shrink-0 transition-colors ${
            isGroupActive && !isOpen ? "text-teal-400" : "text-slate-400 group-hover:text-white"
          }`}
        />
        <span className="flex-1 text-start truncate">{group.label}</span>
        {/* Badge on collapsed group */}
        {!isOpen && groupBadge > 0 && (
          <span className="shrink-0 min-w-[1.25rem] h-4 px-1 rounded-full bg-amber-500 text-slate-900 text-[9px] font-bold flex items-center justify-center">
            {groupBadge > 99 ? "99+" : groupBadge}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Group items — smooth expand */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? `${visibleItems.length * 38}px` : "0px", opacity: isOpen ? 1 : 0 }}
      >
        <div className="ms-3 mt-0.5 mb-1 border-s border-white/10 ps-3 space-y-0.5">
          {visibleItems.map(item => {
            const base = item.href.split("?")[0];
            const isActive = location === item.href || location === base || location.startsWith(base + "/");
            const badge = pendingForHref(item.href, sidebarCounts);
            const ItemIcon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  onClick={onNavigate}
                  className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all duration-150 ${
                    isActive
                      ? "bg-teal-600/20 text-teal-300"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <ItemIcon
                    size={13}
                    className={`shrink-0 ${isActive ? "text-teal-400" : "text-slate-500 group-hover:text-white"}`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 && (
                    <span className="shrink-0 min-w-[1.25rem] h-4 px-1 rounded-full bg-amber-500 text-slate-900 text-[9px] font-bold flex items-center justify-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Content ───────────────────────────────────────────────────────────

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

  const isSuper = !!(user?.isSuperAdmin || (user?.role === "admin" && !user?.staffRole));
  const perms = (user?.permissions ?? {}) as Record<string, boolean>;

  // Determine which group should be open by default (the one containing active route)
  function getActiveGroup(): string | null {
    for (const group of MENU_GROUPS) {
      const hasActive = group.items.some(item => {
        const base = item.href.split("?")[0];
        return location === item.href || location === base || location.startsWith(base + "/");
      });
      if (hasActive) return group.id;
    }
    return null;
  }

  const [openGroup, setOpenGroup] = useState<string | null>(getActiveGroup);
  const [searchQuery, setSearchQuery] = useState("");

  // Keep open group in sync with navigation
  useEffect(() => {
    const active = getActiveGroup();
    if (active) setOpenGroup(active);
  }, [location]);

  const handleGroupToggle = (id: string) => {
    setOpenGroup(prev => (prev === id ? null : id));
  };

  // Flat list of all visible items for search
  const allVisibleItems = MENU_GROUPS.flatMap(group =>
    group.items.filter(item => {
      if (!item.perm) return true;
      if (isSuper) return true;
      return perms[item.perm] === true;
    }).map(item => ({ ...item, groupLabel: group.label }))
  );

  const searchResults = searchQuery.trim()
    ? allVisibleItems.filter(item =>
        item.label.includes(searchQuery) || item.groupLabel.includes(searchQuery)
      )
    : [];

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col bg-slate-900 text-white min-h-full">
      {/* Mobile brand header */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-white/8 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-lg">✦</div>
          <span className="font-bold text-base text-white tracking-tight">{t("brand")}</span>
        </div>
      </div>

      {/* User profile strip */}
      <div className="px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/15 shrink-0 bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              : (user?.name?.[0]?.toUpperCase() ?? "A")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name ?? t("brandShort")}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t("superAdmin")}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="متصل" />
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search
            size={13}
            className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث في القائمة..."
            className="w-full bg-white/6 border border-white/10 rounded-lg py-1.5 ps-8 pe-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:bg-white/8 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 -translate-y-1/2 end-2.5 text-slate-500 hover:text-white transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Dashboard — standalone link */}
      <div className="px-3 pb-1">
        <Link href="/admin/dashboard">
          <span
            onClick={onNavigate}
            className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
              location === "/admin/dashboard" || location === "/admin"
                ? "bg-teal-600/20 text-teal-300"
                : "text-white/80 hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutDashboard
              size={15}
              className={`shrink-0 ${location === "/admin/dashboard" || location === "/admin" ? "text-teal-400" : "text-slate-400 group-hover:text-white"}`}
            />
            <span>{t("dashboard")}</span>
          </span>
        </Link>
      </div>

      {/* Divider */}
      <div className="px-4 pb-1">
        <div className="border-t border-white/8" />
      </div>

      {/* Scrollable groups OR search results */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0 scrollbar-none">
        {searchQuery.trim() ? (
          /* ── Search results flat list ── */
          searchResults.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              لا توجد نتائج لـ "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-0.5 pt-1">
              {searchResults.map(item => {
                const base = item.href.split("?")[0];
                const isActive = location === item.href || location === base || location.startsWith(base + "/");
                const badge = pendingForHref(item.href, sidebarCounts);
                const ItemIcon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      onClick={() => { setSearchQuery(""); onNavigate?.(); }}
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 ${
                        isActive
                          ? "bg-teal-600/20 text-teal-300"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <ItemIcon size={13} className={`shrink-0 ${isActive ? "text-teal-400" : "text-slate-400 group-hover:text-white"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{item.label}</div>
                        <div className="text-[10px] text-slate-600 truncate">{item.groupLabel}</div>
                      </div>
                      {badge > 0 && (
                        <span className="shrink-0 min-w-[1.25rem] h-4 px-1 rounded-full bg-amber-500 text-slate-900 text-[9px] font-bold flex items-center justify-center">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          /* ── Normal accordion groups ── */
          MENU_GROUPS.map(group => (
            <SidebarGroup
              key={group.id}
              group={group}
              isOpen={openGroup === group.id}
              onToggle={() => handleGroupToggle(group.id)}
              location={location}
              sidebarCounts={sidebarCounts}
              isSuper={isSuper}
              perms={perms}
              onNavigate={onNavigate}
            />
          ))
        )}
      </nav>

      {/* Footer actions */}
      <div className="p-3 border-t border-white/8 space-y-0.5">
        <Link href="/">
          <span
            onClick={onNavigate}
            className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <Chevron size={14} className="shrink-0 text-slate-500 group-hover:text-white" />
            {tc("backToSite")}
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={14} className="shrink-0 text-red-500/40 group-hover:text-red-400" />
          {tc("signOut")}
        </button>
      </div>
    </div>
  );
}

// ─── Admin Layout ──────────────────────────────────────────────────────────────

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const SIDEBAR_W = "w-60";
  const t = useT(layoutDict);
  const { dir, isRTL } = useLanguage();
  const sideClass = isRTL ? "right-0" : "left-0";
  const mainOffset = isRTL ? "lg:mr-60" : "lg:ml-60";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans" dir={dir}>
      {/* Top header */}
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-slate-600">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? "right" : "left"} className="p-0 w-60 bg-slate-900 border-none text-white">
              <SidebarContent onNavigate={() => {}} />
            </SheetContent>
          </Sheet>

          <Link href="/admin/dashboard">
            <span className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow">✦</div>
              <span className="font-bold text-slate-800 hidden sm:block text-sm">{t("brand")}</span>
            </span>
          </Link>

          <span className="hidden sm:block text-slate-200 mx-1 text-lg font-thin">|</span>
          <h1 className="text-sm font-medium text-slate-500 hidden sm:block">{title ?? t("dashboard")}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <MessagesBadge />
          <NotificationBell />
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">A</div>
            <span className="text-xs font-medium text-slate-600">{t("brandShort")}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <main className={`flex-1 min-w-0 overflow-auto p-4 lg:p-8 ${mainOffset}`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Desktop sidebar */}
        <aside className={`hidden lg:block fixed top-14 ${sideClass} bottom-0 ${SIDEBAR_W} z-40 overflow-y-auto`}>
          <SidebarContent />
        </aside>
      </div>
    </div>
  );
}
