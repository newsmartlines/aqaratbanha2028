import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft, LogIn, UserPlus, Loader2,
  CheckCircle2, Star, Zap, Crown, Shield,
  Building2, TrendingUp, BarChart3, BadgePercent,
  Images, MapPin, Phone, Eye, Clock, Award,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Category, type Package } from "@/lib/api";

const ICON_MAP: Record<string, string> = {
  Home: "🏠", Building2: "🏢", Store: "🏪", MapPin: "📍",
  Factory: "🏭", Hotel: "🏨", Warehouse: "🏗️", Landmark: "🏛️",
  Trees: "🌳", Mountain: "⛰️",
};

const PACKAGE_THEMES: Record<number, { gradient: string; badge?: string; ring: string; icon: React.ReactNode }> = {};

function getPkgTheme(pkg: Package, idx: number) {
  if (pkg.topBadge || pkg.priorityRank >= 2) {
    return {
      gradient: "from-amber-500 to-orange-500",
      badge: "الأكثر طلباً",
      ring: "ring-2 ring-amber-400/60",
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      iconBg: "bg-amber-500/20",
      labelColor: "text-amber-600",
    };
  }
  if (pkg.priorityRank === 1 || idx === 1) {
    return {
      gradient: "from-teal-500 to-cyan-600",
      badge: "الأفضل للمحترفين",
      ring: "ring-2 ring-teal-400/40",
      icon: <Zap className="w-5 h-5 text-teal-400" />,
      iconBg: "bg-teal-500/20",
      labelColor: "text-teal-600",
    };
  }
  return {
    gradient: "from-slate-500 to-slate-600",
    badge: undefined,
    ring: "ring-1 ring-border",
    icon: <Shield className="w-5 h-5 text-slate-400" />,
    iconBg: "bg-slate-100",
    labelColor: "text-slate-500",
  };
}

