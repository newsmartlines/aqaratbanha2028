import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Menu, X, ChevronDown, User, Heart, ShoppingBag,
  LogOut, Settings, LayoutDashboard, Star,
} from "lucide-react";

export function Header() {
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60 * 1000,
  });

  const siteName = settings?.siteName ?? "عقارات بنها";
  const logoUrl = settings?.logoUrl;

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/properties?listingType=sale", label: "للبيع" },
    { href: "/properties?listingType=rent", label: "للإيجار" },
    { href: "/map-search", label: "🗺 بحث بالخريطة" },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    setLocation("/");
  };

  const getDashboardPath = () => {
    if (!user) return "/login";
    if (user.role === "admin") return "/admin/dashboard";
    if (user.role === "provider") return "/provider/dashboard";
    return "/user/dashboard";
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const providerMenuItems = [
    { icon: LayoutDashboard, label: "لوحة التحكم", href: "/provider/dashboard" },
    { icon: ShoppingBag, label: "طلباتي", href: "/dashboard/orders" },
    { icon: Star, label: "التقييمات", href: "/dashboard/reviews" },
    { icon: Settings, label: "الإعدادات", href: "/dashboard/settings" },
  ];

  const userMenuItems = [
    { icon: User, label: "ملفي الشخصي", href: "/user/dashboard" },
    { icon: ShoppingBag, label: "طلباتي", href: "/user/requests" },
    { icon: Heart, label: "المفضلة", href: "/user/favorites" },
  ];

  const menuItems = user?.role === "provider" ? providerMenuItems :
    user?.role === "admin" ? [{ icon: LayoutDashboard, label: "لوحة التحكم", href: "/admin/dashboard" }] :
    userMenuItems;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between" dir="rtl">
        {/* Logo + Nav grouped */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <img
              src="/logo.png"
              alt="عقارات بنها"
              className="h-10 w-auto object-contain"
              onError={e => {
                e.currentTarget.style.display = "none";
                if (logoUrl) {
                  const img = document.createElement("img");
                  img.src = mediaUrl(logoUrl);
                  img.className = "h-10 w-auto object-contain rounded";
                  e.currentTarget.parentNode?.appendChild(img);
                }
              }}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-secondary/60 transition-colors group"
              >
                <Avatar className="w-8 h-8 border-2 border-primary/20">
                  <AvatarImage src={user.avatar ? mediaUrl(user.avatar) : undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium max-w-[120px] truncate">{user.name}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-popover border border-border/60 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150" dir="rtl">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-border/40">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <span className="inline-flex mt-1 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                      {user.role === "admin" ? "مسؤول" : user.role === "provider" ? "شركة عقارية" : "مستخدم"}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {menuItems.map(item => (
                      <Link key={item.href} href={item.href}>
                        <button
                          onClick={() => setDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-secondary/60 transition-colors text-right"
                        >
                          <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          {item.label}
                        </button>
                      </Link>
                    ))}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-border/40 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-right"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm font-medium">
              <User className="w-5 h-5 text-muted-foreground" />
              <Link href="/login">
                <span className="cursor-pointer hover:text-primary transition-colors text-foreground">تسجيل</span>
              </Link>
              <span className="text-border mx-1">|</span>
              <Link href="/register">
                <span className="cursor-pointer hover:text-primary transition-colors text-foreground">مستخدم جديد</span>
              </Link>
              <span className="text-border mx-1">|</span>
              <Link href={user?.role === "provider" ? "/real-estate-onboarding" : "/register"}>
                <Button className="flex items-center gap-1 font-bold text-sm px-4 py-1.5 rounded-full text-white shadow-sm bg-primary hover:bg-primary/90 h-auto">
                  <span className="text-base leading-none">+</span>
                  <span>أضف عقارك</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile burger */}
        <button className="md:hidden p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background py-4 px-4 shadow-lg" dir="rtl">
          <nav className="flex flex-col gap-1">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href}>
                <span className="block px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/50 rounded-lg cursor-pointer"
                  onClick={() => setMobileOpen(false)}>
                  {l.label}
                </span>
              </Link>
            ))}
            <div className="border-t border-border/40 mt-2 pt-2 flex flex-col gap-1">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar className="w-9 h-9 border-2 border-primary/20">
                      <AvatarImage src={user.avatar ? mediaUrl(user.avatar) : undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Link href={getDashboardPath()} onClick={() => setMobileOpen(false)}>
                    <span className="block px-4 py-2.5 text-sm font-medium hover:bg-secondary/50 rounded-lg cursor-pointer">لوحة التحكم</span>
                  </Link>
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    className="block w-full text-right px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <span className="block px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/50 rounded-lg cursor-pointer">تسجيل الدخول</span>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <span className="block px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/50 rounded-lg cursor-pointer">مستخدم جديد</span>
                  </Link>
                </>
              )}
              <Link href={user?.role === "provider" ? "/real-estate-onboarding" : "/register"} onClick={() => setMobileOpen(false)}>
                <span className="block mx-4 mt-2 px-4 py-2.5 text-sm font-bold text-white rounded-full text-center cursor-pointer" style={{background: 'linear-gradient(135deg, #12B5D0 0%, #0060A0 100%)'}}>
                  + أضف عقارك
                </span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
