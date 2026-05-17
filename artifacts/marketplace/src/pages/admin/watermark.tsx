import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Type, ImageIcon, Download, Save, RotateCcw, Upload, CheckCircle2,
  AlignCenter, AlignLeft, AlignRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ─── */
type Position =
  | "top-right" | "top-center" | "top-left"
  | "middle-right" | "center" | "middle-left"
  | "bottom-right" | "bottom-center" | "bottom-left";

interface WatermarkSettings {
  enabled: boolean;
  type: "text" | "image";
  text: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  imageUrl: string;
  position: Position;
  opacity: number;
  scale: number;
  padding: number;
  repeat: boolean;
}

const DEFAULT: WatermarkSettings = {
  enabled: true,
  type: "text",
  text: "دليل بلس",
  textColor: "#ffffff",
  fontSize: 32,
  fontFamily: "Tajawal, Arial",
  imageUrl: "",
  position: "bottom-right",
  opacity: 60,
  scale: 30,
  padding: 20,
  repeat: false,
};

const POSITIONS: { key: Position; label: string }[] = [
  { key: "top-right",     label: "أعلى يمين" },
  { key: "top-center",    label: "أعلى وسط" },
  { key: "top-left",      label: "أعلى يسار" },
  { key: "middle-right",  label: "وسط يمين" },
  { key: "center",        label: "المنتصف" },
  { key: "middle-left",   label: "وسط يسار" },
  { key: "bottom-right",  label: "أسفل يمين" },
  { key: "bottom-center", label: "أسفل وسط" },
  { key: "bottom-left",   label: "أسفل يسار" },
];

const FONTS = [
  { value: "Tajawal, Arial",   label: "Tajawal" },
  { value: "Cairo, Arial",     label: "Cairo" },
  { value: "Arial",            label: "Arial" },
  { value: "Georgia",          label: "Georgia" },
  { value: "Courier New",      label: "Courier New" },
];

const STORAGE_KEY = "daleel_watermark_settings";
const SAMPLE_IMG = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=70";

