import { useState, useEffect, useRef, useMemo } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api, mediaUrl, type SiteSettings } from "@/lib/api";
import {
  Save, Globe, Phone, FileText, HelpCircle, Lock, Loader2, CheckCircle2, Upload,
  ImageIcon, Palette, KeyRound, Mail, Share2, Search, AlertTriangle, Eye, EyeOff,
  Send, Wifi, WifiOff, Instagram, Youtube, Facebook, Twitter, Linkedin, Shield,
  Star, MapPin, BedDouble, Bath, Maximize2, ArrowLeft, Link2, ToggleRight, ExternalLink,
  CreditCard, Smartphone, Zap, Building2 as BankIcon, Banknote,
  TrendingUp, BarChart2, RefreshCw, Database, Info,
} from "lucide-react";
import { AppearanceTab } from "./settings-appearance";
import { useToast } from "@/hooks/use-toast";
import { useT, commonDict } from "@/lib/i18n";
import toast from "react-hot-toast";

const dict = {
  pageTitle: { ar: "إعدادات المنصة", en: "Platform Settings" },
  general: { ar: "عام", en: "General" },
  contact: { ar: "التواصل", en: "Contact" },
  pages: { ar: "محتوى الصفحات", en: "Pages Content" },
  faq: { ar: "الأسئلة الشائعة", en: "FAQ" },
  security: { ar: "الأمان", en: "Security" },
  appearance: { ar: "المظهر", en: "Appearance" },
  smtp: { ar: "البريد الإلكتروني", en: "Email / SMTP" },
  social: { ar: "التواصل الاجتماعي", en: "Social Media" },
  seo: { ar: "SEO والتحليلات", en: "SEO & Analytics" },
  platform: { ar: "قواعد المنصة", en: "Platform Rules" },
  generalSettings: { ar: "الإعدادات العامة", en: "General Settings" },
  generalDesc: { ar: "اسم الموقع، الشعار، والهوية المعروضة في الواجهة", en: "Site name, logo, and branding shown on the frontend" },
  siteNameAr: { ar: "اسم الموقع (عربي)", en: "Site Name (Arabic)" },
  siteNameEn: { ar: "اسم الموقع (إنجليزي)", en: "Site Name (English)" },
  hoursAr: { ar: "ساعات العمل (عربي)", en: "Business Hours (Arabic)" },
  hoursEn: { ar: "ساعات العمل (إنجليزي)", en: "Business Hours (English)" },
  hoursPhAr: { ar: "مثال: يومياً 9:00 ص - 10:00 م", en: "Daily 9:00 AM - 10:00 PM" },
  hoursPhEn: { ar: "Daily 9:00 AM - 10:00 PM", en: "Daily 9:00 AM - 10:00 PM" },
  logoUrl: { ar: "رابط الشعار", en: "Logo URL" },
  logoAlt: { ar: "معاينة الشعار", en: "Logo preview" },
  faviconUrl: { ar: "رابط الفافيكون", en: "Favicon URL" },
  faviconAlt: { ar: "معاينة الفافيكون", en: "Favicon preview" },
  faviconDesc: { ar: "الأيقونة الصغيرة التي تظهر في تبويب المتصفح (يفضل 32×32 أو 64×64 بكسل)", en: "Small icon shown in browser tab (32×32 or 64×64 px recommended)" },
  heroImage: { ar: "صورة خلفية الهيرو", en: "Hero Background Image" },
  heroImageAlt: { ar: "معاينة صورة الهيرو", en: "Hero image preview" },
  heroImageDesc: { ar: "صورة خلفية قسم الهيرو في الصفحة الرئيسية (يفضل عرض لا يقل عن 1920×600 بكسل)", en: "Hero section background on homepage (1920×600 px or wider recommended)" },
  heroTitle: { ar: "عنوان البطل (عربي)", en: "Hero Title (Arabic)" },
  heroSubtitle: { ar: "العنوان الفرعي (عربي)", en: "Hero Subtitle (Arabic)" },
  ctaText: { ar: "نص قسم الدعوة", en: "CTA Section Text" },
  ctaButton: { ar: "نص زر الدعوة", en: "CTA Button Text" },
  saveGeneral: { ar: "حفظ الإعدادات العامة", en: "Save General Settings" },
  contactInfo: { ar: "معلومات التواصل", en: "Contact Information" },
  contactDesc: { ar: "تظهر في صفحة تواصل معنا والتذييل", en: "Shown on the Contact Us page and footer" },
  contactEmail: { ar: "البريد الإلكتروني للتواصل", en: "Contact Email" },
  contactPhone: { ar: "هاتف التواصل", en: "Contact Phone" },
  addressAr: { ar: "العنوان (عربي)", en: "Address (Arabic)" },
  saveContact: { ar: "حفظ معلومات التواصل", en: "Save Contact Info" },
  pageContent: { ar: "محتوى الصفحات", en: "Page Content" },
  pageContentDesc: { ar: "تعديل محتوى صفحات من نحن وتواصل معنا", en: "Edit content for About Us and Contact Us pages" },
  aboutAr: { ar: "محتوى صفحة من نحن (عربي)", en: "About Us Content (Arabic)" },
  savePages: { ar: "حفظ محتوى الصفحات", en: "Save Pages Content" },
  faqMgmt: { ar: "إدارة الأسئلة الشائعة", en: "FAQ Management" },
  faqDesc: { ar: "أضف أو عدل أو احذف الأسئلة الشائعة", en: "Add, edit, or remove frequently asked questions" },
  remove: { ar: "حذف", en: "Remove" },
  questionAr: { ar: "السؤال (عربي)", en: "Question (Arabic)" },
  answerAr: { ar: "الإجابة (عربي)", en: "Answer (Arabic)" },
  addQuestion: { ar: "+ إضافة سؤال", en: "+ Add Question" },
  saveFaq: { ar: "حفظ الأسئلة", en: "Save FAQ" },
  changePassword: { ar: "تغيير كلمة مرور المسؤول", en: "Change Admin Password" },
  changePasswordDesc: { ar: "تحديث كلمة مرور حساب المسؤول العام", en: "Update the super admin account password" },
  currentPass: { ar: "كلمة المرور الحالية", en: "Current Password" },
  newPass: { ar: "كلمة المرور الجديدة", en: "New Password" },
  confirmPass: { ar: "تأكيد كلمة المرور", en: "Confirm New Password" },
  passMismatch: { ar: "كلمتا المرور غير متطابقتين", en: "Passwords do not match" },
  changePasswordBtn: { ar: "تغيير كلمة المرور", en: "Change Password" },
  passUpdated: { ar: "تم تحديث كلمة المرور", en: "Password Updated" },
  passUpdatedDesc: { ar: "تم تغيير كلمة المرور بنجاح.", en: "Your password has been changed successfully." },
  saved: { ar: "تم الحفظ!", en: "Saved!" },
  savedDesc: { ar: "تم حفظ الإعدادات بنجاح.", en: "Settings saved successfully." },
  saveFailed: { ar: "فشل حفظ الإعدادات.", en: "Failed to save settings." },
  googleOAuth: { ar: "تسجيل الدخول بجوجل", en: "Google Sign-In" },
  googleOAuthDesc: { ar: "أدخل بيانات تطبيق OAuth من Google Cloud Console لتفعيل تسجيل الدخول بجوجل في صفحات الدخول والتسجيل", en: "Enter OAuth credentials from Google Cloud Console to enable Google Sign-In on login and register pages" },
  googleClientId: { ar: "Google Client ID", en: "Google Client ID" },
  googleClientSecret: { ar: "Google Client Secret", en: "Google Client Secret" },
  googleClientIdPh: { ar: "xxxx.apps.googleusercontent.com", en: "xxxx.apps.googleusercontent.com" },
  saveGoogle: { ar: "حفظ إعدادات جوجل", en: "Save Google Settings" },
};

