import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Palette, Type, Loader2, Check, Sparkles, RefreshCw, Upload, X } from "lucide-react";
import { api, type SiteSettings } from "@/lib/api";
import { applyThemeToRoot, loadGoogleFont, loadCustomFont, isCustomFontUrl } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";

/* ─── Color utils ─────────────────────────────────────────────── */
export function hexToHsl(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "180 65% 35%";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslToHex(hsl: string): string {
  try {
    const parts = hsl.trim().split(/\s+/);
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch { return "#0d9488"; }
}

/* ─── Data ────────────────────────────────────────────────────── */
export const THEME_PRESETS = [
  { id: "teal-sand",    name: "فيروزي رملي",   emoji: "🌊", primary: "180 65% 35%", secondary: "35 50% 88%",  accent: "25 80% 60%",  preview: ["#0d9488","#f5dfc0","#f97316"] },
  { id: "royal-blue",   name: "أزرق ملكي",     emoji: "💙", primary: "220 70% 45%", secondary: "220 30% 90%", accent: "35 85% 58%",  preview: ["#2563eb","#dbeafe","#f59e0b"] },
  { id: "emerald",      name: "زمردي فاخر",    emoji: "💚", primary: "158 64% 38%", secondary: "158 35% 88%", accent: "35 85% 58%",  preview: ["#059669","#d1fae5","#f59e0b"] },
  { id: "violet",       name: "بنفسجي ملكي",   emoji: "💜", primary: "265 68% 50%", secondary: "265 35% 92%", accent: "25 85% 60%",  preview: ["#7c3aed","#ede9fe","#fb923c"] },
  { id: "rose",         name: "وردي دافئ",     emoji: "🌸", primary: "344 75% 48%", secondary: "344 40% 92%", accent: "35 90% 58%",  preview: ["#e11d48","#ffe4e6","#f59e0b"] },
  { id: "amber",        name: "ذهبي عسلي",     emoji: "🍯", primary: "38 92% 48%",  secondary: "38 60% 92%",  accent: "220 70% 50%", preview: ["#d97706","#fef3c7","#2563eb"] },
  { id: "slate",        name: "رمادي عصري",    emoji: "🔷", primary: "215 25% 35%", secondary: "215 20% 90%", accent: "180 65% 38%", preview: ["#475569","#f1f5f9","#0d9488"] },
  { id: "indigo",       name: "نيلي أنيق",     emoji: "🌌", primary: "239 68% 55%", secondary: "239 35% 92%", accent: "25 85% 60%",  preview: ["#4f46e5","#e0e7ff","#fb923c"] },
  { id: "crimson",      name: "قرمزي جريء",    emoji: "🔴", primary: "0 72% 45%",   secondary: "0 35% 92%",   accent: "35 85% 58%",  preview: ["#b91c1c","#fee2e2","#f59e0b"] },
  { id: "cyan",         name: "سماوي نقي",     emoji: "🩵", primary: "197 71% 45%", secondary: "197 40% 90%", accent: "25 85% 62%",  preview: ["#0891b2","#cffafe","#fb923c"] },
];

export const ARABIC_FONTS = [
  { value: "Tajawal",              label: "تجوال",             preview: "الخط الافتراضي الأنيق والعصري" },
  { value: "Cairo",                label: "القاهرة",           preview: "خط القاهرة المميز والجميل" },
  { value: "Almarai",              label: "المراعي",           preview: "خط المراعي الرفيع والمقروء" },
  { value: "Noto Kufi Arabic",     label: "نوتو كوفي",         preview: "خط نوتو كوفي العربي الأصيل" },
  { value: "IBM Plex Sans Arabic", label: "IBM بلكس",          preview: "خط IBM بلكس عربي التقني" },
  { value: "Changa",               label: "تشانجا",            preview: "خط تشانجا العريض الحديث" },
  { value: "El Messiri",           label: "المسيري",           preview: "خط المسيري ذو الطابع التراثي" },
  { value: "Reem Kufi",            label: "ريم كوفي",          preview: "خط ريم كوفي الهندسي الجميل" },
  { value: "Harmattan",            label: "هارماتان",          preview: "خط هارماتان الخفيف الأنيق" },
];

const RADIUS_OPTIONS = [
  { label: "مربع", value: "0.25rem", icon: "▪" },
  { label: "خفيف", value: "0.5rem",  icon: "▫" },
  { label: "متوسط", value: "0.75rem", icon: "◻" },
  { label: "دائري", value: "1rem",   icon: "⬜" },
  { label: "كامل",  value: "1.5rem", icon: "⭕" },
];

/* ─── Component ───────────────────────────────────────────────── */
type ThemeState = {
  themePreset: string;
  primaryColorHsl: string;
  secondaryColorHsl: string;
  accentColorHsl: string;
  fontFamily: string;
  borderRadius: string;
};

function getInitial(settings: Partial<SiteSettings>): ThemeState {
  return {
    themePreset:       settings.themePreset        ?? "teal-sand",
    primaryColorHsl:   settings.primaryColorHsl    ?? "180 65% 35%",
    secondaryColorHsl: settings.secondaryColorHsl  ?? "35 50% 88%",
    accentColorHsl:    settings.accentColorHsl     ?? "25 80% 60%",
    fontFamily:        settings.fontFamily         ?? "Tajawal",
    borderRadius:      settings.borderRadius       ?? "0.75rem",
  };
}

export function AppearanceTab({ settings }: { settings: Partial<SiteSettings> }) {
  const { toast } = useToast();
  const [theme, setTheme] = useState<ThemeState>(() => getInitial(settings));
  const [saving, setSaving] = useState(false);
  const [liveApplied, setLiveApplied] = useState(false);
  const [fontUploading, setFontUploading] = useState(false);
  const [customFontName, setCustomFontName] = useState<string | null>(() => {
    const f = settings.fontFamily;
    return f && isCustomFontUrl(f) ? f.split("/").pop() ?? "خط مخصص" : null;
  });
  const fontInputRef = useRef<HTMLInputElement>(null);

  const applyLive = useCallback((t: ThemeState) => {
    applyThemeToRoot(t as unknown as Record<string, string>);
    if (!isCustomFontUrl(t.fontFamily)) loadGoogleFont(t.fontFamily);
    setLiveApplied(true);
    setTimeout(() => setLiveApplied(false), 1500);
  }, []);

  const handleFontUpload = async (file: File) => {
    setFontUploading(true);
    try {
      const fd = new FormData();
      fd.append("font", file);
      const res = await fetch("/upload/font", { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "فشل الرفع");
      const url: string = json.data.url;
      const name: string = json.data.originalName ?? file.name;
      loadCustomFont(url);
      setCustomFontName(name);
      updateTheme({ fontFamily: url });
      toast({ title: "✅ تم رفع الخط", description: `تم تطبيق "${name}" على الموقع` });
    } catch (e: any) {
      toast({ title: "فشل رفع الخط", description: e.message, variant: "destructive" });
    } finally {
      setFontUploading(false);
    }
  };

  const updateTheme = (patch: Partial<ThemeState>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    applyLive(next);
  };

  const pickPreset = (p: typeof THEME_PRESETS[0]) => {
    updateTheme({
      themePreset: p.id,
      primaryColorHsl: p.primary,
      secondaryColorHsl: p.secondary,
      accentColorHsl: p.accent,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.settings.save(theme as unknown as Partial<SiteSettings>);
      toast({ title: "✅ تم حفظ الثيم", description: "التغييرات مطبّقة الآن على الموقع بالكامل." });
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaults = getInitial({});
    setTheme(defaults);
    applyLive(defaults);
  };

  const primaryHex   = hslToHex(theme.primaryColorHsl);
  const secondaryHex = hslToHex(theme.secondaryColorHsl);
  const accentHex    = hslToHex(theme.accentColorHsl);

  return (
    <div className="space-y-8" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">المظهر والتصميم</h2>
            <p className="text-sm text-slate-500">يُطبَّق فورياً على الموقع كله</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
            <RefreshCw className="w-3.5 h-3.5" /> إعادة تعيين
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 gap-1.5 shadow-sm shadow-primary/30"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الثيم
          </Button>
        </div>
      </div>

      {/* ── Live indicator ── */}
      {liveApplied && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          تم تطبيق التغييرات على الموقع مباشرةً
        </div>
      )}

      {/* ── Presets Grid ── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 bg-gradient-to-l from-slate-50 to-white border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            الثيمات الجاهزة
          </CardTitle>
          <CardDescription>اختر ثيماً جاهزاً وسيُطبَّق فورياً على الموقع</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {THEME_PRESETS.map(p => {
              const active = theme.themePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => pickPreset(p)}
                  className={`relative group rounded-2xl p-3 border-2 transition-all duration-200 text-right hover:shadow-md hover:-translate-y-0.5 ${
                    active
                      ? "border-primary shadow-md shadow-primary/20 bg-primary/5"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {active && (
                    <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                  {/* Color swatches */}
                  <div className="flex gap-1 mb-2.5">
                    {p.preview.map((c, i) => (
                      <div
                        key={i}
                        className="flex-1 h-8 rounded-lg shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-bold text-slate-800">{p.emoji} {p.name}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Custom Colors ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary" />
            ألوان مخصصة
          </CardTitle>
          <CardDescription>خصّص الألوان يدوياً — التغييرات تُطبَّق فورياً</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Primary */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: primaryHex }} />
                اللون الرئيسي
              </Label>
              <div className="relative group cursor-pointer">
                <div
                  className="w-full h-20 rounded-2xl shadow-sm border-2 border-white ring-2 ring-slate-200 group-hover:ring-primary transition-all"
                  style={{ background: `linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}aa 100%)` }}
                />
                <input
                  type="color"
                  value={primaryHex}
                  onChange={e => {
                    const hsl = hexToHsl(e.target.value);
                    updateTheme({ primaryColorHsl: hsl, themePreset: "custom" });
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-mono">
                  {primaryHex}
                </div>
              </div>
              <p className="text-xs text-slate-400">الأزرار، الروابط، الحدود النشطة</p>
            </div>

            {/* Secondary */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: secondaryHex }} />
                اللون الثانوي
              </Label>
              <div className="relative group cursor-pointer">
                <div
                  className="w-full h-20 rounded-2xl shadow-sm border-2 border-white ring-2 ring-slate-200 group-hover:ring-primary transition-all"
                  style={{ background: `linear-gradient(135deg, ${secondaryHex} 0%, ${secondaryHex}cc 100%)` }}
                />
                <input
                  type="color"
                  value={secondaryHex}
                  onChange={e => {
                    const hsl = hexToHsl(e.target.value);
                    updateTheme({ secondaryColorHsl: hsl, themePreset: "custom" });
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-mono">
                  {secondaryHex}
                </div>
              </div>
              <p className="text-xs text-slate-400">الخلفيات، الشارات، العناصر الثانوية</p>
            </div>

            {/* Accent */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: accentHex }} />
                لون التمييز
              </Label>
              <div className="relative group cursor-pointer">
                <div
                  className="w-full h-20 rounded-2xl shadow-sm border-2 border-white ring-2 ring-slate-200 group-hover:ring-primary transition-all"
                  style={{ background: `linear-gradient(135deg, ${accentHex} 0%, ${accentHex}aa 100%)` }}
                />
                <input
                  type="color"
                  value={accentHex}
                  onChange={e => {
                    const hsl = hexToHsl(e.target.value);
                    updateTheme({ accentColorHsl: hsl, themePreset: "custom" });
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-mono">
                  {accentHex}
                </div>
              </div>
              <p className="text-xs text-slate-400">الإبرازات، الشارات، عناصر الاهتمام</p>
            </div>
          </div>

          {/* Live Preview Strip */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500 mb-3 font-medium">معاينة مباشرة</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm" style={{ backgroundColor: primaryHex }}>
                زر رئيسي
              </button>
              <button className="px-4 py-2 rounded-xl text-sm font-semibold border-2" style={{ borderColor: primaryHex, color: primaryHex, backgroundColor: secondaryHex }}>
                زر ثانوي
              </button>
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: accentHex }}>
                شارة
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: secondaryHex, color: primaryHex }}>
                تمييز
              </span>
              <a href="#" className="text-sm font-semibold underline" style={{ color: primaryHex }} onClick={e => e.preventDefault()}>
                رابط نص
              </a>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm" style={{ backgroundColor: primaryHex }}>✓</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Font Selector ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            نوع الخط
          </CardTitle>
          <CardDescription>اختر خطاً جاهزاً أو ارفع خطاً مخصصاً — يُطبَّق على كل النصوص العربية</CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {/* Built-in Google Fonts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ARABIC_FONTS.map(font => {
              const active = theme.fontFamily === font.value;
              return (
                <button
                  key={font.value}
                  onClick={() => {
                    loadGoogleFont(font.value);
                    setCustomFontName(null);
                    updateTheme({ fontFamily: font.value });
                  }}
                  className={`relative p-4 rounded-2xl border-2 text-right transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                    active
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/15"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {active && (
                    <span className="absolute top-3 left-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <p
                    className="text-lg font-bold text-slate-900 mb-1 leading-tight"
                    style={{ fontFamily: `'${font.value}', sans-serif` }}
                  >
                    {font.preview}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: active ? primaryHex : "#94a3b8" }}>
                    {font.label} ({font.value})
                  </p>
                </button>
              );
            })}
          </div>

          {/* Custom font upload */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              رفع خط مخصص (TTF / OTF / WOFF / WOFF2)
            </p>

            {/* Active custom font indicator */}
            {customFontName && isCustomFontUrl(theme.fontFamily) && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary flex-1 truncate">{customFontName}</span>
                <button
                  onClick={() => {
                    setCustomFontName(null);
                    updateTheme({ fontFamily: "Tajawal" });
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="إزالة الخط المخصص"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Drop zone / upload button */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5 ${
                isCustomFontUrl(theme.fontFamily) ? "border-primary/40 bg-primary/5" : "border-slate-200"
              }`}
              onClick={() => fontInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFontUpload(file);
              }}
            >
              <input
                ref={fontInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFontUpload(file);
                  e.target.value = "";
                }}
              />
              {fontUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-slate-500">جارٍ رفع الخط...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">اضغط لرفع خط أو اسحب الملف هنا</p>
                  <p className="text-xs text-slate-400">يدعم TTF، OTF، WOFF، WOFF2 — حجم أقصى 5 ميغا</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Border Radius ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-base">استدارة الزوايا</CardTitle>
          <CardDescription>تحكم في مدى دورانية الأزرار والبطاقات والعناصر</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-5 gap-3">
            {RADIUS_OPTIONS.map(opt => {
              const active = theme.borderRadius === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateTheme({ borderRadius: opt.value })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/15"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className="w-10 h-10 border-2 flex items-center justify-center text-sm font-bold"
                    style={{
                      borderColor: active ? primaryHex : "#cbd5e1",
                      borderRadius: opt.value,
                      backgroundColor: active ? `${primaryHex}20` : "transparent",
                      color: active ? primaryHex : "#94a3b8",
                    }}
                  >
                    {opt.icon}
                  </div>
                  <p className={`text-xs font-semibold ${active ? "text-primary" : "text-slate-500"}`}>{opt.label}</p>
                </button>
              );
            })}
          </div>

          {/* Radius preview */}
          <div className="mt-5 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex-wrap">
            <span className="text-sm text-slate-500 font-medium shrink-0">معاينة:</span>
            <button
              className="px-4 py-2 text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: primaryHex, borderRadius: theme.borderRadius }}
            >
              زر رئيسي
            </button>
            <div
              className="px-4 py-2 text-sm font-semibold border-2"
              style={{ borderColor: primaryHex, color: primaryHex, borderRadius: theme.borderRadius, backgroundColor: secondaryHex }}
            >
              بطاقة / مدخل
            </div>
            <span
              className="px-3 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: accentHex, borderRadius: theme.borderRadius }}
            >
              شارة
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Save Row ── */}
      <div className="flex items-center justify-between p-5 bg-gradient-to-l from-primary/5 to-transparent rounded-2xl border border-primary/20">
        <div>
          <p className="font-bold text-slate-900">حفظ في قاعدة البيانات</p>
          <p className="text-sm text-slate-500 mt-0.5">الثيم مطبَّق مباشرةً الآن — احفظه ليظل دائماً حتى بعد إعادة التحميل</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 gap-2 shadow-md shadow-primary/30 text-base px-6 py-5"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? "جارٍ الحفظ..." : "حفظ الثيم نهائياً"}
        </Button>
      </div>

    </div>
  );
}

export default AppearanceTab;