export default function AddPropertyPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: reCategories = [], isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: packages = [], isLoading: pkgsLoading } = useQuery<Package[]>({
    queryKey: ["packages"],
    queryFn: () => api.packages.list(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!loading && user && user.role === "provider") {
      setLocation("/real-estate-onboarding");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (user && user.role === "provider") return null;

  const displayCats = reCategories.length > 0
    ? reCategories.map((c, i) => ({
        slug: c.slug ?? String(c.id),
        nameAr: c.nameAr,
        sub: c.nameEn ?? "",
        icon: ICON_MAP[c.icon ?? ""] ?? "🏠",
      }))
    : [
        { slug: "residential", nameAr: "سكني",  sub: "شقق، فيلات، دوبلكس", icon: "🏠" },
        { slug: "commercial",  nameAr: "تجاري", sub: "محلات، مكاتب، عيادات", icon: "🏪" },
        { slug: "land",        nameAr: "أراضي", sub: "سكنية، تجارية، زراعية", icon: "🌳" },
      ];

  const sortedPackages = [...packages].sort((a, b) => a.priorityRank - b.priorityRank);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden py-24 px-6 text-white"
        style={{ background: "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 50%, #12B5D0 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-sm font-semibold mb-6">
            <Building2 className="w-4 h-4" />
            منصة عقارات بنها — القليوبية
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            اعرض عقارك أمام
            <span className="block text-cyan-300">آلاف المشترين</span>
          </h1>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
            سجّل عقارك في دقائق، تواصل مع مشترين ومستأجرين مؤهلين، وأغلق صفقتك بسرعة وأمان.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <Button
                size="lg"
                onClick={() => setLocation("/real-estate-onboarding")}
                className="rounded-full px-10 font-bold text-base bg-white hover:bg-white/90"
                style={{ color: "#0060A0" }}
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                ابدأ الآن — مجاناً
              </Button>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg" className="rounded-full px-8 font-bold bg-white hover:bg-white/90" style={{ color: "#0060A0" }}>
                    <UserPlus className="w-4 h-4 ml-2" />
                    أنشئ حسابك مجاناً
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="rounded-full px-8 border-white/40 text-white hover:bg-white/10">
                    <LogIn className="w-4 h-4 ml-2" />
                    تسجيل الدخول
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Quick stats */}
          <div className="mt-14 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: "+500", label: "عقار منشور" },
              { value: "+1,200", label: "مشتري نشط" },
              { value: "24/7", label: "دعم متاح" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl py-4 px-2 border border-white/15">
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-white/70 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROPERTY TYPES ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">ما نوع عقارك؟</h2>
            <p className="text-muted-foreground">اختر التصنيف المناسب لعقارك</p>
          </div>

          {catsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className={`grid grid-cols-2 ${displayCats.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} ${displayCats.length >= 4 ? "lg:grid-cols-4" : ""} gap-4`}>
              {displayCats.map(({ slug, nameAr, sub, icon }) => (
                <button
                  key={slug}
                  onClick={() => setLocation(user ? "/real-estate-onboarding" : "/register")}
                  className="group relative p-6 rounded-3xl border-2 border-border hover:border-primary/50 bg-white hover:bg-primary/5 transition-all text-center shadow-sm hover:shadow-lg"
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl bg-gradient-to-br from-primary/15 to-cyan-500/10 group-hover:from-primary/25 group-hover:to-cyan-500/20 transition-colors">
                    {icon}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{nameAr}</h3>
                  <p className="text-xs text-muted-foreground">{sub || "عقارات متنوعة"}</p>
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ring-2 ring-primary/20" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── PACKAGES ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <BarChart3 className="w-4 h-4" />
              باقات الإعلان
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">اختر الباقة المناسبة لك</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              ابدأ مجاناً وارقَّ لباقة أعلى في أي وقت — كل الباقات تشمل نشراً فورياً وتواصلاً مباشراً مع المشترين
            </p>
          </div>

          {pkgsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${sortedPackages.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"} gap-6`}>
              {sortedPackages.map((pkg, idx) => {
                const theme = getPkgTheme(pkg, idx);
                const isFeatured = !!pkg.topBadge || pkg.priorityRank >= 2;
                const priceNum = parseFloat(pkg.price);
                const commission = parseFloat(pkg.commissionRate);
                return (
                  <div
                    key={pkg.id}
                    className={`relative bg-white rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl ${theme.ring} ${isFeatured ? "scale-[1.02] shadow-xl" : "shadow-sm hover:scale-[1.01]"}`}
                  >
                    {theme.badge && (
                      <div className={`absolute top-0 left-0 right-0 bg-gradient-to-r ${theme.gradient} text-white text-xs font-bold text-center py-1.5 tracking-wide`}>
                        {theme.badge}
                      </div>
                    )}

                    <div className={`p-6 ${theme.badge ? "pt-10" : ""}`}>
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`w-11 h-11 rounded-2xl ${theme.iconBg} flex items-center justify-center`}>
                          {theme.icon}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-lg text-gray-900">{pkg.nameAr}</h3>
                          <p className="text-xs text-muted-foreground">{pkg.nameEn} Plan</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        {priceNum === 0 ? (
                          <div>
                            <span className="text-4xl font-extrabold text-gray-900">مجاني</span>
                            <p className="text-xs text-muted-foreground mt-1">بدون رسوم شهرية</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-extrabold text-gray-900">{priceNum.toLocaleString("ar-EG")}</span>
                              <span className="text-muted-foreground font-medium">ج.م</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">شهرياً • {pkg.durationDays} يوم</p>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-gray-700">
                            {pkg.maxListings === null ? "عقارات غير محدودة" : `حتى ${pkg.maxListings} إعلانات`}
                          </span>
                        </li>
                        <li className="flex items-center gap-3 text-sm">
                          <BadgePercent className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="text-gray-700">
                            عمولة المنصة: <span className="font-bold text-gray-900">{commission}%</span>
                            {commission <= 7 && <span className="text-xs text-emerald-600 mr-1 font-semibold">(الأقل)</span>}
                          </span>
                        </li>
                        <li className="flex items-center gap-3 text-sm">
                          <Star className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-gray-700">
                            {pkg.featuredAllowed === null
                              ? "إعلانات مميزة غير محدودة"
                              : pkg.featuredAllowed === 0
                              ? "بدون إعلانات مميزة"
                              : `${pkg.featuredAllowed} إعلانات مميزة`}
                          </span>
                        </li>
                        {pkg.topBadge && (
                          <li className="flex items-center gap-3 text-sm">
                            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-gray-700 font-semibold">شارة «مزود مميز» ✓</span>
                          </li>
                        )}
                        <li className="flex items-center gap-3 text-sm">
                          <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-gray-700">صلاحية {pkg.durationDays} يوم</span>
                        </li>
                      </ul>
                    </div>

                    {/* CTA */}
                    <div className="px-6 pb-6 mt-auto">
                      <button
                        onClick={() => setLocation(user ? "/real-estate-onboarding" : "/register")}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all
                          ${isFeatured
                            ? `bg-gradient-to-l ${theme.gradient} text-white hover:opacity-90 shadow-lg`
                            : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                          }`}
                      >
                        {priceNum === 0 ? "ابدأ مجاناً" : `اشترك بـ ${priceNum.toLocaleString("ar-EG")} ج.م`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            * يمكن ترقية الباقة في أي وقت من لوحة التحكم — لا عقود، لا رسوم خفية
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">كيف تنشر عقارك؟</h2>
            <p className="text-muted-foreground">ثلاث خطوات بسيطة تفصلك عن المشترين</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-10 left-[16%] right-[16%] h-px border-t-2 border-dashed border-primary/20" />
            {[
              { n: "١", icon: <UserPlus className="w-6 h-6" />, title: "أنشئ حسابك", desc: "سجّل مجاناً في أقل من دقيقة بإيميلك أو رقم هاتفك" },
              { n: "٢", icon: <Images className="w-6 h-6" />, title: "أضف تفاصيل عقارك", desc: "ادخل المعلومات والصور والموقع على الخريطة بسهولة" },
              { n: "٣", icon: <Eye className="w-6 h-6" />, title: "انشر واستقبل العروض", desc: "ظهر عقارك فوراً أمام الباحثين وتواصل معهم مباشرة" },
            ].map(step => (
              <div key={step.n} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 mb-5">
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 sm:-right-4 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center border border-primary/20">
                  {step.n}
                </span>
                <h3 className="font-bold text-gray-900 text-base mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES STRIP ── */}
      <section className="py-12 bg-gray-50 border-y border-border/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: <Zap className="w-5 h-5 text-amber-500" />, label: "نشر فوري" },
              { icon: <Images className="w-5 h-5 text-blue-500" />, label: "صور ومقاطع" },
              { icon: <MapPin className="w-5 h-5 text-rose-500" />, label: "خريطة تفاعلية" },
              { icon: <Phone className="w-5 h-5 text-emerald-500" />, label: "تواصل مباشر" },
              { icon: <TrendingUp className="w-5 h-5 text-purple-500" />, label: "إحصائيات مشاهدات" },
              { icon: <Award className="w-5 h-5 text-orange-500" />, label: "إعلان مميز" },
            ].map(f => (
              <div key={f.label} className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-2">
                  {f.icon}
                </div>
                <p className="text-sm font-semibold text-gray-700">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="py-20 px-6 text-white text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 60%, #12B5D0 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-semibold mb-6 border border-white/20">
            <CheckCircle2 className="w-4 h-4" />
            ابدأ مجاناً — لا بطاقة ائتمان مطلوبة
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
            جاهز لبيع أو تأجير عقارك؟
          </h2>
          <p className="text-white/80 text-lg mb-8">
            انضم لمئات المعلنين في بنها والقليوبية وابدأ تلقّي العروض الآن
          </p>
          {user ? (
            <Button
              size="lg"
              onClick={() => setLocation("/real-estate-onboarding")}
              className="rounded-full px-12 font-bold text-base bg-white hover:bg-white/90"
              style={{ color: "#0060A0" }}
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              أضف عقارك الآن
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button size="lg" className="rounded-full px-10 font-bold bg-white hover:bg-white/90" style={{ color: "#0060A0" }}>
                  <UserPlus className="w-4 h-4 ml-2" />
                  إنشاء حساب مجاني
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="rounded-full px-10 border-white/40 text-white hover:bg-white/10">
                  <LogIn className="w-4 h-4 ml-2" />
                  تسجيل الدخول
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
