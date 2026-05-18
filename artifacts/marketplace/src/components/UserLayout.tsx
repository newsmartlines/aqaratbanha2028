import { ReactNode } from "react";
import { Link, useLocation, Redirect } from "wouter";
import {
  LayoutDashboard,
  Heart,
  Bell,
  Star,
  Settings,
  LogOut,
  Menu,
  Home,
  Grid3X3,
  Info,
  Phone,
  HelpCircle,
  X,
  CreditCard,
  MessageCircle as MessageCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60 * 1000,
  });

  const siteName = (settings as any)?.siteName ?? "عقارات بنها";

  const siteNavLinks = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/categories", label: "التصنيفات", icon: Grid3X3 },
    { href: "/about", label: "من نحن", icon: Info },
    { href: "/contact", label: "تواصل معنا", icon: Phone },
    { href: "/faq", label: "الأسئلة الشائعة", icon: HelpCircle },
  ];

  const dashboardNavigation = [
    { name: "الرئيسية", href: "/user/dashboard", icon: LayoutDashboard },
    { name: "المفضلة", href: "/user/favorites", icon: Heart },
    { name: "طلباتي", href: "/user/requests", icon: Bell },
    { name: "مدفوعاتي", href: "/user/payments", icon: CreditCard },
    { name: "رسائلي", href: "/user/inbox", icon: MessageCircleIcon },
    { name: "تقييماتي", href: "/user/reviews", icon: Star },
    { name: "الإعدادات", href: "/user/settings", icon: Settings },
    { name: "المساعدة", href: "/user/support", icon: HelpCircle },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (!authLoading && user && user.role !== "user") {
    if (user.role === "admin") return <Redirect to="/admin/dashboard" />;
    if (user.role === "provider") return <Redirect to="/provider/dashboard" />;
  }

  const avatarSrc = user?.avatar
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name ?? "user")}`;

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-indigo-900 text-white">
      {/* Sidebar header — hidden on desktop since banner shows logo */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-white/10 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-indigo-900 font-bold text-lg">✦</div>
          <span className="font-bold text-xl tracking-tight text-white">عقارتي</span>
        </Link>
      </div>

      {/* User profile card */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shrink-0">
            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name ?? "المستخدم"}</p>
            <p className="text-xs text-indigo-200/70">عميل</p>
          </div>
        </div>
      </div>

      {/* Dashboard nav links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 hide-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-indigo-300/50">القائمة</p>
        <nav className="space-y-1">
          {dashboardNavigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-200"
                    : "text-indigo-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className={`ml-3 shrink-0 h-5 w-5 ${isActive ? "text-indigo-300" : "text-indigo-300/70 group-hover:text-white"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl text-red-300 hover:bg-red-500/10 hover:text-red-400 transition-colors text-right"
        >
          <LogOut className="ml-3 shrink-0 h-5 w-5 text-red-400/70 group-hover:text-red-400" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">

      {/* ══════════════════════════════════════════════
          TOP BANNER — Logo + Main Site Navigation
      ══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-indigo-900 flex items-center justify-center text-white font-bold text-lg shadow group-hover:bg-indigo-800 transition-colors">
              د
            </div>
            <span className="font-extrabold text-xl text-indigo-900 tracking-tight hidden sm:block">
              {siteName}
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {siteNavLinks.map((link) => {
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right side: user + mobile trigger */}
          <div className="flex items-center gap-2">
            {/* User avatar + name (desktop) */}
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-1.5 border border-indigo-100">
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-medium text-indigo-900 max-w-[120px] truncate">{user?.name}</span>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(o => !o)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile sidebar trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs px-2.5 gap-1">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  لوحتي
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-72 border-l-0 bg-indigo-900 border-none text-white">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 py-2 px-4 shadow-md animate-in slide-in-from-top-1 duration-150">
            <nav className="flex flex-col gap-1">
              {siteNavLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <span
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                        isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <link.icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════
          BODY — Right Sidebar + Content
      ══════════════════════════════════════════════ */}
      <div className="flex min-h-[calc(100vh-56px)]">

        {/* Fixed sidebar — desktop only */}
        <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:top-14 lg:bottom-0 right-0 z-40">
          <SidebarContent />
        </div>

        {/* Page content */}
        <div className="flex flex-col flex-1 lg:pr-72 w-full">
          {/* Sub-header: mobile sidebar + page title */}
          <div className="lg:hidden sticky top-14 z-30 flex h-12 items-center gap-3 border-b bg-background px-4 shadow-sm">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-72 border-l-0 bg-indigo-900 border-none text-white">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold text-foreground">لوحة المستخدم</span>
          </div>

          <main className="flex-1 pb-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
