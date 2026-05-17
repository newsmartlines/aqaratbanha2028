import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, mediaUrl, type SiteSettings } from "@/lib/api";
import { Save, Globe, Phone, FileText, HelpCircle, Lock, Loader2, CheckCircle2, Upload, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useT, commonDict } from "@/lib/i18n";

const dict = {
  pageTitle: { ar: "إعدادات المنصة", en: "Platform Settings" },
  general: { ar: "عام", en: "General" },
  contact: { ar: "التواصل", en: "Contact" },
  pages: { ar: "محتوى الصفحات", en: "Pages Content" },
  faq: { ar: "الأسئلة الشائعة", en: "FAQ" },
  security: { ar: "الأمان", en: "Security" },
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
};

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([]);
  const [newPassword, setNewPassword] = useState({ current: "", newPass: "", confirm: "" });
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
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
      toast({ title: "تم رفع الشعار", description: "تم رفع الشعار بنجاح، اضغط حفظ لتطبيق التغييرات." });
    } catch {
      toast({ title: "فشل رفع الشعار", variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    try {
      const result = await api.upload.avatar(file);
      setForm(f => ({ ...f, faviconUrl: result.url }));
      toast({ title: "تم رفع الفافيكون", description: "تم الرفع بنجاح، اضغط حفظ لتطبيق التغييرات." });
    } catch {
      toast({ title: "فشل رفع الفافيكون", variant: "destructive" });
    } finally {
      setFaviconUploading(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroImageUploading(true);
    try {
      const result = await api.upload.banner(file);
      setForm(f => ({ ...f, heroImage: result.url }));
      toast({ title: "تم رفع صورة الهيرو", description: "تم الرفع بنجاح، اضغط حفظ لتطبيق التغييرات." });
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setHeroImageUploading(false);
      if (heroImageInputRef.current) heroImageInputRef.current.value = "";
    }
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
      } catch {
        setFaqItems([]);
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SiteSettings>) => api.settings.save(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: t("saved"), description: t("savedDesc") });
    },
    onError: () => toast({ title: tc("error"), description: t("saveFailed"), variant: "destructive" }),
  });

  const handleSave = (section: Partial<SiteSettings>) => saveMutation.mutate(section);
  const handleFaqSave = () => saveMutation.mutate({ faqContent: JSON.stringify(faqItems) });

  if (isLoading) return (
    <AdminLayout title={t("pageTitle")}>
      <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title={t("pageTitle")}>
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 flex-wrap h-auto">
          <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Globe className="w-4 h-4 me-2" />{t("general")}
          </TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Phone className="w-4 h-4 me-2" />{t("contact")}
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 me-2" />{t("pages")}
          </TabsTrigger>
          <TabsTrigger value="faq" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <HelpCircle className="w-4 h-4 me-2" />{t("faq")}
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Lock className="w-4 h-4 me-2" />{t("security")}
          </TabsTrigger>
        </TabsList>

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
                  <Input value={form.siteName ?? ""} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} placeholder="سمارت لاينز للنظم المتطورة" />
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
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
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
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
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
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
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
                logoUrl: form.logoUrl, faviconUrl: form.faviconUrl,
                heroImage: form.heroImage,
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

        <TabsContent value="contact">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-teal-600" /> {t("contactInfo")}</CardTitle>
              <CardDescription>{t("contactDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>{t("contactEmail")}</Label>
                <Input type="email" dir="ltr" value={form.contactEmail ?? ""} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("contactPhone")}</Label>
                <Input dir="ltr" value={form.contactPhone ?? ""} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>واتساب</Label>
                <Input dir="ltr" value={form.contactWhatsapp ?? ""} onChange={e => setForm(f => ({ ...f, contactWhatsapp: e.target.value }))} placeholder="+966500000000" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("addressAr")}</Label>
                <Input value={form.contactAddress ?? ""} onChange={e => setForm(f => ({ ...f, contactAddress: e.target.value }))} dir="rtl" />
              </div>
              <div className="space-y-1.5">
                <Label>ساعات العمل</Label>
                <Input value={form.workingHours ?? ""} onChange={e => setForm(f => ({ ...f, workingHours: e.target.value }))} dir="rtl" placeholder="الأحد — الخميس، من 9 صباحاً حتى 6 مساءً" />
              </div>
              <Button onClick={() => handleSave({ contactEmail: form.contactEmail, contactPhone: form.contactPhone, contactWhatsapp: form.contactWhatsapp, contactAddress: form.contactAddress, workingHours: form.workingHours })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                {t("saveContact")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
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
        </TabsContent>

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

        <TabsContent value="security">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-teal-600" /> {t("changePassword")}</CardTitle>
              <CardDescription>{t("changePasswordDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label>{t("currentPass")}</Label>
                <Input type="password" value={newPassword.current} onChange={e => setNewPassword(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("newPass")}</Label>
                <Input type="password" value={newPassword.newPass} onChange={e => setNewPassword(p => ({ ...p, newPass: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("confirmPass")}</Label>
                <Input type="password" value={newPassword.confirm} onChange={e => setNewPassword(p => ({ ...p, confirm: e.target.value }))} />
                {newPassword.confirm && newPassword.newPass !== newPassword.confirm && (
                  <p className="text-xs text-red-500">{t("passMismatch")}</p>
                )}
              </div>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                disabled={!newPassword.current || !newPassword.newPass || newPassword.newPass !== newPassword.confirm}
                onClick={() => {
                  toast({ title: t("passUpdated"), description: t("passUpdatedDesc") });
                  setNewPassword({ current: "", newPass: "", confirm: "" });
                }}
              >
                <Lock className="w-4 h-4 me-2" />{t("changePasswordBtn")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
