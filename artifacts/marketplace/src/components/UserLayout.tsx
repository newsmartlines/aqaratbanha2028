import { ReactNode } from "react";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Link, useLocation, Redirect } from "wouter";
import {
  LayoutDashboard,
  Heart,
  Settings,
  LogOut,
  Menu,
  HelpCircle,
  CreditCard,
  MessageCircle as MessageCircleIcon,
  BellRing,
  ArrowRight,
  Building2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout, loading: authLoading } = useAuth();
  const dashboardNavigation = [
    { name: "الرئيسية", href: "/user/dashboard", icon: LayoutDashboard },
    { name: "عقاراتي", href: "/user/my-properties", icon: Building2 },
    { name: "المفضلة", href: "/user/favorites", icon: Heart },
    { name: "تنبيهات البحث", href: "/user/saved-searches", icon: BellRing },
    { name: "مدفوعاتي", href: "/user/payments", icon: CreditCard },
    { name: "رسائلي", href: "/user/inbox", icon: MessageCircleIcon },
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
    <div className="flex h-full flex-col bg-[#0a1628] text-white overflow-hidden">
      {/* Sidebar header — hidden on desktop since banner shows logo */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-white/10 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#0a1628] font-bold text-lg">✦</div>
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
            <p className="text-xs text-blue-200/60">عميل</p>
          </div>
        </div>
      </div>

      {/* Dashboard nav links + back to site + logout — all scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto py-4 px-3 hide-scrollbar">
        {/* Add property CTA */}
        <Link
          href="/add-property"
          className="flex items-center px-3 py-2.5 mb-3 text-sm font-semibold rounded-xl transition-colors bg-teal-600 hover:bg-teal-500 text-white"
        >
          <Plus className="ml-3 shrink-0 h-5 w-5" />
          أضف عقارك
        </Link>

        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-blue-300/40">القائمة</p>
        <nav className="space-y-1">
          {dashboardNavigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className={`ml-3 shrink-0 h-5 w-5 ${isActive ? "text-blue-300" : "text-blue-300/60 group-hover:text-white"}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-3 border-t border-white/10" />

          {/* Back to site */}
          <Link
            href="/"
            className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors text-blue-100/70 hover:bg-white/5 hover:text-white"
          >
            <ArrowRight className="ml-3 shrink-0 h-5 w-5 text-blue-300/60 group-hover:text-white" />
            العودة للموقع
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl text-red-300/80 hover:bg-red-500/10 hover:text-red-400 transition-colors text-right"
          >
            <LogOut className="ml-3 shrink-0 h-5 w-5 text-red-400/60 group-hover:text-red-400" />
            تسجيل الخروج
          </button>
        </nav>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">

      <Header />

      {/* ══════════════════════════════════════════════
          BODY — Right Sidebar + Content
      ══════════════════════════════════════════════ */}
      <div className="flex min-h-[calc(100vh-64px)]">

        {/* Fixed sidebar — desktop only */}
        <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:top-16 lg:bottom-0 right-0 z-40">
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
              <SheetContent side="right" className="p-0 w-72 border-l-0 bg-[#0a1628] border-none text-white h-full overflow-hidden">
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
      <RealEstateFooter />
    </div>
  );
}
