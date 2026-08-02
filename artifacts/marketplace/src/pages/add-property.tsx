import { Link } from "wouter";
import { Building2, LogIn, UserPlus, Loader2, Zap, Clock, AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useSiteSettings } from "@/App";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { PropertyFormFull } from "@/components/property-form";
import { useQuery } from "@tanstack/react-query";
import { api, type UserCurrentSub } from "@/lib/api";

function GuestScreen() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-16">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-teal-200">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">أضف عقارك الآن</h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
              انشر إعلانك مجاناً وتواصل مع مشترين ومستأجرين في الإسكندرية
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: "+500",   label: "عقار منشور" },
              { value: "+1,200", label: "باحث نشط" },
              { value: "مجاناً", label: "بدون رسوم" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl py-4 px-2 text-center border border-border/60 shadow-sm">
                <p className="text-lg font-extrabold text-teal-600">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-6 space-y-3">
              <Link href="/login?returnTo=/add-property">
                <Button className="w-full h-12 rounded-xl font-bold text-base bg-teal-600 hover:bg-teal-700 text-white gap-2">
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </Button>
              </Link>
              <Link href="/register?returnTo=/add-property">
                <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-base border-teal-200 text-teal-700 hover:bg-teal-50 gap-2">
                  <UserPlus className="w-4 h-4" />
                  إنشاء حساب مجاني
                </Button>
              </Link>
            </div>
            <div className="bg-gray-50 border-t border-border/40 px-6 py-3">
              <p className="text-xs text-center text-muted-foreground">
                التسجيل مجاني تماماً • لا بطاقة ائتمان مطلوبة
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { icon: "⚡", label: "نشر فوري بعد الموافقة" },
              { icon: "📸", label: "رفع صور متعددة" },
              { icon: "📍", label: "موقع على الخريطة" },
              { icon: "📞", label: "تواصل مباشر مع المشترين" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-border/50 text-sm text-muted-foreground">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <RealEstateFooter />
    </div>
  );
}

export default function AddPropertyPage() {
  const { user, loading } = useAuth();
  const siteSettings = useSiteSettings();
  const subsEnabled = siteSettings?.subscriptionsEnabled !== "false";
  const isProvider = (user as any)?.role === "provider";

  // Pre-check active subscription so we can skip the plan-selection step
  // when the user already has an active subscription with remaining quota.
  const { data: userSub, isLoading: subLoading } = useQuery<UserCurrentSub | null>({
    queryKey: ["userCurrentSub", user?.id],
    queryFn: () => api.userSubscription.current(user!.id),
    enabled: !!user && subsEnabled && !isProvider,
    staleTime: 0,
  });

  // Determine whether to show the plan-selection step and/or block with a quota-full screen
  let showPlans = subsEnabled; // default: show plans when enabled
  let quotaExhausted = false;

  if (subsEnabled && user && !isProvider && !subLoading) {
    if (userSub) {
      const rem = userSub.remaining_quota;
      if (rem === -1 || rem > 0) {
        // Active subscription with quota remaining — skip plan selection entirely
        showPlans = false;
      } else {
        // Subscription active but quota exhausted
        showPlans = false;
        quotaExhausted = true;
      }
    }
    // userSub === null → no active subscription → showPlans remains true
  }

  if (loading || (subsEnabled && !isProvider && !!user && subLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) return <GuestScreen />;

  // Quota exhausted — user has an active subscription but no remaining slots
  if (quotaExhausted && userSub) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-16">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">وصلت إلى الحد الأقصى</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              لقد استنفذت جميع إعلانات باقتك الحالية.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              مستخدم:{" "}
              <strong className="text-foreground">{userSub.used_quota}</strong>{" "}
              من أصل{" "}
              <strong className="text-foreground">
                {userSub.total_quota < 0 ? "∞" : userSub.total_quota}
              </strong>{" "}
              إعلان
            </p>
            <Link href="/dashboard/packages">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 px-8 font-bold text-base gap-2">
                <Crown className="w-4 h-4" />
                ترقية الباقة
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              بعد الترقية ستتمكن من إضافة المزيد من الإعلانات فوراً
            </p>
          </div>
        </div>
        <RealEstateFooter />
      </div>
    );
  }

  // Provider account pending admin approval — block all actions
  if (user.providerApproved === false) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-16">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">حسابك قيد المراجعة</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              سيتم تفعيل حسابك بعد موافقة فريق الإدارة. قد يستغرق ذلك حتى 24 ساعة.
              <br />
              بعد التفعيل ستتمكن من إضافة عقارك مباشرةً.
            </p>
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-xl font-bold border-amber-200 text-amber-700 hover:bg-amber-50">
                العودة للوحة التحكم
              </Button>
            </Link>
          </div>
        </div>
        <RealEstateFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Quick Ad banner */}
        <Link href="/quick-ad">
          <div className="mb-5 flex items-center justify-between gap-4 bg-gradient-to-l from-teal-600 to-cyan-500 rounded-2xl px-5 py-4 shadow-md shadow-teal-200/50 cursor-pointer hover:from-teal-700 hover:to-cyan-600 transition-all duration-200 group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">إعلان سريع ⚡</p>
                <p className="text-white/80 text-xs mt-0.5">فقط صور + وصف — في ثوانٍ</p>
              </div>
            </div>
            <span className="shrink-0 bg-white text-teal-700 text-xs font-extrabold px-4 py-2 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
              جرّبه الآن
            </span>
          </div>
        </Link>

        <PropertyFormFull
          mode="user"
          backPath="/"
          showPlans={showPlans}
        />
      </div>
      <RealEstateFooter />
    </div>
  );
}
