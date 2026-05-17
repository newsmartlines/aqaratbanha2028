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
  X,
  LogOut,
  ChevronRight,
  CheckCheck,
  UserCog,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api, type Notification } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard",      href: "/admin/dashboard" },
  { icon: Users,           label: "Providers",       href: "/admin/providers" },
  { icon: UserCog,         label: "Users",           href: "/admin/users" },
  { icon: ShieldCheck,     label: "Staff & Roles",   href: "/admin/staff" },
  { icon: List,            label: "Listings",        href: "/admin/listings" },
  { icon: Tags,            label: "Categories",      href: "/admin/categories" },
  { icon: MapPin,          label: "Locations",       href: "/admin/locations" },
  { icon: ShoppingCart,    label: "Orders",          href: "/admin/orders" },
  { icon: CreditCard,      label: "Payments",        href: "/admin/payments" },
  { icon: Percent,         label: "Commission",      href: "/admin/commission" },
  { icon: Package,         label: "Subscriptions",   href: "/admin/subscriptions" },
  { icon: BarChart3,       label: "Reports",         href: "/admin/reports" },
  { icon: Settings,        label: "Settings",        href: "/admin/settings" },
];

const NOTIF_TYPE_STYLE: Record<string, string> = {
  info:    "bg-blue-100 text-blue-600",
  success: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  error:   "bg-red-100 text-red-600",
};

function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border border-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-xl border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-slate-800">Notifications</h3>
          {unreadCount > 0 && (
            <button
              className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">No notifications</div>
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
                  <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
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

  const avatarSrc = user?.avatar
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name ?? "admin")}`;

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">

      {/* Brand — only on mobile (header already has logo on desktop) */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-white/10 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-lg">D</div>
          <span className="font-bold text-lg text-white tracking-tight">Dalel Admin</span>
        </div>
      </div>

      {/* Admin profile card */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shrink-0 bg-teal-600 flex items-center justify-center text-white font-bold text-lg">
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              : (user?.name?.[0]?.toUpperCase() ?? "A")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name ?? "Admin"}</p>
            <p className="text-xs text-slate-400 mt-0.5">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 hide-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Menu</p>
        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
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
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-1">
        <Link href="/">
          <span
            onClick={onNavigate}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight size={17} className="shrink-0 text-slate-500 group-hover:text-white" />
            Back to Dalel
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={17} className="shrink-0 text-red-500/60 group-hover:text-red-400" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children, title = "Dashboard" }: { children: React.ReactNode; title?: string }) {
  const SIDEBAR_W = "w-64";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans" dir="ltr">

      {/* ── Top Header ──────────────────────────────── */}
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 lg:px-6">

        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-3">
          {/* Mobile sidebar trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-slate-600">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-64 bg-slate-900 border-none text-white">
              <SidebarContent onNavigate={() => {}} />
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/admin/dashboard">
            <span className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow">D</div>
              <span className="font-bold text-slate-800 hidden sm:block">Dalel Admin</span>
            </span>
          </Link>

          {/* Separator + page title */}
          <span className="hidden sm:block text-slate-300 mx-1">|</span>
          <h1 className="text-sm font-semibold text-slate-600 hidden sm:block">{title}</h1>
        </div>

        {/* Right: notifications + admin avatar pill */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="h-7 w-px bg-slate-200 mx-1 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">A</div>
            <span className="text-xs font-medium text-slate-700">Admin</span>
          </div>
        </div>
      </header>

      {/* ── Body: content + right sidebar ───────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Main content — offset left for sidebar on desktop */}
        <main className={`flex-1 min-w-0 overflow-auto p-4 lg:p-8 lg:ml-64`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Left sidebar — desktop only (fixed) */}
        <aside className={`hidden lg:flex flex-col fixed top-14 left-0 bottom-0 ${SIDEBAR_W} z-40`}>
          <SidebarContent />
        </aside>
      </div>
    </div>
  );
}
