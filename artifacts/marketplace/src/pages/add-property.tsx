import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, LogIn, UserPlus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Category } from "@/lib/api";

const ICON_MAP: Record<string, string> = {
  Home: "🏠", Building2: "🏢", Store: "🏪", MapPin: "📍",
  Factory: "🏭", Hotel: "🏨", Warehouse: "🏗️", Landmark: "🏛️",
  Trees: "🌳", Mountain: "⛰️",
};

const CAT_COLORS = ["#12B5D0", "#0E8CB5", "#0060A0", "#1a6b8a", "#0a4a78", "#2d9cdb"];

const FALLBACK_CATS = [
  { slug: "residential", nameAr: "سكني",  sub: "شقق، فيلات، دوبلكس...", icon: "🏠" },
  { slug: "commercial",  nameAr: "تجاري", sub: "محلات، مكاتب، عيادات...", icon: "🏪" },
  { slug: "land",        nameAr: "أراضي", sub: "سكنية، تجارية، زراعية...", icon: "📍" },
];

export default function AddPropertyPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: reCategories = [], isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
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
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && user.role === "provider") {
    return null;
  }

  const displayCats = reCategories.length > 0
    ? reCategories.map((c, i) => ({
        slug: c.slug ?? String(c.id),
        nameAr: c.nameAr,
        sub: c.nameEn ?? "",
        icon: ICON_MAP[c.icon ?? ""] ?? "🏠",
        color: CAT_COLORS[i % CAT_COLORS.length],
      }))
    : FALLBACK_CATS.map((c, i) => ({ ...c, color: CAT_COLORS[i] }));

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden py-20 px-6 text-white text-center"
        style={{ background: "linear-gradient(135deg, #12B5D0 0%, #0E8CB5 50%, #0060A0 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_white,_transparent)]" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <img src="/logo.png" alt="عقارات بنها" className="h-16 w-auto mx-auto mb-6 brightness-0 invert" />
          <h1 className="text-4xl font-bold mb-3">أضف عقارك الآن</h1>
          <p className="text-white/80 text-lg">
            اعرض عقارك أمام آلاف المشترين والمستأجرين في بنها والقليوبية
          </p>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
      </div>

      {/* Property Types */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center text-foreground mb-2">ما نوع عقارك؟</h2>
        <p className="text-center text-muted-foreground mb-8">اختر النوع المناسب لعقارك</p>

        {catsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(displayCats.length, 4)} gap-4 mb-12`}>
            {displayCats.map(({ slug, nameAr, sub, icon, color }) => (
              <button
                key={slug}
                onClick={() => setLocation(user ? "/real-estate-onboarding" : "/register")}
                className="group p-6 rounded-2xl border-2 border-border hover:border-primary/40 bg-card hover:bg-primary/5 transition-all text-center shadow-sm hover:shadow-md"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
                  style={{ background: `linear-gradient(135deg, ${color} 0%, #0060A0 100%)` }}
                >
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{nameAr}</h3>
                <p className="text-sm text-muted-foreground">{sub || "عقارات متنوعة"}</p>
              </button>
            ))}
          </div>
        )}

        {/* Auth gate */}
        {!user ? (
          <div
            className="rounded-2xl p-8 text-center text-white"
            style={{ background: "linear-gradient(135deg, #12B5D0 0%, #0060A0 100%)" }}
          >
            <h3 className="text-2xl font-bold mb-2">سجّل الآن وابدأ في نشر عقارك</h3>
            <p className="text-white/80 mb-6">
              إنشاء حساب مجاني يتيح لك نشر عقاراتك والتواصل مع المشترين مباشرة
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white font-bold rounded-full px-8 hover:bg-white/90"
                  style={{ color: "#0060A0" }}
                >
                  <UserPlus className="w-4 h-4 ml-2" />
                  إنشاء حساب جديد
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-white/50 text-white hover:bg-white/10 rounded-full px-8"
                >
                  <LogIn className="w-4 h-4 ml-2" />
                  تسجيل الدخول
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Link href="/real-estate-onboarding">
              <Button
                size="lg"
                className="rounded-full px-10 font-bold text-white"
                style={{ background: "linear-gradient(135deg, #12B5D0 0%, #0060A0 100%)" }}
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                ابدأ إضافة العقار
              </Button>
            </Link>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
          {[
            { emoji: "🚀", label: "نشر فوري" },
            { emoji: "📸", label: "صور ومقاطع" },
            { emoji: "📍", label: "خريطة تفاعلية" },
            { emoji: "💬", label: "تواصل مباشر" },
          ].map(({ emoji, label }) => (
            <div key={label} className="text-center p-4 rounded-xl bg-card border border-border/60">
              <div className="text-3xl mb-2">{emoji}</div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