export default function AdminSettings() {
  const { toast: uiToast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([]);
  const [newPassword, setNewPassword] = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    smtpHost: "", smtpPort: "587", smtpSecure: "false",
    smtpUser: "", smtpPass: "", smtpFromName: "", smtpFromEmail: "",
  });
  const [smtpTestTo, setSmtpTestTo] = useState("");
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; msg: string; sentTo?: string } | null>(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const result = await api.upload.avatar(file);
      setForm(f => ({ ...f, logoUrl: result.url }));
      uiToast({ title: "تم رفع الشعار", description: "اضغط حفظ لتطبيق التغييرات." });
    } catch { uiToast({ title: "فشل رفع الشعار", variant: "destructive" }); }
    finally { setLogoUploading(false); if (logoInputRef.current) logoInputRef.current.value = ""; }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    try {
      const result = await api.upload.avatar(file);
      setForm(f => ({ ...f, faviconUrl: result.url }));
      uiToast({ title: "تم رفع الفافيكون", description: "اضغط حفظ لتطبيق التغييرات." });
    } catch { uiToast({ title: "فشل رفع الفافيكون", variant: "destructive" }); }
    finally { setFaviconUploading(false); if (faviconInputRef.current) faviconInputRef.current.value = ""; }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroImageUploading(true);
    try {
      const result = await api.upload.banner(file);
      setForm(f => ({ ...f, heroImage: result.url }));
      uiToast({ title: "تم رفع صورة الهيرو", description: "اضغط حفظ لتطبيق التغييرات." });
    } catch { uiToast({ title: "فشل رفع الصورة", variant: "destructive" }); }
    finally { setHeroImageUploading(false); if (heroImageInputRef.current) heroImageInputRef.current.value = ""; }
  };

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
  });

  useEffect(() => {
    if (settings) {
      setForm(settings);
      try {
        const parsed = JSON.parse(settings.faqContent ?? "[]");
        setFaqItems(Array.isArray(parsed) ? parsed : []);
      } catch { setFaqItems([]); }
    }
  }, [settings]);

  useEffect(() => {
    const loadSmtp = async () => {
      try {
        const res = await api.fetchJson<{ data: Record<string, string> }>("/admin/email/smtp");
        if (res.data) setSmtpForm(s => ({ ...s, ...res.data }));
      } catch {}
    };
    loadSmtp();
  }, []);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SiteSettings>) => api.settings.save(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      uiToast({ title: t("saved"), description: t("savedDesc") });
    },
    onError: () => uiToast({ title: tc("error"), description: t("saveFailed"), variant: "destructive" }),
  });

  const handleSave = (section: Partial<SiteSettings>) => saveMutation.mutate(section);
  const handleFaqSave = () => saveMutation.mutate({ faqContent: JSON.stringify(faqItems) });

  const handleChangePassword = async () => {
    if (newPassword.newPass !== newPassword.confirm) return;
    setPassLoading(true);
    try {
      await api.fetchJson("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: newPassword.current, newPassword: newPassword.newPass }),
      });
      uiToast({ title: t("passUpdated"), description: t("passUpdatedDesc") });
      setNewPassword({ current: "", newPass: "", confirm: "" });
    } catch (e: any) {
      uiToast({ title: "فشل تغيير كلمة المرور", description: e?.message ?? "تحقق من كلمة المرور الحالية", variant: "destructive" });
    } finally { setPassLoading(false); }
  };

  const handleSmtpSave = async () => {
    setSmtpLoading(true);
    try {
      await api.fetchJson("/admin/email/smtp", { method: "PUT", body: JSON.stringify(smtpForm) });
      toast.success("تم حفظ إعدادات البريد");
    } catch { toast.error("فشل حفظ إعدادات البريد"); }
    finally { setSmtpLoading(false); }
  };

  const handleSmtpTest = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await api.fetchJson<{ success: boolean; error?: string; message?: string; sentTo?: string }>(
        "/admin/email/smtp/test",
        { method: "POST", body: JSON.stringify({ testTo: smtpTestTo || smtpForm.smtpUser }) }
      );
      setSmtpTestResult({
        ok: !!res.success,
        msg: res.success
          ? (res.message ?? "تم إرسال بريد الاختبار بنجاح ✓")
          : (res.error ?? "فشل الاتصال"),
        sentTo: res.sentTo,
      });
    } catch (e: any) {
      setSmtpTestResult({ ok: false, msg: e?.message ?? "فشل الاتصال" });
    } finally { setSmtpTesting(false); }
  };

  if (isLoading) return (
    <AdminLayout title={t("pageTitle")}>
      <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
    </AdminLayout>
  );

  const search = useSearch();
  const initialTab = useMemo(() => new URLSearchParams(search).get("tab") ?? "general", [search]);

  const isMaintenance = form.maintenanceMode === "true";
  const requireApproval = form.requireProviderApproval !== "false";
  const allowRegistration = form.allowRegistration !== "false";
  const servicesEnabled = form.servicesModuleEnabled !== "false";

  const [spotlightSearch, setSpotlightSearch] = useState("");

  const { data: allPropertiesRaw = [] } = useQuery<any[]>({
    queryKey: ["admin-all-properties-spotlight"],
    queryFn: () => api.properties.list({ status: "active" }),
    staleTime: 2 * 60_000,
  });

  const filteredSpotlightProps = allPropertiesRaw.filter(p =>
    !spotlightSearch || (p.title ?? "").includes(spotlightSearch) || String(p.id).includes(spotlightSearch)
  ).slice(0, 30);

  const selectedSpotlightProp = allPropertiesRaw.find(p => String(p.id) === form.spotlightPropertyId);

  const DEFAULT_IMG_SETTINGS = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop";

  return (
    <AdminLayout title={t("pageTitle")}>
      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Globe className="w-4 h-4 me-1.5" />{t("general")}
          </TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Phone className="w-4 h-4 me-1.5" />{t("contact")}
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Share2 className="w-4 h-4 me-1.5" />{t("social")}
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 me-1.5" />{t("pages")}
          </TabsTrigger>
          <TabsTrigger value="faq" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <HelpCircle className="w-4 h-4 me-1.5" />{t("faq")}
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Search className="w-4 h-4 me-1.5" />{t("seo")}
          </TabsTrigger>
          <TabsTrigger value="smtp" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Mail className="w-4 h-4 me-1.5" />{t("smtp")}
          </TabsTrigger>
          <TabsTrigger value="platform" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield className="w-4 h-4 me-1.5" />{t("platform")}
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Lock className="w-4 h-4 me-1.5" />{t("security")}
          </TabsTrigger>
          <TabsTrigger value="google" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <KeyRound className="w-4 h-4 me-1.5" />{t("googleOAuth")}
          </TabsTrigger>
          <TabsTrigger value="spotlight" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold text-amber-600 data-[state=active]:text-amber-700">
            <Star className="w-4 h-4 me-1.5 fill-amber-400" />عقار مميز
          </TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold text-teal-700 data-[state=active]:text-teal-800">
            <CreditCard className="w-4 h-4 me-1.5" />بوابة الدفع
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">
            <Palette className="w-4 h-4 me-1.5" />{t("appearance")}
          </TabsTrigger>
          <TabsTrigger value="market" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold text-violet-700 data-[state=active]:text-violet-800">
            <TrendingUp className="w-4 h-4 me-1.5" />مؤشرات السوق
          </TabsTrigger>
          <TabsTrigger value="featured-section" className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold text-teal-700 data-[state=active]:text-teal-800">
            <BankIcon className="w-4 h-4 me-1.5" />قسم العقارات
          </TabsTrigger>
        </TabsList>

        {/* ── General ─────────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-teal-600" /> {t("generalSettings")}</CardTitle>
              <CardDescription>{t("generalDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("siteNameAr")}</Label>
                  <Input value={form.siteName ?? ""} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} placeholder="عقارات بنها" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("siteNameEn")}</Label>
                  <Input value={form.siteNameEn ?? ""} onChange={e => setForm(f => ({ ...f, siteNameEn: e.target.value }))} placeholder="Smart Lines Advanced Systems" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("hoursAr")}</Label>
                  <Input value={form.businessHours ?? ""} onChange={e => setForm(f => ({ ...f, businessHours: e.target.value }))} dir="rtl" placeholder={t("hoursPhAr")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("hoursEn")}</Label>
                  <Input value={form.businessHoursEn ?? ""} onChange={e => setForm(f => ({ ...f, businessHoursEn: e.target.value }))} placeholder={t("hoursPhEn")} dir="ltr" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("logoUrl")}</Label>
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <Input value={form.logoUrl ?? ""} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://example.com/logo.png" dir="ltr" />
                    <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                    <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed"
                      onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                      {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {logoUploading ? "جاري الرفع..." : "رفع صورة شعار"}
                    </Button>
                  </div>
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                    {form.logoUrl ? (
                      <img src={mediaUrl(form.logoUrl)} alt={t("logoAlt")} className="w-full h-full object-contain p-1"
                        onError={e => { e.currentTarget.style.display = "none"; }} />
                    ) : <ImageIcon className="w-8 h-8 text-slate-300" />}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("faviconUrl")}</Label>
                <p className="text-xs text-slate-500">{t("faviconDesc")}</p>
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <Input value={form.faviconUrl ?? ""} onChange={e => setForm(f => ({ ...f, faviconUrl: e.target.value }))} placeholder="https://example.com/favicon.png" dir="ltr" />
                    <input ref={faviconInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/x-icon,image/svg+xml" className="hidden" onChange={handleFaviconUpload} />
                    <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed"
                      onClick={() => faviconInputRef.current?.click()} disabled={faviconUploading}>
                      {faviconUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {faviconUploading ? "جاري الرفع..." : "رفع أيقونة الفافيكون"}
                    </Button>
                  </div>
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                    {form.faviconUrl ? (
                      <img src={mediaUrl(form.faviconUrl)} alt={t("faviconAlt")} className="w-full h-full object-contain p-1"
                        onError={e => { e.currentTarget.style.display = "none"; }} />
                    ) : <ImageIcon className="w-6 h-6 text-slate-300" />}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("heroImage")}</Label>
                <p className="text-xs text-slate-500">{t("heroImageDesc")}</p>
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <Input value={form.heroImage ?? ""} onChange={e => setForm(f => ({ ...f, heroImage: e.target.value }))} placeholder="https://example.com/hero.jpg" dir="ltr" />
                    <input ref={heroImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleHeroImageUpload} />
                    <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed"
                      onClick={() => heroImageInputRef.current?.click()} disabled={heroImageUploading}>
                      {heroImageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {heroImageUploading ? "جاري الرفع..." : "رفع صورة الهيرو"}
                    </Button>
                  </div>
                  <div className="w-40 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                    {form.heroImage ? (
                      <img src={mediaUrl(form.heroImage)} alt={t("heroImageAlt")} className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = "none"; }} />
                    ) : <ImageIcon className="w-8 h-8 text-slate-300" />}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("heroTitle")}</Label>
                <Input value={form.heroTitle ?? ""} onChange={e => setForm(f => ({ ...f, heroTitle: e.target.value }))} dir="rtl" placeholder="اكتشف أفضل الخدمات من أيدي محلية موثوقة" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("heroSubtitle")}</Label>
                <Textarea value={form.heroSubtitle ?? ""} onChange={e => setForm(f => ({ ...f, heroSubtitle: e.target.value }))} dir="rtl" rows={3} placeholder="سواء كنت تبحث عن طعام بيتي لذيذ، أو حرف يدوية..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("ctaText")}</Label>
                  <Input value={form.ctaText ?? ""} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))} dir="rtl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("ctaButton")}</Label>
                  <Input value={form.ctaButtonText ?? ""} onChange={e => setForm(f => ({ ...f, ctaButtonText: e.target.value }))} dir="rtl" />
                </div>
              </div>
              <Button onClick={() => handleSave({
                siteName: form.siteName, siteNameEn: form.siteNameEn,
                logoUrl: form.logoUrl, faviconUrl: form.faviconUrl, heroImage: form.heroImage,
                heroTitle: form.heroTitle, heroSubtitle: form.heroSubtitle,
                ctaText: form.ctaText, ctaButtonText: form.ctaButtonText,
                businessHours: form.businessHours, businessHoursEn: form.businessHoursEn,
              })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                {t("saveGeneral")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contact ─────────────────────────────────────────────── */}
        <TabsContent value="contact">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-teal-600" /> {t("contactInfo")}</CardTitle>
              <CardDescription>{t("contactDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("contactEmail")}</Label>
                  <Input type="email" dir="ltr" value={form.contactEmail ?? ""} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("contactPhone")}</Label>
                  <Input dir="ltr" value={form.contactPhone ?? ""} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>واتساب</Label>
                  <Input dir="ltr" value={form.contactWhatsapp ?? ""} onChange={e => setForm(f => ({ ...f, contactWhatsapp: e.target.value }))} placeholder="+201000000000" />
                </div>
                <div className="space-y-1.5">
                  <Label>فاكس</Label>
                  <Input dir="ltr" value={form.contactFax ?? ""} onChange={e => setForm(f => ({ ...f, contactFax: e.target.value }))} placeholder="+20xxxxxxxx" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("addressAr")}</Label>
                <Input value={form.contactAddress ?? ""} onChange={e => setForm(f => ({ ...f, contactAddress: e.target.value }))} dir="rtl" />
              </div>
              <div className="space-y-1.5">
                <Label>رابط خرائط جوجل</Label>
                <Input dir="ltr" value={form.googleMapsUrl ?? ""} onChange={e => setForm(f => ({ ...f, googleMapsUrl: e.target.value }))} placeholder="https://maps.google.com/..." />
              </div>
              <div className="space-y-1.5">
                <Label>ساعات العمل</Label>
                <Input value={form.workingHours ?? ""} onChange={e => setForm(f => ({ ...f, workingHours: e.target.value }))} dir="rtl" placeholder="الأحد — الخميس، من 9 صباحاً حتى 6 مساءً" />
              </div>
              <Button onClick={() => handleSave({
                contactEmail: form.contactEmail, contactPhone: form.contactPhone,
                contactWhatsapp: form.contactWhatsapp, contactFax: form.contactFax,
                contactAddress: form.contactAddress, googleMapsUrl: form.googleMapsUrl,
                workingHours: form.workingHours,
              })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                {t("saveContact")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Social Media ─────────────────────────────────────────── */}
        <TabsContent value="social">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Share2 className="w-5 h-5 text-teal-600" /> روابط التواصل الاجتماعي</CardTitle>
              <CardDescription>تظهر في التذييل وصفحة التواصل معنا</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center"><Facebook className="w-3 h-3 text-white" /></span>
                    فيسبوك
                  </Label>
                  <Input dir="ltr" value={form.socialFacebook ?? ""} onChange={e => setForm(f => ({ ...f, socialFacebook: e.target.value }))} placeholder="https://facebook.com/yourpage" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><Instagram className="w-3 h-3 text-white" /></span>
                    إنستجرام
                  </Label>
                  <Input dir="ltr" value={form.socialInstagram ?? ""} onChange={e => setForm(f => ({ ...f, socialInstagram: e.target.value }))} placeholder="https://instagram.com/yourprofile" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-sky-500 flex items-center justify-center"><Twitter className="w-3 h-3 text-white" /></span>
                    تويتر / X
                  </Label>
                  <Input dir="ltr" value={form.socialTwitter ?? ""} onChange={e => setForm(f => ({ ...f, socialTwitter: e.target.value }))} placeholder="https://twitter.com/yourhandle" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-red-600 flex items-center justify-center"><Youtube className="w-3 h-3 text-white" /></span>
                    يوتيوب
                  </Label>
                  <Input dir="ltr" value={form.socialYoutube ?? ""} onChange={e => setForm(f => ({ ...f, socialYoutube: e.target.value }))} placeholder="https://youtube.com/@yourchannel" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-black flex items-center justify-center text-white text-[10px] font-bold leading-none">TK</span>
                    تيك توك
                  </Label>
                  <Input dir="ltr" value={form.socialTiktok ?? ""} onChange={e => setForm(f => ({ ...f, socialTiktok: e.target.value }))} placeholder="https://tiktok.com/@yourprofile" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-yellow-400 flex items-center justify-center text-white text-[10px] font-bold leading-none">SC</span>
                    سناب شات
                  </Label>
                  <Input dir="ltr" value={form.socialSnapchat ?? ""} onChange={e => setForm(f => ({ ...f, socialSnapchat: e.target.value }))} placeholder="https://snapchat.com/add/yourname" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-blue-700 flex items-center justify-center"><Linkedin className="w-3 h-3 text-white" /></span>
                    لينكد إن
                  </Label>
                  <Input dir="ltr" value={form.socialLinkedin ?? ""} onChange={e => setForm(f => ({ ...f, socialLinkedin: e.target.value }))} placeholder="https://linkedin.com/company/yourco" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-green-500 flex items-center justify-center text-white text-[9px] font-bold leading-none">WA</span>
                    رابط واتساب للتواصل
                  </Label>
                  <Input dir="ltr" value={form.socialWhatsapp ?? ""} onChange={e => setForm(f => ({ ...f, socialWhatsapp: e.target.value }))} placeholder="https://wa.me/201000000000" />
                </div>
              </div>
              <Button onClick={() => handleSave({
                socialFacebook: form.socialFacebook, socialInstagram: form.socialInstagram,
                socialTwitter: form.socialTwitter, socialYoutube: form.socialYoutube,
                socialTiktok: form.socialTiktok, socialSnapchat: form.socialSnapchat,
                socialLinkedin: form.socialLinkedin, socialWhatsapp: form.socialWhatsapp,
              })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                حفظ روابط التواصل
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pages ───────────────────────────────────────────────── */}
        <TabsContent value="pages">
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> {t("pageContent")}</CardTitle>
                <CardDescription>{t("pageContentDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label>{t("aboutAr")}</Label>
                  <Textarea value={form.aboutContent ?? ""} onChange={e => setForm(f => ({ ...f, aboutContent: e.target.value }))} dir="rtl" rows={8} />
                </div>
                <Button onClick={() => handleSave({ aboutContent: form.aboutContent })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  {t("savePages")}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-teal-600" /> روابط الصفحات القانونية</CardTitle>
                <CardDescription>روابط شروط الاستخدام وسياسة الخصوصية وسياسة الاسترداد</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>رابط صفحة شروط الاستخدام</Label>
                  <Input dir="ltr" value={form.termsUrl ?? ""} onChange={e => setForm(f => ({ ...f, termsUrl: e.target.value }))} placeholder="https://example.com/terms" />
                </div>
                <div className="space-y-1.5">
                  <Label>رابط صفحة سياسة الخصوصية</Label>
                  <Input dir="ltr" value={form.privacyUrl ?? ""} onChange={e => setForm(f => ({ ...f, privacyUrl: e.target.value }))} placeholder="https://example.com/privacy" />
                </div>
                <div className="space-y-1.5">
                  <Label>رابط سياسة الاسترداد</Label>
                  <Input dir="ltr" value={form.refundUrl ?? ""} onChange={e => setForm(f => ({ ...f, refundUrl: e.target.value }))} placeholder="https://example.com/refund" />
                </div>
                <div className="space-y-1.5">
                  <Label>نص شروط الاستخدام (للصفحة الداخلية)</Label>
                  <Textarea value={form.termsContent ?? ""} onChange={e => setForm(f => ({ ...f, termsContent: e.target.value }))} dir="rtl" rows={5} placeholder="اكتب شروط الاستخدام هنا..." />
                </div>
                <div className="space-y-1.5">
                  <Label>نص سياسة الخصوصية (للصفحة الداخلية)</Label>
                  <Textarea value={form.privacyContent ?? ""} onChange={e => setForm(f => ({ ...f, privacyContent: e.target.value }))} dir="rtl" rows={5} placeholder="اكتب سياسة الخصوصية هنا..." />
                </div>
                <Button onClick={() => handleSave({
                  termsUrl: form.termsUrl, privacyUrl: form.privacyUrl, refundUrl: form.refundUrl,
                  termsContent: form.termsContent, privacyContent: form.privacyContent,
                })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  حفظ الصفحات القانونية
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <TabsContent value="faq">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-teal-600" /> {t("faqMgmt")}</CardTitle>
              <CardDescription>{t("faqDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqItems.map((item, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">Q{i + 1}</Badge>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7"
                      onClick={() => setFaqItems(items => items.filter((_, j) => j !== i))}>{t("remove")}</Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">{t("questionAr")}</Label>
                    <Input value={item.q} onChange={e => setFaqItems(items => items.map((it, j) => j === i ? { ...it, q: e.target.value } : it))} dir="rtl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">{t("answerAr")}</Label>
                    <Textarea value={item.a} onChange={e => setFaqItems(items => items.map((it, j) => j === i ? { ...it, a: e.target.value } : it))} dir="rtl" rows={2} />
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                onClick={() => setFaqItems(items => [...items, { q: "", a: "" }])}>
                {t("addQuestion")}
              </Button>
              <Button onClick={handleFaqSave} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                {t("saveFaq")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SEO & Analytics ─────────────────────────────────────── */}
        <TabsContent value="seo">
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-teal-600" /> إعدادات SEO</CardTitle>
                <CardDescription>بيانات تحسين محركات البحث تظهر في نتائج جوجل</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label>عنوان الصفحة الرئيسية (Meta Title)</Label>
                  <Input dir="rtl" value={form.metaTitle ?? ""} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))} placeholder="عقارات بنها — خدمات محلية موثوقة" />
                  <p className="text-xs text-slate-400">يُنصح بـ 50-60 حرفاً · الحالي: {(form.metaTitle ?? "").length}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>وصف الصفحة (Meta Description)</Label>
                  <Textarea dir="rtl" rows={3} value={form.metaDescription ?? ""} onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))} placeholder="منصة عقارات بنها تربطك بأفضل الوسطاء والشركات العقارية الموثوقة في بنها والقليوبية." />
                  <p className="text-xs text-slate-400">يُنصح بـ 150-160 حرفاً · الحالي: {(form.metaDescription ?? "").length}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>الكلمات المفتاحية (Keywords)</Label>
                  <Input dir="rtl" value={form.metaKeywords ?? ""} onChange={e => setForm(f => ({ ...f, metaKeywords: e.target.value }))} placeholder="خدمات منزلية، صيانة، نظافة، طعام بيتي" />
                  <p className="text-xs text-slate-400">افصل الكلمات بفاصلة</p>
                </div>
                <div className="space-y-1.5">
                  <Label>رابط صورة المشاركة (OG Image)</Label>
                  <Input dir="ltr" value={form.ogImage ?? ""} onChange={e => setForm(f => ({ ...f, ogImage: e.target.value }))} placeholder="https://example.com/og-image.jpg" />
                  <p className="text-xs text-slate-400">الصورة التي تظهر عند مشاركة الموقع على السوشيال ميديا (1200×630 بكسل)</p>
                </div>
                <div className="space-y-1.5">
                  <Label>رابط الموقع الرسمي (Canonical URL)</Label>
                  <Input dir="ltr" value={form.siteUrl ?? ""} onChange={e => setForm(f => ({ ...f, siteUrl: e.target.value }))} placeholder="https://www.aqaratbanha.com" />
                </div>
                <Button onClick={() => handleSave({
                  metaTitle: form.metaTitle, metaDescription: form.metaDescription,
                  metaKeywords: form.metaKeywords, ogImage: form.ogImage, siteUrl: form.siteUrl,
                })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  حفظ إعدادات SEO
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">GA</span>
                  أكواد التتبع والتحليلات
                </CardTitle>
                <CardDescription>Google Analytics وFacebook Pixel وGoogle Tag Manager</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-orange-400 text-white text-[9px] flex items-center justify-center font-bold">G</span>
                    Google Analytics 4 — Measurement ID
                  </Label>
                  <Input dir="ltr" value={form.gaTrackingId ?? ""} onChange={e => setForm(f => ({ ...f, gaTrackingId: e.target.value }))} placeholder="G-XXXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">FB</span>
                    Facebook Pixel ID
                  </Label>
                  <Input dir="ltr" value={form.fbPixelId ?? ""} onChange={e => setForm(f => ({ ...f, fbPixelId: e.target.value }))} placeholder="XXXXXXXXXXXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold">GT</span>
                    Google Tag Manager ID
                  </Label>
                  <Input dir="ltr" value={form.gtmId ?? ""} onChange={e => setForm(f => ({ ...f, gtmId: e.target.value }))} placeholder="GTM-XXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-green-600 text-white text-[9px] flex items-center justify-center font-bold">SC</span>
                    Google Search Console Verification Code
                  </Label>
                  <Input dir="ltr" value={form.searchConsoleVerify ?? ""} onChange={e => setForm(f => ({ ...f, searchConsoleVerify: e.target.value }))} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                </div>
                <div className="space-y-1.5">
                  <Label>كود تتبع مخصص (Custom Head Script)</Label>
                  <Textarea dir="ltr" rows={4} value={form.customHeadScript ?? ""} onChange={e => setForm(f => ({ ...f, customHeadScript: e.target.value }))} placeholder={'<script><!-- custom tracking code --></script>'} className="font-mono text-xs" />
                  <p className="text-xs text-slate-400">يُضاف في قسم &lt;head&gt; من كل صفحة</p>
                </div>
                <Button onClick={() => handleSave({
                  gaTrackingId: form.gaTrackingId, fbPixelId: form.fbPixelId,
                  gtmId: form.gtmId, searchConsoleVerify: form.searchConsoleVerify,
                  customHeadScript: form.customHeadScript,
                })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  حفظ أكواد التتبع
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SMTP ────────────────────────────────────────────────── */}
        <TabsContent value="smtp">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-teal-600" /> إعدادات خادم البريد (SMTP)</CardTitle>
                  <CardDescription className="mt-1">إعدادات إرسال البريد الإلكتروني — ترحيب، تأكيد إعلان، موافقة، رفض، بحث محفوظ</CardDescription>
                </div>
                {/* Status badge */}
                <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${smtpForm.smtpHost && smtpForm.smtpUser && smtpForm.smtpPass ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <span className={`w-2 h-2 rounded-full ${smtpForm.smtpHost && smtpForm.smtpUser && smtpForm.smtpPass ? "bg-green-500" : "bg-amber-500"}`} />
                  {smtpForm.smtpHost && smtpForm.smtpUser && smtpForm.smtpPass ? "مُضبوط" : "غير مُضبوط"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Quick-start guide */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 leading-relaxed">
                <p className="font-semibold mb-2">📧 مزودو SMTP الشائعون وإعداداتهم:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { name: "Gmail", host: "smtp.gmail.com", port: "587", note: "يتطلب App Password" },
                    { name: "Outlook / Hotmail", host: "smtp-mail.outlook.com", port: "587", note: "" },
                    { name: "SendGrid", host: "smtp.sendgrid.net", port: "587", note: "مستخدم: apikey" },
                    { name: "Mailgun", host: "smtp.mailgun.org", port: "587", note: "" },
                  ].map(p => (
                    <button key={p.name} type="button"
                      className="text-start p-2 rounded-lg bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => setSmtpForm(s => ({ ...s, smtpHost: p.host, smtpPort: p.port, smtpSecure: "false" }))}>
                      <span className="font-semibold text-blue-900">{p.name}</span>
                      <span className="text-blue-600 mx-1">—</span>
                      <span className="font-mono">{p.host}:{p.port}</span>
                      {p.note && <span className="text-blue-500 block mt-0.5">{p.note}</span>}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">💡 انقر على أي مزود لملء الخادم والمنفذ تلقائياً</p>
              </div>

              {/* Host + Port */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>خادم SMTP (Host)</Label>
                  <Input dir="ltr" value={smtpForm.smtpHost} onChange={e => setSmtpForm(s => ({ ...s, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>المنفذ (Port)</Label>
                  <Input dir="ltr" value={smtpForm.smtpPort} onChange={e => setSmtpForm(s => ({ ...s, smtpPort: e.target.value }))} placeholder="587" className="font-mono" />
                </div>
              </div>

              {/* SSL toggle */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <Switch checked={smtpForm.smtpSecure === "true"} onCheckedChange={v => setSmtpForm(s => ({ ...s, smtpSecure: v ? "true" : "false" }))} />
                <div>
                  <p className="text-sm font-semibold">استخدام SSL/TLS</p>
                  <p className="text-xs text-slate-500">فعّل للمنفذ 465 فقط — أوقفه للمنافذ 587 أو 25 (STARTTLS)</p>
                </div>
              </div>

              {/* Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اسم المستخدم (Username / Email)</Label>
                  <Input dir="ltr" value={smtpForm.smtpUser} onChange={e => setSmtpForm(s => ({ ...s, smtpUser: e.target.value }))} placeholder="your@gmail.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>كلمة المرور / App Password</Label>
                  <div className="relative">
                    <Input dir="ltr" type={showSmtpPass ? "text" : "password"} value={smtpForm.smtpPass}
                      onChange={e => setSmtpForm(s => ({ ...s, smtpPass: e.target.value }))} placeholder="••••••••••••" />
                    <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                      onClick={() => setShowSmtpPass(v => !v)}>
                      {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* From name + email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اسم المرسل (From Name)</Label>
                  <Input dir="rtl" value={smtpForm.smtpFromName} onChange={e => setSmtpForm(s => ({ ...s, smtpFromName: e.target.value }))} placeholder="عقارات بنها" />
                </div>
                <div className="space-y-1.5">
                  <Label>بريد المرسل (From Email)</Label>
                  <Input dir="ltr" value={smtpForm.smtpFromEmail} onChange={e => setSmtpForm(s => ({ ...s, smtpFromEmail: e.target.value }))} placeholder="noreply@aqaratbanha.com" />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-200 pt-5">
                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal-600" /> إرسال بريد اختبار
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-slate-500">البريد المستلم (فارغ = بريد المستخدم SMTP)</Label>
                    <Input dir="ltr" type="email" value={smtpTestTo}
                      onChange={e => setSmtpTestTo(e.target.value)}
                      placeholder={smtpForm.smtpUser || "test@example.com"} />
                  </div>
                  <Button variant="outline" onClick={handleSmtpTest}
                    disabled={smtpTesting || !smtpForm.smtpHost}
                    className="gap-2 shrink-0">
                    {smtpTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    إرسال اختبار
                  </Button>
                </div>

                {smtpTestResult && (
                  <div className={`mt-3 flex items-start gap-3 p-4 rounded-xl border text-sm ${smtpTestResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                    <div className="shrink-0 mt-0.5">
                      {smtpTestResult.ok ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-semibold">{smtpTestResult.ok ? "✅ تم الإرسال بنجاح!" : "❌ فشل الإرسال"}</p>
                      <p className="text-xs mt-0.5 opacity-80">{smtpTestResult.msg}</p>
                      {smtpTestResult.ok && smtpTestResult.sentTo && (
                        <p className="text-xs mt-1 font-mono opacity-70">أُرسل إلى: {smtpTestResult.sentTo}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSmtpSave} disabled={smtpLoading} className="bg-teal-600 hover:bg-teal-700">
                  {smtpLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  حفظ إعدادات البريد
                </Button>
                <p className="text-xs text-slate-400">احفظ الإعدادات أولاً قبل الاختبار</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Platform Rules ──────────────────────────────────────── */}
        <TabsContent value="platform">
          <div className="space-y-6">

            {/* Services Module Master Switch */}
            <Card className={`shadow-sm border-2 transition-colors ${servicesEnabled ? "border-teal-200" : "border-rose-200 bg-rose-50/30"}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">🛠️</span>
                  قسم الشركات العقارية
                </CardTitle>
                <CardDescription>
                  تشغيل أو إيقاف قسم الشركات العقارية بالكامل — التسجيل كشركة عقارية وصفحات الوسطاء
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${servicesEnabled ? "bg-teal-50 border-teal-200" : "bg-rose-50 border-rose-200"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${servicesEnabled ? "bg-teal-100" : "bg-rose-100"}`}>
                      {servicesEnabled ? "✅" : "🚫"}
                    </div>
                    <div>
                      <p className={`font-bold text-base ${servicesEnabled ? "text-teal-800" : "text-rose-800"}`}>
                        {servicesEnabled ? "قسم الشركات العقارية مفعّل" : "قسم الشركات العقارية مُوقَف"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {servicesEnabled
                          ? "الزوار يرون صفحات الوسطاء العقاريين وبإمكانهم التسجيل"
                          : "صفحات الخدمات مخفية تماماً — لن يظهر أي شيء للزوار"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={servicesEnabled}
                    onCheckedChange={v => setForm(f => ({ ...f, servicesModuleEnabled: v ? "true" : "false" }))}
                  />
                </div>

                {!servicesEnabled && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 space-y-1">
                    <p className="font-semibold">عند التعطيل سيُخفى:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>زر "سجّل شركتك" في صفحة تسجيل الدخول</li>
                      <li>أزرار التسجيل للشركات العقارية من الصفحة الرئيسية</li>
                    </ul>
                  </div>
                )}

                <Button onClick={() => handleSave({ servicesModuleEnabled: form.servicesModuleEnabled })}
                  disabled={saveMutation.isPending}
                  className={servicesEnabled ? "bg-teal-600 hover:bg-teal-700" : "bg-rose-500 hover:bg-rose-600"}>
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  حفظ إعداد قسم الشركات العقارية
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-teal-600" /> إعدادات التسجيل والموافقة</CardTitle>
                <CardDescription>التحكم في التسجيل وآلية قبول الوسطاء العقاريين</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-medium text-sm">السماح بتسجيل مستخدمين جدد</p>
                    <p className="text-xs text-slate-500 mt-0.5">عند التعطيل، لن يتمكن أحد من إنشاء حساب جديد</p>
                  </div>
                  <Switch
                    checked={allowRegistration}
                    onCheckedChange={v => setForm(f => ({ ...f, allowRegistration: v ? "true" : "false" }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-medium text-sm">مراجعة حسابات الوسطاء العقاريين</p>
                    <p className="text-xs text-slate-500 mt-0.5">يحتاج الوسطاء العقاريون موافقة الأدمن قبل الظهور في القوائم</p>
                  </div>
                  <Switch
                    checked={requireApproval}
                    onCheckedChange={v => setForm(f => ({ ...f, requireProviderApproval: v ? "true" : "false" }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>الحد الأقصى لصور الخدمة</Label>
                    <Input type="number" min="1" max="20" value={form.maxServiceImages ?? "5"} onChange={e => setForm(f => ({ ...f, maxServiceImages: e.target.value }))} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الحد الأقصى لعدد الخدمات (لكل مزود)</Label>
                    <Input type="number" min="1" value={form.maxServicesPerProvider ?? "20"} onChange={e => setForm(f => ({ ...f, maxServicesPerProvider: e.target.value }))} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الحد الأدنى لنص الخدمة (أحرف)</Label>
                    <Input type="number" min="10" value={form.minServiceDescLength ?? "50"} onChange={e => setForm(f => ({ ...f, minServiceDescLength: e.target.value }))} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>مدة انتهاء الجلسة (دقائق)</Label>
                    <Input type="number" min="15" value={form.sessionTimeoutMinutes ?? "1440"} onChange={e => setForm(f => ({ ...f, sessionTimeoutMinutes: e.target.value }))} dir="ltr" />
                  </div>
                </div>
                <Button onClick={() => handleSave({
                  allowRegistration: form.allowRegistration,
                  requireProviderApproval: form.requireProviderApproval,
                  maxServiceImages: form.maxServiceImages,
                  maxServicesPerProvider: form.maxServicesPerProvider,
                  minServiceDescLength: form.minServiceDescLength,
                  sessionTimeoutMinutes: form.sessionTimeoutMinutes,
                })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  حفظ إعدادات التسجيل
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">💰 إعدادات المالية</CardTitle>
                <CardDescription>رمز العملة والإعدادات المالية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>رمز العملة</Label>
                    <Input dir="ltr" value={form.currencySymbol ?? "ج.م"} onChange={e => setForm(f => ({ ...f, currencySymbol: e.target.value }))} placeholder="ج.م" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>اسم العملة</Label>
                    <Input dir="rtl" value={form.currencyName ?? "جنيه مصري"} onChange={e => setForm(f => ({ ...f, currencyName: e.target.value }))} placeholder="جنيه مصري" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>الحد الأدنى لمبلغ الطلب</Label>
                    <Input type="number" min="0" value={form.minOrderAmount ?? "0"} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الحد الأقصى لمبلغ الطلب</Label>
                    <Input type="number" min="0" value={form.maxOrderAmount ?? ""} onChange={e => setForm(f => ({ ...f, maxOrderAmount: e.target.value }))} dir="ltr" placeholder="بلا حد أقصى" />
                  </div>
                </div>
                <Button onClick={() => handleSave({
                  currencySymbol: form.currencySymbol, currencyName: form.currencyName,
                  minOrderAmount: form.minOrderAmount, maxOrderAmount: form.maxOrderAmount,
                })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  حفظ الإعدادات المالية
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> وضع الصيانة
                </CardTitle>
                <CardDescription>عند التفعيل، يُعرض على الزوار رسالة الصيانة بدلاً من الموقع</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${isMaintenance ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}>
                  <div>
                    <p className="font-semibold text-sm">{isMaintenance ? "⚠️ وضع الصيانة مفعّل" : "الموقع يعمل بشكل طبيعي"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{isMaintenance ? "الزوار يرون رسالة الصيانة الآن" : "فعّل لإظهار صفحة الصيانة للزوار"}</p>
                  </div>
                  <Switch
                    checked={isMaintenance}
                    onCheckedChange={v => setForm(f => ({ ...f, maintenanceMode: v ? "true" : "false" }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>رسالة الصيانة</Label>
                  <Textarea dir="rtl" rows={3} value={form.maintenanceMessage ?? ""} onChange={e => setForm(f => ({ ...f, maintenanceMessage: e.target.value }))} placeholder="نقوم حالياً بصيانة وتحديث المنصة لتقديم تجربة أفضل. سنعود قريباً! 🔧" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>وقت العودة المتوقع</Label>
                    <Input dir="ltr" value={form.maintenanceEnd ?? ""} onChange={e => setForm(f => ({ ...f, maintenanceEnd: e.target.value }))} placeholder="السبت 3:00 ص" />
                  </div>
                </div>
                <Button onClick={() => handleSave({
                  maintenanceMode: form.maintenanceMode,
                  maintenanceMessage: form.maintenanceMessage,
                  maintenanceEnd: form.maintenanceEnd,
                })} disabled={saveMutation.isPending}
                  className={isMaintenance ? "bg-amber-500 hover:bg-amber-600" : "bg-teal-600 hover:bg-teal-700"}>
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                  حفظ إعدادات الصيانة
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Security ────────────────────────────────────────────── */}
        <TabsContent value="security">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-teal-600" /> {t("changePassword")}</CardTitle>
              <CardDescription>{t("changePasswordDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label>{t("currentPass")}</Label>
                <div className="relative">
                  <Input type={showCurrentPass ? "text" : "password"} value={newPassword.current} onChange={e => setNewPassword(p => ({ ...p, current: e.target.value }))} />
                  <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowCurrentPass(v => !v)}>
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("newPass")}</Label>
                <div className="relative">
                  <Input type={showNewPass ? "text" : "password"} value={newPassword.newPass} onChange={e => setNewPassword(p => ({ ...p, newPass: e.target.value }))} />
                  <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowNewPass(v => !v)}>
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.newPass && (
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.newPass.length >= i * 3
                          ? i <= 1 ? "bg-red-400" : i === 2 ? "bg-yellow-400" : i === 3 ? "bg-blue-400" : "bg-green-500"
                          : "bg-slate-200"
                      }`} />
                    ))}
                    <span className="text-xs text-slate-400 mr-1">
                      {newPassword.newPass.length < 4 ? "ضعيفة" : newPassword.newPass.length < 8 ? "متوسطة" : newPassword.newPass.length < 12 ? "جيدة" : "قوية"}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("confirmPass")}</Label>
                <Input type="password" value={newPassword.confirm} onChange={e => setNewPassword(p => ({ ...p, confirm: e.target.value }))} />
                {newPassword.confirm && newPassword.newPass !== newPassword.confirm && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {t("passMismatch")}</p>
                )}
                {newPassword.confirm && newPassword.newPass === newPassword.confirm && newPassword.confirm.length > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> كلمتا المرور متطابقتان</p>
                )}
              </div>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                disabled={passLoading || !newPassword.current || !newPassword.newPass || newPassword.newPass !== newPassword.confirm || newPassword.newPass.length < 6}
                onClick={handleChangePassword}
              >
                {passLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Lock className="w-4 h-4 me-2" />}
                {t("changePasswordBtn")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Google OAuth ─────────────────────────────────────────── */}
        <TabsContent value="google">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-teal-600" /> {t("googleOAuth")}</CardTitle>
              <CardDescription>{t("googleOAuthDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-lg">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 leading-relaxed" dir="rtl">
                <p className="font-semibold mb-1">كيفية الحصول على المفاتيح:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>اذهب إلى <span className="font-mono">console.cloud.google.com</span></li>
                  <li>أنشئ مشروعاً جديداً أو اختر مشروعاً موجوداً</li>
                  <li>من القائمة: APIs &amp; Services → Credentials</li>
                  <li>أنشئ OAuth 2.0 Client ID من نوع Web application</li>
                  <li>أضف نطاقك في Authorized JavaScript origins</li>
                  <li>انسخ Client ID و Client Secret وألصقهما أدناه</li>
                </ol>
              </div>
              <div className="space-y-1.5">
                <Label>{t("googleClientId")}</Label>
                <Input dir="ltr" placeholder={t("googleClientIdPh")} value={form.googleClientId ?? ""} onChange={e => setForm(f => ({ ...f, googleClientId: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("googleClientSecret")}</Label>
                <Input dir="ltr" type="password" placeholder="GOCSPX-..." value={form.googleClientSecret ?? ""} onChange={e => setForm(f => ({ ...f, googleClientSecret: e.target.value }))} />
              </div>
              {form.googleClientId && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>سيظهر زر "تسجيل الدخول بجوجل" في صفحتي الدخول والتسجيل</span>
                </div>
              )}
              <Button onClick={() => handleSave({ googleClientId: form.googleClientId, googleClientSecret: form.googleClientSecret })}
                disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                {t("saveGoogle")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Spotlight Property ─────────────────────────────────── */}
        <TabsContent value="spotlight">
          <div className="space-y-5" dir="rtl">
            {/* Enable toggle */}
            <Card className="border-amber-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  قسم العقار المميز
                </CardTitle>
                <CardDescription>يظهر في منتصف الصفحة الرئيسية كعرض مميز بتصميم احترافي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Toggle */}
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800">تفعيل القسم</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.spotlightEnabled === "true" ? "القسم ظاهر في الصفحة الرئيسية" : "القسم مخفي حالياً"}
                    </p>
                  </div>
                  <Switch
                    checked={form.spotlightEnabled === "true"}
                    onCheckedChange={v => setForm(f => ({ ...f, spotlightEnabled: v ? "true" : "false" }))}
                  />
                </div>

                {/* Property picker */}
                <div className="space-y-2">
                  <Label className="font-semibold">اختر العقار المميز</Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={spotlightSearch}
                      onChange={e => setSpotlightSearch(e.target.value)}
                      placeholder="ابحث باسم العقار أو رقمه..."
                      className="w-full h-10 pr-9 pl-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary/50 bg-gray-50"
                      dir="rtl"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {filteredSpotlightProps.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-400">لا توجد عقارات مطابقة</div>
                    ) : filteredSpotlightProps.map((p: any) => {
                      const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
                      const isSelected = form.spotlightPropertyId === String(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => setForm(f => ({ ...f, spotlightPropertyId: String(p.id) }))}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${isSelected ? "bg-amber-50 border-r-2 border-amber-500" : "hover:bg-gray-50"}`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                            {imgs[0] && <img src={imgs[0]} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isSelected ? "text-amber-700" : "text-gray-800"}`}>{p.title}</p>
                            <p className="text-xs text-gray-400">{p.listingType} · {p.mainCategory} · {p.city}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected property preview */}
                {selectedSpotlightProp && (() => {
                  const p = selectedSpotlightProp as any;
                  const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
                  const priceNum = Number(p.price);
                  return (
                    <div className="border-2 border-amber-200 rounded-2xl overflow-hidden bg-amber-50/50">
                      <div className="px-4 py-2 bg-amber-100 border-b border-amber-200 flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span className="text-xs font-bold text-amber-700">معاينة العقار المختار</span>
                      </div>
                      <div className="flex gap-3 p-3">
                        <div className="w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                          {imgs[0] ? <img src={imgs[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-300" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{p.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{p.listingType} · {p.mainCategory}</p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.district, p.city].filter(Boolean).join("، ")}</p>
                          {priceNum > 0 && <p className="text-sm font-bold text-primary mt-1">{priceNum.toLocaleString("ar-EG")} جنيه</p>}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Appearance settings */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">إعدادات الشكل والنص</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">نص الشارة المميزة</Label>
                    <Input
                      value={form.spotlightBadge ?? "عرض حصري"}
                      onChange={e => setForm(f => ({ ...f, spotlightBadge: e.target.value }))}
                      placeholder="عرض حصري"
                    />
                    <p className="text-xs text-gray-400">يظهر فوق الكارت كشارة ذهبية</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">نص زر التفاصيل</Label>
                    <Input
                      value={form.spotlightCtaText ?? "عرض التفاصيل"}
                      onChange={e => setForm(f => ({ ...f, spotlightCtaText: e.target.value }))}
                      placeholder="عرض التفاصيل"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-gray-400" />
                    رابط مخصص (اختياري)
                  </Label>
                  <Input
                    dir="ltr"
                    value={form.spotlightCustomLink ?? ""}
                    onChange={e => setForm(f => ({ ...f, spotlightCustomLink: e.target.value }))}
                    placeholder="https://... أو /property/123"
                  />
                  <p className="text-xs text-gray-400">إذا تركته فارغاً سيفتح صفحة العقار تلقائياً</p>
                </div>

                {/* Direct link hint */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5">رابط الإدارة المباشر</p>
                    <p className="text-blue-600 font-mono select-all">/admin/settings?tab=spotlight</p>
                    <p className="mt-1">يمكنك حفظ هذا الرابط للوصول السريع لإعدادات العقار المميز</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => handleSave({
                spotlightEnabled: form.spotlightEnabled,
                spotlightPropertyId: form.spotlightPropertyId,
                spotlightBadge: form.spotlightBadge,
                spotlightCtaText: form.spotlightCtaText,
                spotlightCustomLink: form.spotlightCustomLink,
              })}
              disabled={saveMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ إعدادات العقار المميز
            </Button>
          </div>
        </TabsContent>

        {/* ── Payment Gateway ─────────────────────────────────────── */}
        <TabsContent value="payment">
          <div className="space-y-5">

            {/* Overview banner */}
            <div className="flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3.5">
              <CreditCard className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-teal-800 text-sm">طرق الدفع المتاحة للمعلنين</p>
                <p className="text-xs text-teal-600 mt-0.5">فعّل أو عطّل كل طريقة بشكل مستقل — الطرق المفعّلة ستظهر كتابز في صفحة الدفع</p>
              </div>
            </div>

            {/* ── Vodafone Cash ── */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className={`h-1 w-full ${form.vodafoneCashEnabled !== "false" ? "bg-red-500" : "bg-gray-200"}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">فودافون كاش</p>
                      <p className="text-xs font-normal text-gray-400">محفظة إلكترونية</p>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {form.vodafoneCashEnabled !== "false"
                      ? <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">مفعّل</span>
                      : <span className="text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">معطّل</span>}
                    <Switch
                      checked={form.vodafoneCashEnabled !== "false"}
                      onCheckedChange={v => setForm(f => ({ ...f, vodafoneCashEnabled: v ? "true" : "false" }))}
                    />
                  </div>
                </div>
              </CardHeader>
              {form.vodafoneCashEnabled !== "false" && (
                <CardContent className="pt-0 space-y-3 border-t border-gray-50">
                  <div className="grid md:grid-cols-2 gap-3 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">رقم المحفظة</Label>
                      <Input dir="ltr" value={form.vodafoneCashNumber ?? ""} onChange={e => setForm(f => ({ ...f, vodafoneCashNumber: e.target.value }))} placeholder="01001234567" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">الاسم الظاهر</Label>
                      <Input value={form.vodafoneCashName ?? ""} onChange={e => setForm(f => ({ ...f, vodafoneCashName: e.target.value }))} placeholder="عقارات بنها" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* ── Fawry ── */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className={`h-1 w-full ${form.fawryEnabled === "true" ? "bg-orange-500" : "bg-gray-200"}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">فوري</p>
                      <p className="text-xs font-normal text-gray-400">نقاط الدفع والتطبيق</p>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {form.fawryEnabled === "true"
                      ? <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">مفعّل</span>
                      : <span className="text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">معطّل</span>}
                    <Switch
                      checked={form.fawryEnabled === "true"}
                      onCheckedChange={v => setForm(f => ({ ...f, fawryEnabled: v ? "true" : "false" }))}
                    />
                  </div>
                </div>
              </CardHeader>
              {form.fawryEnabled === "true" && (
                <CardContent className="pt-0 space-y-3 border-t border-gray-50">
                  <div className="grid md:grid-cols-2 gap-3 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">كود فوري</Label>
                      <Input dir="ltr" value={form.fawryCode ?? ""} onChange={e => setForm(f => ({ ...f, fawryCode: e.target.value }))} placeholder="12345" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">اسم التاجر</Label>
                      <Input value={form.fawryMerchantName ?? ""} onChange={e => setForm(f => ({ ...f, fawryMerchantName: e.target.value }))} placeholder="عقارات بنها" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* ── InstaPay ── */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className={`h-1 w-full ${form.instaPayEnabled !== "false" ? "bg-blue-500" : "bg-gray-200"}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">انستاباي</p>
                      <p className="text-xs font-normal text-gray-400">تحويل فوري بين البنوك</p>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {form.instaPayEnabled !== "false"
                      ? <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">مفعّل</span>
                      : <span className="text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">معطّل</span>}
                    <Switch
                      checked={form.instaPayEnabled !== "false"}
                      onCheckedChange={v => setForm(f => ({ ...f, instaPayEnabled: v ? "true" : "false" }))}
                    />
                  </div>
                </div>
              </CardHeader>
              {form.instaPayEnabled !== "false" && (
                <CardContent className="pt-0 space-y-3 border-t border-gray-50">
                  <div className="grid md:grid-cols-2 gap-3 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">معرّف InstaPay (IPA)</Label>
                      <Input dir="ltr" value={form.instaPayIPA ?? ""} onChange={e => setForm(f => ({ ...f, instaPayIPA: e.target.value }))} placeholder="merchant@instapay" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">الاسم الظاهر</Label>
                      <Input value={form.instaPayName ?? ""} onChange={e => setForm(f => ({ ...f, instaPayName: e.target.value }))} placeholder="عقارات بنها" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* ── Bank Transfer ── */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className={`h-1 w-full ${form.bankTransferEnabled !== "false" ? "bg-green-500" : "bg-gray-200"}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                      <BankIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">تحويل بنكي</p>
                      <p className="text-xs font-normal text-gray-400">تحويل مباشر لحساب البنك</p>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {form.bankTransferEnabled !== "false"
                      ? <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">مفعّل</span>
                      : <span className="text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">معطّل</span>}
                    <Switch
                      checked={form.bankTransferEnabled !== "false"}
                      onCheckedChange={v => setForm(f => ({ ...f, bankTransferEnabled: v ? "true" : "false" }))}
                    />
                  </div>
                </div>
              </CardHeader>
              {form.bankTransferEnabled !== "false" && (
                <CardContent className="pt-0 space-y-3 border-t border-gray-50">
                  <div className="grid md:grid-cols-2 gap-3 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">اسم البنك</Label>
                      <Input value={form.bankName ?? ""} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="البنك الأهلي المصري" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">اسم صاحب الحساب</Label>
                      <Input value={form.bankAccountName ?? ""} onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))} placeholder="شركة عقارات بنها" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">رقم الحساب</Label>
                      <Input dir="ltr" value={form.bankAccountNumber ?? ""} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))} placeholder="1234567890" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">IBAN (اختياري)</Label>
                      <Input dir="ltr" value={form.bankIBAN ?? ""} onChange={e => setForm(f => ({ ...f, bankIBAN: e.target.value }))} placeholder="EG380019001280000000123456789" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Extra instructions */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="pt-5 space-y-1.5">
                <Label className="text-sm font-semibold">تعليمات إضافية للمعلن <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                <Input
                  value={form.paymentInstructions ?? ""}
                  onChange={e => setForm(f => ({ ...f, paymentInstructions: e.target.value }))}
                  placeholder="مثال: اكتب رقم إعلانك في ملاحظات التحويل"
                />
                <p className="text-xs text-gray-400">تظهر هذه الرسالة أسفل كل طريقة دفع في صفحة الدفع</p>
              </CardContent>
            </Card>

            <Button
              onClick={() => handleSave({
                vodafoneCashEnabled: form.vodafoneCashEnabled ?? "true",
                vodafoneCashNumber: form.vodafoneCashNumber,
                vodafoneCashName: form.vodafoneCashName,
                fawryEnabled: form.fawryEnabled ?? "false",
                fawryCode: form.fawryCode,
                fawryMerchantName: form.fawryMerchantName,
                instaPayEnabled: form.instaPayEnabled ?? "true",
                instaPayIPA: form.instaPayIPA,
                instaPayName: form.instaPayName,
                bankTransferEnabled: form.bankTransferEnabled ?? "true",
                bankName: form.bankName,
                bankAccountName: form.bankAccountName,
                bankAccountNumber: form.bankAccountNumber,
                bankIBAN: form.bankIBAN,
                paymentInstructions: form.paymentInstructions,
              })}
              disabled={saveMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ إعدادات طرق الدفع
            </Button>
          </div>
        </TabsContent>

        {/* ── Appearance ──────────────────────────────────────────── */}
        <TabsContent value="appearance">
          <AppearanceTab settings={form} />
        </TabsContent>

        {/* ── Market Analytics ──────────────────────────────────── */}
        <TabsContent value="market">
          <MarketAnalyticsSettingsTab />
        </TabsContent>

        {/* ── Featured Properties Section ──────────────────────── */}
        <TabsContent value="featured-section">
          <FeaturedSectionSettings
            form={form}
            setForm={setForm}
            handleSave={handleSave}
            saving={saveMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

// ── Market Analytics Settings Tab ──────────────────────────────────────────
function MarketAnalyticsSettingsTab() {
  const { toast: showToast } = useToast();
  const [settings, setSettings] = useState({
    marketAnalyticsEnabled: true,
    marketMinSamples: 3,
    marketWindowDays: 365,
    marketAutoRebuild: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  useEffect(() => {
    api.market.adminSettings().then((d: any) => {
      setSettings(d ?? settings);
    }).catch(() => {}).finally(() => setLoading(false));
    loadSnapshots();
  }, []);

  const loadSnapshots = () => {
    setSnapshotsLoading(true);
    api.market.snapshots().then((d: any) => setSnapshots(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setSnapshotsLoading(false));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.market.saveSettings(settings);
      showToast({ title: "✅ تم الحفظ", description: "تم حفظ إعدادات مؤشرات السوق" });
    } catch {
      showToast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      await api.market.rebuild();
      showToast({ title: "✅ تم المسح", description: "تم مسح الكاش وسيتم إعادة الحساب تلقائيًا" });
      setSnapshots([]);
    } catch {
      showToast({ title: "خطأ", description: "فشل إعادة البناء", variant: "destructive" });
    } finally { setRebuilding(false); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card className="border-violet-100 bg-violet-50/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-violet-900">إعدادات مؤشرات السوق العقاري</CardTitle>
              <CardDescription>تحكم في طريقة حساب وعرض تحليلات السوق في صفحات العقارات</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          {/* Main Settings */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                الإعدادات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-semibold text-sm">تفعيل مؤشرات السوق</p>
                  <p className="text-xs text-muted-foreground mt-0.5">إظهار قسم "مؤشرات السوق العقاري" في صفحة تفاصيل العقار</p>
                </div>
                <Switch
                  checked={settings.marketAnalyticsEnabled}
                  onCheckedChange={v => setSettings(s => ({ ...s, marketAnalyticsEnabled: v }))}
                />
              </div>

              {/* Auto Rebuild */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-semibold text-sm">تحديث تلقائي</p>
                  <p className="text-xs text-muted-foreground mt-0.5">مسح الكاش تلقائيًا عند إضافة/تعديل/حذف/اعتماد أي عقار</p>
                </div>
                <Switch
                  checked={settings.marketAutoRebuild}
                  onCheckedChange={v => setSettings(s => ({ ...s, marketAutoRebuild: v }))}
                />
              </div>

              {/* Min samples */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">الحد الأدنى للعينة (عقارات)</Label>
                <p className="text-xs text-muted-foreground">
                  الحد الأدنى لعدد العقارات المطلوبة لعرض مؤشر دقيق. إذا كانت البيانات أقل، تظهر رسالة "بيانات غير كافية".
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={20} value={settings.marketMinSamples}
                    onChange={e => setSettings(s => ({ ...s, marketMinSamples: parseInt(e.target.value) }))}
                    className="flex-1 accent-violet-600"
                  />
                  <Badge variant="outline" className="min-w-[48px] text-center font-bold text-violet-700 border-violet-200">
                    {settings.marketMinSamples}
                  </Badge>
                </div>
              </div>

              {/* Window days */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">مدة التحليل (أيام)</Label>
                <p className="text-xs text-muted-foreground">
                  النافذة الزمنية للعقارات المُدرجة في حساب المتوسطات والتحليلات.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={30} max={730} step={30} value={settings.marketWindowDays}
                    onChange={e => setSettings(s => ({ ...s, marketWindowDays: parseInt(e.target.value) }))}
                    className="flex-1 accent-violet-600"
                  />
                  <Badge variant="outline" className="min-w-[64px] text-center font-bold text-violet-700 border-violet-200">
                    {settings.marketWindowDays} يوم
                  </Badge>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>شهر</span><span>3 شهور</span><span>6 شهور</span><span>سنة</span><span>سنتان</span>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ الإعدادات
              </Button>
            </CardContent>
          </Card>

          {/* Cache Management */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-violet-600" />
                إدارة الكاش والإحصائيات
              </CardTitle>
              <CardDescription>
                البيانات تُحسب عند الطلب الأول وتُخزَّن مؤقتًا. عند تغيير العقارات، يُمسح الكاش تلقائيًا.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-800">
                  مسح الكاش يدويًا يُجبر النظام على إعادة حساب جميع الإحصائيات من الصفر عند الطلب التالي.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">لقطات محسوبة حاليًا</p>
                  <p className="text-xs text-muted-foreground">عدد مجموعات التحليل المخزنة في قاعدة البيانات</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-base font-bold px-3 py-1">
                    {snapshotsLoading ? "..." : snapshots.length}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={loadSnapshots} className="h-8 w-8 p-0">
                    <RefreshCw className={`w-4 h-4 ${snapshotsLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {snapshots.length > 0 && (
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-slate-50 text-[11px] font-semibold text-gray-500 border-b border-slate-100">
                    <span>التصنيف</span><span>المنطقة</span><span>العينة</span><span>متوسط المتر</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {snapshots.map((s: any, i: number) => (
                      <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2 text-xs">
                        <span className="font-semibold text-gray-800 truncate">{s.mainCategory}{s.subCategory ? ` / ${s.subCategory}` : ""}</span>
                        <span className="text-gray-500 truncate">{s.district ?? `مدينة ${s.cityId ?? s.regionId ?? "—"}`}</span>
                        <span className="text-gray-500">{s.sampleCount} عقار</span>
                        <span className="font-bold text-violet-700">{s.avgPricePerM2 ? `${parseFloat(s.avgPricePerM2).toLocaleString("ar-EG")} ج.م` : "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
                onClick={handleRebuild}
                disabled={rebuilding}
              >
                {rebuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                مسح الكاش وإعادة البناء
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="border-slate-200 shadow-sm bg-slate-50/50">
            <CardContent className="pt-5 space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Info className="w-4 h-4 text-violet-500" />
                كيف يعمل النظام؟
              </p>
              <ul className="space-y-2 text-xs text-gray-500 list-none">
                {[
                  "يحسب النظام تلقائيًا متوسط سعر المتر المربع من العقارات المعتمدة في نفس المنطقة والتصنيف",
                  "يحسب اتجاه الأسعار بمقارنة فترات زمنية مختلفة (شهر، 3 شهور، 6 شهور، سنة)",
                  "يحسب مستوى الطلب بناءً على عدد المشاهدات والمفضلات والعقارات المشابهة",
                  "يُخزَّن الكاش في جدول market_snapshots لتحسين الأداء",
                  "يُمسح الكاش تلقائيًا عند كل تغيير في العقارات (إضافة، تعديل، حذف، اعتماد)",
                  "إذا كانت البيانات أقل من الحد الأدنى، تظهر رسالة 'بيانات غير كافية' بدلًا من مؤشر غير دقيق",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Featured Properties Section Settings Component
   ═══════════════════════════════════════════════════════════════════ */

const PROPERTY_TYPE_OPTIONS = [
  { key: "residential", label: "عقارات سكنية",   icon: "🏘️" },
  { key: "apartment",   label: "شقق",             icon: "🏢" },
  { key: "villa",       label: "فلل",             icon: "🏡" },
  { key: "duplex",      label: "دوبلكس",          icon: "🏠" },
  { key: "commercial",  label: "عقارات تجارية",   icon: "🏪" },
  { key: "office",      label: "مكاتب إدارية",    icon: "💼" },
  { key: "shop",        label: "محلات تجارية",    icon: "🏬" },
  { key: "land",        label: "أراضي",            icon: "🌍" },
  { key: "luxury",      label: "عقارات فاخرة",    icon: "👑" },
];

const COUNT_OPTIONS = [
  { value: "4",      label: "4 عقارات" },
  { value: "8",      label: "8 عقارات" },
  { value: "12",     label: "12 عقار" },
  { value: "16",     label: "16 عقار" },
  { value: "custom", label: "عدد مخصص" },
];

const COLUMN_OPTIONS = [
  { value: "2", label: "عمودين" },
  { value: "3", label: "3 أعمدة" },
  { value: "4", label: "4 أعمدة" },
  { value: "5", label: "5 أعمدة" },
  { value: "6", label: "6 أعمدة" },
];

const SORT_OPTIONS = [
  { value: "newest",     label: "الأحدث",         icon: "🕐" },
  { value: "price_high", label: "الأعلى سعراً",   icon: "💰" },
  { value: "price_low",  label: "الأقل سعراً",    icon: "🏷️" },
  { value: "featured",   label: "المميزة أولاً",  icon: "⭐" },
  { value: "most_viewed",label: "الأكثر مشاهدة", icon: "👁️" },
];

function FeaturedSectionSettings({
  form, setForm, handleSave, saving,
}: {
  form: Partial<any>;
  setForm: React.Dispatch<React.SetStateAction<Partial<any>>>;
  handleSave: (data: Partial<any>) => void;
  saving: boolean;
}) {
  const title       = form.featuredSectionTitle    ?? "اكتشف أفضل العقارات في بنها";
  const subtitle    = form.featuredSectionSubtitle ?? "استعرض أحدث العقارات السكنية والتجارية وأفضل الفرص الاستثمارية في مدينة بنها.";
  const countSetting = form.featuredSectionCount   ?? "8";
  const customCount  = form.featuredSectionCustomCount ?? "12";
  const columns      = form.featuredSectionColumns ?? "3";
  const sort         = form.featuredSectionSort    ?? "newest";

  let selectedTypes: string[] = [];
  try {
    const raw = form.featuredSectionTypes;
    if (raw) selectedTypes = JSON.parse(raw as string);
  } catch { /* */ }
  if (!selectedTypes.length) selectedTypes = ["all"];

  const toggleType = (key: string) => {
    if (key === "all") {
      setForm(f => ({ ...f, featuredSectionTypes: JSON.stringify(["all"]) }));
      return;
    }
    let next = selectedTypes.filter(k => k !== "all");
    if (next.includes(key)) {
      next = next.filter(k => k !== key);
    } else {
      next = [...next, key];
    }
    if (!next.length) next = ["all"];
    setForm(f => ({ ...f, featuredSectionTypes: JSON.stringify(next) }));
  };

  const allSelected = selectedTypes.includes("all");

  const saveAll = () => {
    handleSave({
      featuredSectionTitle:       title,
      featuredSectionSubtitle:    subtitle,
      featuredSectionTypes:       form.featuredSectionTypes ?? JSON.stringify(["all"]),
      featuredSectionCount:       countSetting,
      featuredSectionCustomCount: customCount,
      featuredSectionColumns:     columns,
      featuredSectionSort:        sort,
    });
  };

  return (
    <div className="space-y-6">

      {/* Title / Subtitle */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BankIcon className="w-5 h-5 text-teal-600" />
            عنوان قسم العقارات المميزة
          </CardTitle>
          <CardDescription>
            يظهر في الصفحة الرئيسية فوق شبكة العقارات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">العنوان الرئيسي</Label>
            <Input
              value={title}
              onChange={e => setForm(f => ({ ...f, featuredSectionTitle: e.target.value }))}
              placeholder="اكتشف أفضل العقارات في بنها"
              className="text-right"
              dir="rtl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">الوصف الفرعي</Label>
            <Input
              value={subtitle}
              onChange={e => setForm(f => ({ ...f, featuredSectionSubtitle: e.target.value }))}
              placeholder="استعرض أحدث العقارات السكنية والتجارية..."
              className="text-right"
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Property Types */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            أنواع العقارات المعروضة
          </CardTitle>
          <CardDescription>
            اختر أنواع العقارات التي تظهر في هذا القسم — يمكن اختيار أكثر من نوع
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* All button */}
            <button
              type="button"
              onClick={() => toggleType("all")}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all ${
                allSelected
                  ? "bg-teal-50 border-teal-400 text-teal-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="text-xl">🏠</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">كل العقارات</p>
                <p className="text-[11px] text-muted-foreground">عرض جميع الأنواع</p>
              </div>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${allSelected ? "border-teal-500 bg-teal-500" : "border-slate-300"}`}>
                {allSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </button>

            {PROPERTY_TYPE_OPTIONS.map(opt => {
              const isSelected = !allSelected && selectedTypes.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleType(opt.key)}
                  disabled={allSelected}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? "bg-teal-50 border-teal-400 text-teal-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <p className="font-semibold text-sm flex-1">{opt.label}</p>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-teal-500 bg-teal-500" : "border-slate-300"}`}>
                    {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            المختار: {allSelected ? "كل العقارات" : selectedTypes.map(k => PROPERTY_TYPE_OPTIONS.find(o => o.key === k)?.label ?? k).join("، ") || "لا يوجد"}
          </p>
        </CardContent>
      </Card>

      {/* Count + Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Count */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              عدد العقارات المعروضة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {COUNT_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                countSetting === opt.value ? "bg-blue-50 border-blue-400" : "bg-white border-slate-200 hover:border-slate-300"
              }`}>
                <input
                  type="radio"
                  name="featuredCount"
                  value={opt.value}
                  checked={countSetting === opt.value}
                  onChange={() => setForm(f => ({ ...f, featuredSectionCount: opt.value }))}
                  className="accent-blue-600"
                />
                <span className={`font-semibold text-sm ${countSetting === opt.value ? "text-blue-700" : "text-slate-700"}`}>
                  {opt.label}
                </span>
              </label>
            ))}
            {countSetting === "custom" && (
              <div className="pt-2 space-y-1.5">
                <Label className="text-sm font-semibold text-slate-600">العدد المخصص</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={customCount}
                  onChange={e => setForm(f => ({ ...f, featuredSectionCustomCount: e.target.value }))}
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columns */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-500" />
              عدد الأعمدة في الصف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {COLUMN_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                columns === opt.value ? "bg-purple-50 border-purple-400" : "bg-white border-slate-200 hover:border-slate-300"
              }`}>
                <input
                  type="radio"
                  name="featuredColumns"
                  value={opt.value}
                  checked={columns === opt.value}
                  onChange={() => setForm(f => ({ ...f, featuredSectionColumns: opt.value }))}
                  className="accent-purple-600"
                />
                <span className={`font-semibold text-sm ${columns === opt.value ? "text-purple-700" : "text-slate-700"}`}>
                  {opt.label}
                </span>
                <div className={`mr-auto flex gap-0.5 ${columns === opt.value ? "opacity-100" : "opacity-30"}`}>
                  {Array.from({ length: parseInt(opt.value) }).map((_, i) => (
                    <div key={i} className="w-3 h-5 rounded-sm bg-purple-400" />
                  ))}
                </div>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Sort */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            ترتيب العقارات
          </CardTitle>
          <CardDescription>
            كيفية ترتيب العقارات المعروضة في هذا القسم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, featuredSectionSort: opt.value }))}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                  sort === opt.value
                    ? "bg-rose-50 border-rose-400 text-rose-700 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="font-semibold text-xs leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview card */}
      <Card className="border-teal-200 bg-teal-50/40 shadow-sm">
        <CardContent className="pt-5">
          <p className="text-sm font-semibold text-teal-800 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            ملخص الإعدادات الحالية
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-white rounded-xl p-3 border border-teal-100 text-center">
              <p className="text-xs text-muted-foreground mb-1">الأنواع</p>
              <p className="font-bold text-teal-700 text-xs leading-tight">
                {allSelected ? "كل الأنواع" : `${selectedTypes.length} ${selectedTypes.length === 1 ? "نوع" : "أنواع"}`}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-teal-100 text-center">
              <p className="text-xs text-muted-foreground mb-1">العدد</p>
              <p className="font-bold text-teal-700">
                {countSetting === "custom" ? customCount : countSetting} عقار
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-teal-100 text-center">
              <p className="text-xs text-muted-foreground mb-1">الأعمدة</p>
              <p className="font-bold text-teal-700">{COLUMN_OPTIONS.find(c => c.value === columns)?.label ?? columns}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-teal-100 text-center">
              <p className="text-xs text-muted-foreground mb-1">الترتيب</p>
              <p className="font-bold text-teal-700 text-xs">{SORT_OPTIONS.find(s => s.value === sort)?.label ?? sort}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveAll} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ إعدادات القسم
      </Button>
    </div>
  );
}
