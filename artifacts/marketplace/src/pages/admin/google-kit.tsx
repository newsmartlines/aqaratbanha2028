import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Loader2, CheckCircle2, ExternalLink, Eye, EyeOff,
  BarChart3, Map, Shield, KeyRound, Bell, Tag, Search,
  AlertTriangle, Info, DollarSign,
} from "lucide-react";

/* ── helpers ────────────────────────────────────────────────────── */
function Section({
  icon, title, desc, badge, children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            {icon}
            {title}
          </CardTitle>
          {badge && <Badge variant="secondary" className="text-xs shrink-0">{badge}</Badge>}
        </div>
        <CardDescription className="text-xs leading-relaxed">{desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SecretInput({
  value, onChange, placeholder, dir = "ltr",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; dir?: "ltr" | "rtl";
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        dir={dir}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pe-10"
      />
      <button
        type="button"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        onClick={() => setShow(v => !v)}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function HowTo({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 leading-relaxed" dir="rtl">
      <p className="font-semibold mb-1 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> كيفية الإعداد:</p>
      <ol className="list-decimal list-inside space-y-0.5">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}

function DocsLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
    >
      <ExternalLink className="w-3 h-3" />
      {label}
    </a>
  );
}

/* ── main component ─────────────────────────────────────────────── */
export default function AdminGoogleKit() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: api.settings.adminList,
  });

  const [ga4Id, setGa4Id] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [searchConsole, setSearchConsole] = useState("");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState("");
  const [mapsEnabled, setMapsEnabled] = useState(false);
  const [recaptchaSite, setRecaptchaSite] = useState("");
  const [recaptchaSecret, setRecaptchaSecret] = useState("");
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(false);
  const [fbPixelId, setFbPixelId] = useState("");
  const [fbPixelEnabled, setFbPixelEnabled] = useState(false);
  const [fcmServerKey, setFcmServerKey] = useState("");
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const [adsensePublisherId, setAdsensePublisherId] = useState("");
  const [adsenseAutoAdsEnabled, setAdsenseAutoAdsEnabled] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setGa4Id(settings.gaTrackingId ?? "");
    setGtmId(settings.gtmId ?? "");
    setSearchConsole(settings.searchConsoleVerify ?? "");
    setOauthClientId(settings.googleClientId ?? "");
    setOauthClientSecret(settings.googleClientSecret ?? "");
    setOauthEnabled(settings.googleOAuthEnabled === "true");
    setMapsApiKey(settings.googleMapsApiKey ?? "");
    setMapsEnabled(settings.googleMapsEnabled === "true");
    setRecaptchaSite(settings.recaptchaSiteKey ?? "");
    setRecaptchaSecret(settings.recaptchaSecretKey ?? "");
    setRecaptchaEnabled(settings.recaptchaEnabled === "true");
    setFbPixelId(settings.fbPixelId ?? "");
    setFbPixelEnabled(settings.fbPixelEnabled === "true");
    setFcmServerKey(settings.fcmServerKey ?? "");
    setFcmEnabled(settings.fcmEnabled === "true");
    setAdsensePublisherId(settings.adsensePublisherId ?? "");
    setAdsenseAutoAdsEnabled(settings.adsenseAutoAdsEnabled === "true");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => api.settings.save(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-site-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "تم الحفظ!", description: "تم حفظ الإعدادات بنجاح." });
    },
    onError: () => toast({ title: "خطأ", description: "فشل حفظ الإعدادات.", variant: "destructive" }),
  });

  const saving = saveMutation.isPending;
  const SaveBtn = ({ data }: { data: Record<string, string> }) => (
    <Button
      onClick={() => saveMutation.mutate(data)}
      disabled={saving}
      className="bg-teal-600 hover:bg-teal-700 h-9"
      size="sm"
    >
      {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
      حفظ
    </Button>
  );

  if (isLoading) return (
    <AdminLayout title="Google Kit">
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Google Kit — تكامل جوجل">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl">🔌</span> Google Kit
        </h1>
        <p className="text-sm text-slate-500">جميع إعدادات ربط المنصة بخدمات جوجل في مكان واحد</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Google Analytics 4 ── */}
        <Section
          icon={<BarChart3 className="w-5 h-5 text-orange-500" />}
          title="Google Analytics 4"
          desc="تتبع زيارات الموقع وسلوك المستخدمين وتحليل الأداء"
          badge={ga4Id ? "✓ مُفعَّل" : "غير مُفعَّل"}
        >
          <HowTo steps={[
            "اذهب إلى analytics.google.com",
            "أنشئ موقعاً جديداً أو اختر موجوداً",
            "من الإعدادات → Data Streams → اختر موقعك",
            "انسخ Measurement ID (يبدأ بـ G-)",
          ]} />
          <div className="space-y-1.5">
            <Label>Measurement ID</Label>
            <Input dir="ltr" value={ga4Id} onChange={e => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" />
          </div>
          {ga4Id && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              كود التتبع سيُضاف تلقائياً في كل صفحة
            </div>
          )}
          <div className="flex items-center justify-between">
            <DocsLink href="https://analytics.google.com" label="Google Analytics" />
            <SaveBtn data={{ gaTrackingId: ga4Id }} />
          </div>
        </Section>

        {/* ── Google Tag Manager ── */}
        <Section
          icon={<Tag className="w-5 h-5 text-blue-500" />}
          title="Google Tag Manager"
          desc="إدارة جميع أكواد التتبع من لوحة GTM بدون تعديل الكود"
          badge={gtmId ? "✓ مُفعَّل" : "غير مُفعَّل"}
        >
          <HowTo steps={[
            "اذهب إلى tagmanager.google.com",
            "أنشئ حساباً وحاوية (Container) جديدة",
            "اختر Web كنوع المنصة",
            "انسخ Container ID (يبدأ بـ GTM-)",
          ]} />
          <div className="space-y-1.5">
            <Label>Container ID</Label>
            <Input dir="ltr" value={gtmId} onChange={e => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" />
          </div>
          {gtmId && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              GTM و GA4 مُفعَّلان معاً — تأكد أن لا تكرار في التتبع
            </div>
          )}
          <div className="flex items-center justify-between">
            <DocsLink href="https://tagmanager.google.com" label="Google Tag Manager" />
            <SaveBtn data={{ gtmId }} />
          </div>
        </Section>

        {/* ── Google Search Console ── */}
        <Section
          icon={<Search className="w-5 h-5 text-green-600" />}
          title="Google Search Console"
          desc="التحقق من ملكية الموقع لجوجل وتتبع ظهوره في نتائج البحث"
          badge={searchConsole ? "✓ مُتحقَّق منه" : "غير مُتحقَّق"}
        >
          <HowTo steps={[
            "اذهب إلى search.google.com/search-console",
            "أضف موقعك واختر طريقة HTML Tag",
            "انسخ قيمة content من الوسم (فقط الكود بدون الوسم)",
            "مثال: خذ فقط: aBcDeFgHiJ... من: content=\"aBcDeFgHiJ...\"",
          ]} />
          <div className="space-y-1.5">
            <Label>كود التحقق (Meta Tag Content)</Label>
            <Input dir="ltr" value={searchConsole} onChange={e => setSearchConsole(e.target.value)} placeholder="aBcDeFgHiJkLmNoPqRsTuVwXyZ012345678_-" />
          </div>
          <div className="flex items-center justify-between">
            <DocsLink href="https://search.google.com/search-console" label="Search Console" />
            <SaveBtn data={{ searchConsoleVerify: searchConsole }} />
          </div>
        </Section>

        {/* ── Google OAuth ── */}
        <Section
          icon={<KeyRound className="w-5 h-5 text-red-500" />}
          title="Google OAuth — تسجيل الدخول بجوجل"
          desc="يتيح للمستخدمين تسجيل الدخول بحساب جوجل مباشرة"
          badge={oauthEnabled && oauthClientId ? "✓ مُفعَّل" : "غير مُفعَّل"}
        >
          <HowTo steps={[
            "اذهب إلى console.cloud.google.com",
            "أنشئ مشروعاً → APIs & Services → Credentials",
            "أنشئ OAuth 2.0 Client ID من نوع Web Application",
            "أضف نطاقك في Authorized JavaScript origins",
            "انسخ Client ID و Client Secret",
          ]} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Client ID</Label>
              <Input dir="ltr" value={oauthClientId} onChange={e => setOauthClientId(e.target.value)} placeholder="xxxxxxxxxxxx.apps.googleusercontent.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Client Secret</Label>
              <SecretInput value={oauthClientSecret} onChange={setOauthClientSecret} placeholder="GOCSPX-..." />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div>
                <p className="text-sm font-medium">تفعيل زر "تسجيل الدخول بجوجل"</p>
                <p className="text-xs text-slate-500">سيظهر في صفحتي الدخول والتسجيل</p>
              </div>
              <Switch checked={oauthEnabled} onCheckedChange={setOauthEnabled} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DocsLink href="https://console.cloud.google.com/apis/credentials" label="Google Cloud Console" />
            <SaveBtn data={{ googleClientId: oauthClientId, googleClientSecret: oauthClientSecret, googleOAuthEnabled: oauthEnabled ? "true" : "false" }} />
          </div>
        </Section>

        {/* ── Google Maps ── */}
        <Section
          icon={<Map className="w-5 h-5 text-teal-500" />}
          title="Google Maps API"
          desc="تضمين الخرائط وتحديد مواقع العقارات والبحث الجغرافي"
          badge={mapsEnabled && mapsApiKey ? "✓ مُفعَّل" : "غير مُفعَّل"}
        >
          <HowTo steps={[
            "اذهب إلى console.cloud.google.com",
            "فعّل: Maps JavaScript API + Geocoding API + Places API",
            "من Credentials → Create Credentials → API Key",
            "يُنصح بتقييد المفتاح على نطاقك فقط للأمان",
          ]} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Google Maps API Key</Label>
              <SecretInput value={mapsApiKey} onChange={setMapsApiKey} placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div>
                <p className="text-sm font-medium">تفعيل خرائط جوجل</p>
                <p className="text-xs text-slate-500">عرض مواقع العقارات على الخريطة التفاعلية</p>
              </div>
              <Switch checked={mapsEnabled} onCheckedChange={setMapsEnabled} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DocsLink href="https://console.cloud.google.com/apis/library/maps-javascript-backend.googleapis.com" label="Maps JavaScript API" />
            <SaveBtn data={{ googleMapsApiKey: mapsApiKey, googleMapsEnabled: mapsEnabled ? "true" : "false" }} />
          </div>
        </Section>

        {/* ── reCAPTCHA ── */}
        <Section
          icon={<Shield className="w-5 h-5 text-purple-500" />}
          title="Google reCAPTCHA v3"
          desc="حماية نماذج التسجيل والتواصل من البوتات والسبام"
          badge={recaptchaEnabled && recaptchaSite ? "✓ مُفعَّل" : "غير مُفعَّل"}
        >
          <HowTo steps={[
            "اذهب إلى google.com/recaptcha/admin/create",
            "اختر reCAPTCHA v3 كنوع الحماية",
            "أضف نطاق موقعك (مثال: yourdomain.com)",
            "انسخ Site Key و Secret Key",
          ]} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Site Key (المفتاح العام)</Label>
              <Input dir="ltr" value={recaptchaSite} onChange={e => setRecaptchaSite(e.target.value)} placeholder="6LeXXXXXAAAAAAAAAAAAAAAAAAAAA" />
            </div>
            <div className="space-y-1.5">
              <Label>Secret Key (المفتاح السري)</Label>
              <SecretInput value={recaptchaSecret} onChange={setRecaptchaSecret} placeholder="6LeXXXXXAAAAAAAAAAAAAAAAAAAAA" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div>
                <p className="text-sm font-medium">تفعيل reCAPTCHA</p>
                <p className="text-xs text-slate-500">في نماذج التسجيل والتواصل</p>
              </div>
              <Switch checked={recaptchaEnabled} onCheckedChange={setRecaptchaEnabled} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DocsLink href="https://google.com/recaptcha/admin/create" label="reCAPTCHA Admin Console" />
            <SaveBtn data={{ recaptchaSiteKey: recaptchaSite, recaptchaSecretKey: recaptchaSecret, recaptchaEnabled: recaptchaEnabled ? "true" : "false" }} />
          </div>
        </Section>

        {/* ── Facebook Pixel ── */}
        <Section
          icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
          title="Facebook / Meta Pixel"
          desc="تتبع زيارات الموقع وقياس أداء إعلانات فيسبوك وإنستجرام"
          badge={fbPixelEnabled && fbPixelId ? "✓ مُفعَّل" : "غير مُفعَّل"}
        >
          <HowTo steps={[
            "اذهب إلى business.facebook.com → Events Manager",
            "أنشئ Pixel جديد أو اختر موجوداً",
            "من إعدادات الـ Pixel انسخ Pixel ID (رقم مكوّن من 15-16 خانة)",
          ]} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Facebook Pixel ID</Label>
              <Input dir="ltr" value={fbPixelId} onChange={e => setFbPixelId(e.target.value)} placeholder="XXXXXXXXXXXXXXXX" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div>
                <p className="text-sm font-medium">تفعيل Facebook Pixel</p>
                <p className="text-xs text-slate-500">تتبع PageView وإحداث الموقع تلقائياً</p>
              </div>
              <Switch checked={fbPixelEnabled} onCheckedChange={setFbPixelEnabled} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DocsLink href="https://business.facebook.com/events_manager" label="Meta Events Manager" />
            <SaveBtn data={{ fbPixelId, fbPixelEnabled: fbPixelEnabled ? "true" : "false" }} />
          </div>
        </Section>

        {/* ── Firebase (Push Notifications) ── */}
        <Section
          icon={<Bell className="w-5 h-5 text-yellow-500" />}
          title="Firebase — إشعارات الدفع (Push)"
          desc="إرسال إشعارات فورية للمستخدمين على المتصفح والجوال"
          badge={fcmEnabled && fcmServerKey ? "✓ مُفعَّل" : "غير مُفعَّل"}
        >
          <HowTo steps={[
            "اذهب إلى console.firebase.google.com",
            "أنشئ مشروعاً جديداً أو اختر موجوداً",
            "من Project Settings → Cloud Messaging",
            "انسخ Server Key (Legacy) أو أنشئ Service Account",
          ]} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>FCM Server Key</Label>
              <SecretInput value={fcmServerKey} onChange={setFcmServerKey} placeholder="AAAAxxxxx:APA91bxxxx..." />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div>
                <p className="text-sm font-medium">تفعيل Push Notifications</p>
                <p className="text-xs text-slate-500">إرسال إشعارات الطلبات والرسائل للمستخدمين</p>
              </div>
              <Switch checked={fcmEnabled} onCheckedChange={setFcmEnabled} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DocsLink href="https://console.firebase.google.com" label="Firebase Console" />
            <SaveBtn data={{ fcmServerKey, fcmEnabled: fcmEnabled ? "true" : "false" }} />
          </div>
        </Section>

        {/* ── Google AdSense ── */}
        <Section
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          title="Google AdSense"
          desc="عرض إعلانات جوجل التلقائية على الموقع وتحقيق دخل من الزيارات"
          badge={adsenseAutoAdsEnabled && adsensePublisherId ? "✓ مُفعَّل" : "غير مُفعَّل"}
        >
          <HowTo steps={[
            "اذهب إلى adsense.google.com وسجّل موقعك",
            "انتظر موافقة جوجل على الموقع",
            "من لوحة AdSense → Account → Account information",
            "انسخ Publisher ID (يبدأ بـ ca-pub-)",
            "فعّل Auto Ads لعرض الإعلانات تلقائياً في أفضل مواضع الصفحة",
          ]} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Publisher ID</Label>
              <Input
                dir="ltr"
                value={adsensePublisherId}
                onChange={e => setAdsensePublisherId(e.target.value)}
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              />
              <p className="text-xs text-slate-500">
                يُستخدم هذا المعرّف أيضاً كـ fallback تلقائي لجميع مواضع الإعلانات غير المُعيَّن لها Publisher ID خاص
              </p>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div>
                <p className="text-sm font-medium">تفعيل Auto Ads</p>
                <p className="text-xs text-slate-500">جوجل يختار تلقائياً أفضل مواضع الإعلانات في كل صفحة</p>
              </div>
              <Switch checked={adsenseAutoAdsEnabled} onCheckedChange={setAdsenseAutoAdsEnabled} />
            </div>
            {adsensePublisherId && !adsensePublisherId.startsWith("ca-pub-") && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Publisher ID يجب أن يبدأ بـ ca-pub- — تحقق من القيمة المُدخلة
              </div>
            )}
            {adsensePublisherId && adsensePublisherId.startsWith("ca-pub-") && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {adsenseAutoAdsEnabled
                  ? "Auto Ads مُفعَّل — سيتم تحميل سكريبت AdSense تلقائياً في كل صفحة"
                  : "Publisher ID محفوظ — الإعلانات ستعمل في مواضع الإعلانات المضبوطة يدوياً"}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <DocsLink href="https://adsense.google.com" label="Google AdSense" />
            <SaveBtn data={{ adsensePublisherId, adsenseAutoAdsEnabled: adsenseAutoAdsEnabled ? "true" : "false" }} />
          </div>
        </Section>

      </div>
    </AdminLayout>
  );
}
