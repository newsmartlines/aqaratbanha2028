import { Link } from "wouter";
import { Building2, LogIn, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { PropertyFormFull } from "@/components/property-form";

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
              انشر إعلانك مجاناً وتواصل مع مشترين ومستأجرين في بنها والقليوبية
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) return <GuestScreen />;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PropertyFormFull
          mode="user"
          backPath="/"
          showPlans={true}
        />
      </div>
      <RealEstateFooter />
    </div>
  );
}
