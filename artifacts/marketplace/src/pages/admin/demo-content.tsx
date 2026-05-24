import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin, Mail, Home, Star, Settings, Database, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, Building2, Users, Tag,
  Globe, LayoutDashboard, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type SeedStatus = {
  regions: number;
  cities: number;
  areas: number;
  featuredAreas: number;
  emailTemplates: number;
  siteSettings: number;
  properties: number;
  realEstateCategories: number;
  allCategories: number;
  providers: number;
  users: number;
  hasEgyptLocations: boolean;
};

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function fetchSeedStatus(): Promise<SeedStatus> {
  const res = await fetch("/api/admin/seed-status", { credentials: "include" });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function runSeed(section: string): Promise<string> {
  const res = await fetch("/api/admin/seed-demo", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? data.message);
  return data.message;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ count, min = 1 }: { count: number; min?: number }) {
  if (count >= min) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 text-xs">
        <CheckCircle2 className="w-3 h-3" /> {count} عنصر
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-300 text-amber-600 gap-1 text-xs">
      <AlertCircle className="w-3 h-3" /> فارغ
    </Badge>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SeedCard({
  icon: Icon,
  title,
  description,
  section,
  count,
  min,
  onSeed,
  loading,
  color,
  items,
}: {
  icon: any;
  title: string;
  description: string;
  section: string;
  count: number;
  min?: number;
  onSeed: (section: string) => void;
  loading: boolean;
  color: string;
  items?: string[];
}) {
  const seeded = count >= (min ?? 1);
  return (
    <Card className={`border-2 transition-all ${seeded ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <StatusBadge count={count} min={min} />
        </div>
      </CardHeader>
      {items && items.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <div className="flex flex-wrap gap-1">
            {items.map((item, i) => (
              <span key={i} className="text-[11px] bg-white border rounded-full px-2 py-0.5 text-slate-600">{item}</span>
            ))}
          </div>
        </CardContent>
      )}
      <CardContent className="pt-0">
        <Button
          size="sm"
          variant={seeded ? "outline" : "default"}
          className={seeded ? "w-full border-slate-300 text-slate-600 hover:bg-slate-100" : "w-full bg-teal-600 hover:bg-teal-700"}
          onClick={() => onSeed(section)}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جارٍ التهيئة...</>
          ) : seeded ? (
            <><RefreshCw className="w-4 h-4 ml-2" /> إعادة التهيئة</>
          ) : (
            <><Sparkles className="w-4 h-4 ml-2" /> تهيئة الآن</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDemoContent() {
  const queryClient = useQueryClient();
  const [loadingSection, setLoadingSection] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["seed-status"],
    queryFn: fetchSeedStatus,
    refetchInterval: 0,
  });

  const seedMutation = useMutation({
    mutationFn: runSeed,
    onMutate: (section) => setLoadingSection(section),
    onSuccess: (message, section) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["seed-status"] });
      setLoadingSection(null);
    },
    onError: (err: any, section) => {
      toast.error(err?.message ?? "حدث خطأ أثناء التهيئة");
      setLoadingSection(null);
    },
  });

  const handleSeed = (section: string) => seedMutation.mutate(section);

  const totalItems = status
    ? status.regions + status.cities + status.areas + status.featuredAreas +
      status.emailTemplates + status.properties + status.realEstateCategories
    : 0;

  const allSeeded = status
    ? status.hasEgyptLocations && status.featuredAreas >= 5 &&
      status.emailTemplates >= 5 && status.properties >= 10 &&
      status.realEstateCategories >= 3
    : false;

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-7 h-7 text-teal-600" />
                المحتوى التجريبي الدائم
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                إدارة وتهيئة البيانات الأساسية للموقع — تُحفظ في قاعدة البيانات بشكل دائم
              </p>
            </div>
            <div className="flex items-center gap-3">
              {allSeeded && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> جميع البيانات مُهيَّأة
                </Badge>
              )}
              <Button
                onClick={() => handleSeed("all")}
                disabled={loadingSection !== null}
                className="bg-teal-600 hover:bg-teal-700 gap-2"
              >
                {loadingSection === "all" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                تهيئة كل شيء
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-teal-200 bg-teal-50">
              <CardContent className="p-4 text-center">
                <MapPin className="w-6 h-6 text-teal-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-teal-700">{status.regions}</p>
                <p className="text-xs text-teal-600">محافظة / منطقة</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-center">
                <Home className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700">{status.properties}</p>
                <p className="text-xs text-blue-600">عقار تجريبي</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4 text-center">
                <Mail className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-700">{status.emailTemplates}</p>
                <p className="text-xs text-purple-600">قالب بريد</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-center">
                <Star className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700">{status.featuredAreas}</p>
                <p className="text-xs text-amber-600">منطقة مميزة</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator className="mb-6" />

        {/* Section Cards */}
        <div className="space-y-6">

          {/* Locations Section */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              المواقع الجغرافية
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <SeedCard
                icon={MapPin}
                title="محافظات ومدن مصر / بنها"
                description={`${status?.regions ?? "…"} محافظة · ${status?.cities ?? "…"} مدينة · ${status?.areas ?? "…"} منطقة`}
                section="locations"
                count={status?.regions ?? 0}
                min={1}
                onSeed={handleSeed}
                loading={loadingSection === "locations"}
                color="bg-teal-100 text-teal-700"
                items={["بنها", "قليوب", "طوخ", "الخانكة", "القناطر الخيرية", "شبرا الخيمة", "القاهرة", "التجمع الخامس", "الشيخ زايد", "مدينة بدر"]}
              />
              <SeedCard
                icon={Star}
                title="المناطق المميزة (Homepage)"
                description="تظهر في الصفحة الرئيسية كبطاقات مناطق قابلة للنقر"
                section="featured-areas"
                count={status?.featuredAreas ?? 0}
                min={5}
                onSeed={handleSeed}
                loading={loadingSection === "featured-areas"}
                color="bg-amber-100 text-amber-700"
                items={["بنها", "شبرا الخيمة", "القناطر الخيرية", "طوخ", "قليوب", "التجمع", "الشيخ زايد", "مدينة بدر"]}
              />
            </div>
          </div>

          {/* Properties & Categories */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              العقارات والتصنيفات
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <SeedCard
                icon={Home}
                title="عقارات تجريبية"
                description="شقق وفيلات ودوبلكس ومحلات وأراضي في بنها وشبرا وطوخ وغيرها"
                section="properties"
                count={status?.properties ?? 0}
                min={10}
                onSeed={handleSeed}
                loading={loadingSection === "properties"}
                color="bg-blue-100 text-blue-700"
                items={["شقق للبيع", "شقق للإيجار", "فيلات", "دوبلكس", "أراضي", "محلات تجارية", "مكاتب", "مستودعات"]}
              />
              <SeedCard
                icon={Tag}
                title="تصنيفات العقارات"
                description={`${status?.realEstateCategories ?? "…"} تصنيف عقاري + ${(status?.allCategories ?? 0) - (status?.realEstateCategories ?? 0)} تصنيف خدمات`}
                section="real-estate-categories"
                count={status?.realEstateCategories ?? 0}
                min={3}
                onSeed={handleSeed}
                loading={loadingSection === "real-estate-categories"}
                color="bg-indigo-100 text-indigo-700"
                items={["سكني", "تجاري", "أراضي", "صناعي"]}
              />
            </div>
          </div>

          {/* Email Templates */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              قوالب البريد الإلكتروني
            </h2>
            <div className="grid md:grid-cols-1 gap-4">
              <SeedCard
                icon={Mail}
                title="قوالب البريد الإلكتروني المهنية"
                description={`${status?.emailTemplates ?? "…"} قالب جاهز لكل السيناريوهات — مرحبا، إعادة كلمة مرور، تأكيد عقار، دفع، إشعارات، تسويق`}
                section="email-templates"
                count={status?.emailTemplates ?? 0}
                min={5}
                onSeed={handleSeed}
                loading={loadingSection === "email-templates"}
                color="bg-purple-100 text-purple-700"
                items={[
                  "مرحباً بك", "إعادة كلمة المرور", "تأكيد البريد", "تنبيه الدخول",
                  "موافقة الحساب", "إيقاف الحساب", "تقديم عقار", "قبول عقار",
                  "رفض عقار", "استفسار عقار", "نجاح الدفع", "فشل الدفع",
                  "تفعيل الاشتراك", "انتهاء الاشتراك", "رسالة جديدة", "عميل محتمل",
                  "نشرة إخبارية", "إشعار إداري", "تغيير كلمة المرور",
                ]}
              />
            </div>
          </div>

          {/* Site Settings */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              إعدادات الموقع
            </h2>
            <div className="grid md:grid-cols-1 gap-4">
              <SeedCard
                icon={Globe}
                title="إعدادات الموقع الأساسية"
                description={`${status?.siteSettings ?? "…"} إعداد محفوظ في قاعدة البيانات — Hero Section، شعار، تواصل، FAQ، CTA`}
                section="site-settings"
                count={status?.siteSettings ?? 0}
                min={5}
                onSeed={handleSeed}
                loading={loadingSection === "site-settings"}
                color="bg-slate-100 text-slate-700"
                items={["اسم الموقع", "صورة Hero", "عنوان Hero", "CTA", "التواصل", "FAQ", "نبذة عن الموقع"]}
              />
            </div>
          </div>

          {/* Info Box */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900 mb-1">ملاحظات مهمة</p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>جميع البيانات تُحفظ بشكل دائم في قاعدة البيانات ولا تُحذف عند الإعادة</li>
                    <li>عند نقل المشروع لأي سيرفر جديد، البيانات تظهر تلقائياً عند أول تشغيل</li>
                    <li>زر «إعادة التهيئة» يحذف البيانات القديمة ويستبدلها بالبيانات الافتراضية</li>
                    <li>العقارات والمواقع تظهر على الصفحة الرئيسية والبحث والفلاتر تلقائياً</li>
                    <li>قوالب البريد متاحة في صفحة «البريد الإلكتروني» في لوحة التحكم</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users / Providers Info */}
          {status && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600" />
                  المستخدمون ومقدمو الخدمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-800">{status.users}</p>
                    <p className="text-xs text-slate-500">مستخدم</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-800">{status.providers}</p>
                    <p className="text-xs text-slate-500">مزود خدمة / سمسار</p>
                  </div>
                  <div className="text-center p-3 bg-teal-50 rounded-lg col-span-2 md:col-span-1">
                    <p className="text-sm font-medium text-teal-700 mb-1">بيانات الدخول</p>
                    <p className="text-xs text-teal-600">admin@aqaratbanha.com / admin123</p>
                    <p className="text-xs text-teal-500 mt-0.5">provider: provider@123</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