/* ─── Helper: compute (x,y) from position + padding ─── */
function getXY(pos: Position, cw: number, ch: number, ww: number, wh: number, pad: number) {
  const map: Record<Position, [number, number]> = {
    "top-right":     [cw - ww - pad,        pad],
    "top-center":    [(cw - ww) / 2,        pad],
    "top-left":      [pad,                  pad],
    "middle-right":  [cw - ww - pad,        (ch - wh) / 2],
    "center":        [(cw - ww) / 2,        (ch - wh) / 2],
    "middle-left":   [pad,                  (ch - wh) / 2],
    "bottom-right":  [cw - ww - pad,        ch - wh - pad],
    "bottom-center": [(cw - ww) / 2,        ch - wh - pad],
    "bottom-left":   [pad,                  ch - wh - pad],
  };
  return map[pos];
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function AdminWatermark() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WatermarkSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT, ...JSON.parse(stored) } : DEFAULT;
    } catch { return DEFAULT; }
  });
  const [saved, setSaved] = useState(false);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const wmImgRef    = useRef<HTMLImageElement | null>(null);
  const sampleRef   = useRef<HTMLImageElement | null>(null);

  const upd = <K extends keyof WatermarkSettings>(k: K, v: WatermarkSettings[K]) =>
    setSettings(p => ({ ...p, [k]: v }));

  /* ─── Load sample image once ─── */
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = SAMPLE_IMG;
    img.onload = () => { sampleRef.current = img; drawCanvas(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Draw watermark on canvas ─── */
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const sample = sampleRef.current;
    if (!canvas || !sample) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CW = canvas.width;
    const CH = canvas.height;
    ctx.clearRect(0, 0, CW, CH);
    ctx.drawImage(sample, 0, 0, CW, CH);

    if (!settings.enabled) return;

    ctx.globalAlpha = settings.opacity / 100;

    if (settings.type === "text" && settings.text.trim()) {
      const fs = settings.fontSize;
      ctx.font = `bold ${fs}px ${settings.fontFamily}`;
      ctx.textBaseline = "top";
      ctx.direction = "rtl";
      const metrics = ctx.measureText(settings.text);
      const tw = metrics.width;
      const th = fs * 1.2;

      const drawText = (x: number, y: number) => {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 6;
        ctx.fillStyle = settings.textColor;
        ctx.fillText(settings.text, x + tw, y);
        ctx.shadowBlur = 0;
      };

      if (settings.repeat) {
        const gapX = tw + 80;
        const gapY = th + 60;
        for (let ry = -gapY; ry < CH + gapY; ry += gapY) {
          for (let rx = -gapX; rx < CW + gapX; rx += gapX) {
            ctx.save();
            ctx.translate(rx + tw / 2, ry + th / 2);
            ctx.rotate(-Math.PI / 6);
            ctx.fillStyle = settings.textColor;
            ctx.fillText(settings.text, 0, 0);
            ctx.restore();
          }
        }
      } else {
        const [x, y] = getXY(settings.position, CW, CH, tw, th, settings.padding);
        drawText(x, y);
      }
    } else if (settings.type === "image" && wmImgRef.current) {
      const wimg = wmImgRef.current;
      const scale = settings.scale / 100;
      const ww = wimg.naturalWidth * scale;
      const wh = wimg.naturalHeight * scale;
      if (settings.repeat) {
        const gapX = ww + 60;
        const gapY = wh + 60;
        for (let ry = 0; ry < CH; ry += gapY) {
          for (let rx = 0; rx < CW; rx += gapX) {
            ctx.drawImage(wimg, rx, ry, ww, wh);
          }
        }
      } else {
        const [x, y] = getXY(settings.position, CW, CH, ww, wh, settings.padding);
        ctx.drawImage(wimg, x, y, ww, wh);
      }
    }

    ctx.globalAlpha = 1;
  }, [settings]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  /* ─── Handle watermark image upload ─── */
  const handleWmImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      upd("imageUrl", url);
      const img = new Image();
      img.onload = () => { wmImgRef.current = img; drawCanvas(); };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  /* ─── Save ─── */
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    toast({ title: "تم الحفظ", description: "تم حفظ إعدادات العلامة المائية بنجاح ✓" });
  };

  /* ─── Reset ─── */
  const handleReset = () => {
    setSettings(DEFAULT);
    wmImgRef.current = null;
    toast({ title: "تم الاستعادة", description: "تم استعادة الإعدادات الافتراضية" });
  };

  /* ─── Download preview ─── */
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "watermark-preview.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  };

  return (
    <AdminLayout>
      <div dir="rtl" className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              🖼️ العلامة المائية
            </h1>
            <p className="text-slate-500 text-sm mt-1">تحكم كامل في العلامة المائية التي تُطبَّق تلقائياً على صور العقارات</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="w-4 h-4" /> استعادة
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="w-4 h-4" /> تحميل المعاينة
            </Button>
            <Button onClick={handleSave} size="sm" className={`gap-1.5 ${saved ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "تم الحفظ!" : "حفظ الإعدادات"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── Left panel: settings ── */}
          <div className="space-y-5">

            {/* Enable toggle */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">تفعيل العلامة المائية</p>
                    <p className="text-slate-500 text-xs mt-0.5">عند التفعيل ستُطبَّق العلامة على كل صور العقارات المرفوعة</p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={v => upd("enabled", v)}
                  />
                </div>
                {settings.enabled && (
                  <div className="mt-4 flex items-center gap-3">
                    <Switch
                      checked={settings.repeat}
                      onCheckedChange={v => upd("repeat", v)}
                    />
                    <Label className="text-sm text-slate-700 cursor-pointer" onClick={() => upd("repeat", !settings.repeat)}>
                      تكرار العلامة (نمط مائي على كامل الصورة)
                    </Label>
                  </div>
                )}
              </CardContent>
            </Card>

            {settings.enabled && (
              <>
                {/* Type tabs */}
                <Card>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-base">نوع العلامة المائية</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Tabs value={settings.type} onValueChange={v => upd("type", v as "text" | "image")}>
                      <TabsList className="w-full mb-4">
                        <TabsTrigger value="text"  className="flex-1 gap-1.5"><Type className="w-4 h-4" /> نص</TabsTrigger>
                        <TabsTrigger value="image" className="flex-1 gap-1.5"><ImageIcon className="w-4 h-4" /> صورة</TabsTrigger>
                      </TabsList>

                      {/* TEXT settings */}
                      <TabsContent value="text" className="space-y-4 mt-0">
                        <div>
                          <Label className="text-sm font-semibold mb-1.5 block">نص العلامة المائية</Label>
                          <Input
                            value={settings.text}
                            onChange={e => upd("text", e.target.value)}
                            placeholder="مثال: دليل بلس العقارات"
                            className="text-right"
                            maxLength={60}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-semibold mb-1.5 block">لون النص</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={settings.textColor}
                                onChange={e => upd("textColor", e.target.value)}
                                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                              />
                              <Input
                                value={settings.textColor}
                                onChange={e => upd("textColor", e.target.value)}
                                className="font-mono text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold mb-1.5 block">نوع الخط</Label>
                            <select
                              value={settings.fontFamily}
                              onChange={e => upd("fontFamily", e.target.value)}
                              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-sm font-semibold">حجم الخط</Label>
                            <Badge variant="secondary">{settings.fontSize}px</Badge>
                          </div>
                          <Slider
                            value={[settings.fontSize]}
                            min={12} max={80} step={1}
                            onValueChange={([v]) => upd("fontSize", v)}
                            className="mt-1"
                          />
                        </div>
                      </TabsContent>

                      {/* IMAGE settings */}
                      <TabsContent value="image" className="space-y-4 mt-0">
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">صورة العلامة المائية</Label>
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleWmImage} />
                          <div
                            onClick={() => fileRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${settings.imageUrl ? "border-primary/40 bg-primary/5" : "border-gray-300 hover:border-primary/40 hover:bg-gray-50"}`}
                          >
                            {settings.imageUrl ? (
                              <div className="space-y-2">
                                <img src={settings.imageUrl} alt="wm" className="h-20 mx-auto object-contain rounded" />
                                <p className="text-primary text-sm font-semibold">انقر لتغيير الصورة</p>
                              </div>
                            ) : (
                              <div className="space-y-2 text-gray-400">
                                <Upload className="w-8 h-8 mx-auto" />
                                <p className="text-sm font-medium">انقر لرفع شعار أو صورة</p>
                                <p className="text-xs">PNG بخلفية شفافة يُنصح به • الحد الأقصى 5MB</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-sm font-semibold">حجم الصورة</Label>
                            <Badge variant="secondary">{settings.scale}%</Badge>
                          </div>
                          <Slider
                            value={[settings.scale]}
                            min={5} max={80} step={1}
                            onValueChange={([v]) => upd("scale", v)}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Position & style */}
                <Card>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-base">الموضع والمظهر</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-5">
                    {/* 3×3 position grid */}
                    {!settings.repeat && (
                      <div>
                        <Label className="text-sm font-semibold mb-3 block">موضع العلامة على الصورة</Label>
                        <div className="grid grid-cols-3 gap-2 max-w-xs">
                          {POSITIONS.map(p => (
                            <button
                              key={p.key}
                              onClick={() => upd("position", p.key)}
                              className={`py-2.5 px-1 rounded-xl text-xs font-semibold border-2 transition-all ${
                                settings.position === p.key
                                  ? "border-primary bg-primary text-white shadow-md"
                                  : "border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary bg-white"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Opacity */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-sm font-semibold">الشفافية</Label>
                        <Badge variant="secondary">{settings.opacity}%</Badge>
                      </div>
                      <Slider
                        value={[settings.opacity]}
                        min={5} max={100} step={1}
                        onValueChange={([v]) => upd("opacity", v)}
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>شفاف جداً</span>
                        <span>معتم تماماً</span>
                      </div>
                    </div>

                    {/* Padding */}
                    {!settings.repeat && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-sm font-semibold">المسافة من الحافة</Label>
                          <Badge variant="secondary">{settings.padding}px</Badge>
                        </div>
                        <Slider
                          value={[settings.padding]}
                          min={5} max={100} step={1}
                          onValueChange={([v]) => upd("padding", v)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* ── Right panel: live preview ── */}
          <div className="space-y-4">
            <Card className="sticky top-6">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">معاينة مباشرة</CardTitle>
                  <Badge className={settings.enabled ? "bg-emerald-500" : "bg-gray-400"}>
                    {settings.enabled ? "مفعّل" : "معطّل"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">هكذا ستبدو الصورة بعد رفعها مع العلامة المائية</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={520}
                    className="w-full h-auto"
                  />
                  {!sampleRef.current && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      جاري تحميل المعاينة...
                    </div>
                  )}
                </div>

                {/* Settings summary */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "النوع",        value: settings.type === "text" ? "نص" : "صورة" },
                    { label: "الموضع",       value: settings.repeat ? "نمط متكرر" : POSITIONS.find(p => p.key === settings.position)?.label ?? "" },
                    { label: "الشفافية",     value: `${settings.opacity}%` },
                    { label: "الحالة",       value: settings.enabled ? "مفعّل" : "معطّل" },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg px-3 py-2 flex justify-between items-center border border-gray-100">
                      <span className="text-gray-500">{s.label}</span>
                      <span className="font-bold text-gray-800">{s.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed">
                  <strong>ملاحظة:</strong> سيتم تطبيق العلامة المائية تلقائياً على جميع صور العقارات الجديدة عند رفعها. الصور المرفوعة مسبقاً لن تتأثر.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
