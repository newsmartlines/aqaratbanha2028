import { useCallback } from "react";
import { useLocation } from "wouter";
import { NO_IMAGE_PLACEHOLDER } from "@/lib/no-image-placeholder";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Button } from "@/components/ui/button";
import { useCompare, removeFromCompare, clearCompare, type CompareItem } from "@/lib/compare-store";
import {
  BedDouble, Bath, Maximize2, MapPin, X, ArrowLeft,
  Home, TrendingUp, Calendar, Layers, CheckCircle2, Star,
  Trophy, AlertTriangle, Crown,
} from "lucide-react";

/* ── helpers ──────────────────────────────────────────────────────────── */

function formatPrice(n: number): string {
  if (!n || n === 0) return "—";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)} مليون ج.م`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k % 1 === 0 ? k : k.toFixed(0)} ألف ج.م`;
  }
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

function typeLabel(t: string) {
  return t === "sale" ? "للبيع" : t === "rent" ? "للإيجار" : t;
}

/* Location insight: known Banha/QalyubiaAreas keywords */
const AREA_INSIGHTS: Record<string, string> = {
  "كورنيش":   "موقع حيوي على الكورنيش — طلب مرتفع",
  "وسط":      "قلب المدينة — سهولة الوصول والخدمات",
  "شرق":      "منطقة شرق بنها — هادئة ومناسبة للسكن",
  "غرب":      "منطقة غرب بنها — أسعار معتدلة",
  "جنوب":     "جنوب بنها — توسع عمراني جديد",
  "شمال":     "شمال بنها — قرب الطريق الدولي",
  "المركز":   "قريب من المركز — ارتفاع قيمة الاستثمار",
  "الصناعية": "المنطقة الصناعية — مناسب للتجاري",
  "الزيتون":  "حي الزيتون — هادئ وخضراء",
  "النيل":    "قريب من النيل — مطلوب بشدة",
};

function getLocationInsight(loc: string): string {
  for (const [key, insight] of Object.entries(AREA_INSIGHTS)) {
    if (loc.includes(key)) return insight;
  }
  return "منطقة بنها المميزة";
}

/* Score a property for recommendation (higher = better) */
function score(item: CompareItem, all: CompareItem[]): number {
  let s = 0;
  const prices  = all.map(i => i.priceNum).filter(p => p > 0);
  const areas   = all.map(i => i.area).filter(a => a > 0);
  const beds    = all.map(i => i.beds).filter(b => b > 0);
  const baths   = all.map(i => i.baths).filter(b => b > 0);

  // Lower price = more points (normalised 0-30)
  if (item.priceNum > 0 && prices.length > 1) {
    const minP = Math.min(...prices), maxP = Math.max(...prices);
    s += maxP === minP ? 15 : 30 * (1 - (item.priceNum - minP) / (maxP - minP));
  }
  // More area = more points (0-25)
  if (item.area > 0 && areas.length > 1) {
    const minA = Math.min(...areas), maxA = Math.max(...areas);
    s += maxA === minA ? 12 : 25 * ((item.area - minA) / (maxA - minA));
  }
  // More beds = more points (0-20)
  if (item.beds > 0 && beds.length > 1) {
    const maxB = Math.max(...beds);
    s += item.beds === maxB ? 20 : 0;
  }
  // More baths = more points (0-10)
  if (item.baths > 0 && baths.length > 1) {
    const maxBa = Math.max(...baths);
    s += item.baths === maxBa ? 10 : 0;
  }
  // Price-per-sqm efficiency (0-15)
  if (item.priceNum > 0 && item.area > 0) {
    const ppsm = all
      .filter(i => i.priceNum > 0 && i.area > 0)
      .map(i => ({ id: i.id, ppsm: i.priceNum / i.area }));
    if (ppsm.length > 1) {
      const minPPSM = Math.min(...ppsm.map(x => x.ppsm));
      const myPPSM  = item.priceNum / item.area;
      if (myPPSM === minPPSM) s += 15;
    }
  }
  return Math.round(s);
}

/* Why recommended — human-readable reasons */
function buildRecommendationReasons(winner: CompareItem, all: CompareItem[]): string[] {
  const reasons: string[] = [];
  const prices = all.map(i => i.priceNum).filter(p => p > 0);
  const areas  = all.map(i => i.area).filter(a => a > 0);
  const beds   = all.map(i => i.beds).filter(b => b > 0);

  if (winner.priceNum > 0 && prices.length > 1 && winner.priceNum === Math.min(...prices))
    reasons.push("الأقل سعراً بين العقارات المقارنة");
  if (winner.area > 0 && areas.length > 1 && winner.area === Math.max(...areas))
    reasons.push("يتميز بأكبر مساحة إجمالية");
  if (winner.beds > 0 && beds.length > 1 && winner.beds === Math.max(...beds))
    reasons.push("يوفر أكبر عدد غرف نوم");
  if (winner.priceNum > 0 && winner.area > 0) {
    const myPPSM = winner.priceNum / winner.area;
    const others = all.filter(i => i.id !== winner.id && i.priceNum > 0 && i.area > 0)
                      .map(i => i.priceNum / i.area);
    if (others.length > 0 && myPPSM <= Math.min(...others))
      reasons.push("أفضل قيمة مقابل السعر (سعر المتر الأقل)");
  }
  if (reasons.length === 0) reasons.push("يحقق أفضل توازن بين جميع المعايير المقارنة");
  return reasons;
}

/* ── Badge components ─────────────────────────────────────────────────── */

function Badge({ label, color }: { label: string; color: "green" | "blue" | "amber" | "rose" | "primary" }) {
  const cls = {
    green:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue:    "bg-blue-100 text-blue-700 border-blue-200",
    amber:   "bg-amber-100 text-amber-700 border-amber-200",
    rose:    "bg-rose-100 text-rose-700 border-rose-200",
    primary: "bg-primary/10 text-primary border-primary/20",
  }[color];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls} mt-1`}>
      <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
      {label}
    </span>
  );
}

/* ── Main Component ───────────────────────────────────────────────────── */

export default function ComparePage() {
  const [, setLocation] = useLocation();
  const { items } = useCompare();

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/properties");
    }
  }, [setLocation]);

  /* Detect listing type conflict (shouldn't reach here but guard anyway) */
  const hasMixedTypes = items.length > 1 && new Set(items.map(i => i.type)).size > 1;

  /* Per-property scores */
  const scores  = items.map(item => score(item, items));
  const maxScore = Math.max(...scores);
  const winner  = items[scores.indexOf(maxScore)];

  /* Derived max/min helpers */
  const maxArea  = Math.max(...items.map(i => i.area).filter(a => a > 0));
  const minPrice = Math.min(...items.map(i => i.priceNum).filter(p => p > 0));
  const maxBeds  = Math.max(...items.map(i => i.beds).filter(b => b > 0));
  const maxBaths = Math.max(...items.map(i => i.baths).filter(b => b > 0));
  const minPPSM  = Math.min(
    ...items.filter(i => i.priceNum > 0 && i.area > 0).map(i => i.priceNum / i.area)
  );

  const cols = items.length;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              رجوع
            </button>
            <h1 className="text-2xl font-extrabold text-gray-900">مقارنة العقارات</h1>
            <p className="text-sm text-muted-foreground mt-1">مقارنة {items.length} عقار</p>
          </div>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompare}
              className="text-red-500 border-red-200 hover:bg-red-50"
            >
              <X className="w-4 h-4 ml-1" />
              مسح الكل
            </Button>
          )}
        </div>

        {/* ── Mixed-type warning ── */}
        {hasMixedTypes && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">
              لا يمكن مقارنة عقارات من نوعي معاملات مختلفين (بيع / إيجار). يُرجى إزالة عقار من أحد النوعين للحصول على مقارنة دقيقة.
            </p>
          </div>
        )}

        {items.length === 0 ? (
          /* ── Empty state ── */
          <div className="bg-white rounded-3xl border border-border p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">لا توجد عقارات للمقارنة</h2>
            <p className="text-muted-foreground mb-6">أضف عقارات من خلال زر المقارنة في صفحة تفاصيل العقار</p>
            <Button onClick={() => setLocation("/properties")}>تصفح العقارات</Button>
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── Property header cards ── */}
            <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
              <div
                className="grid border-b border-border"
                style={{ gridTemplateColumns: `200px repeat(${cols}, 1fr)` }}
              >
                <div className="p-5 bg-gray-50 border-l border-border flex items-center">
                  <span className="text-sm font-bold text-muted-foreground">العقار</span>
                </div>
                {items.map((item, idx) => {
                  const isWinner = winner && item.id === winner.id && items.length > 1;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 relative ${isWinner ? "bg-primary/3 ring-2 ring-inset ring-primary/20" : ""}`}
                    >
                      {isWinner && (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Crown className="w-2.5 h-2.5" /> موصى به
                        </div>
                      )}
                      <button
                        onClick={() => removeFromCompare(item.id)}
                        className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div
                        className="h-32 rounded-2xl overflow-hidden mb-3 cursor-pointer mt-5"
                        onClick={() => setLocation(`/property/${item.id}`)}
                      >
                        <img
                          src={item.image || ""}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER; }}
                        />
                      </div>
                      {/* Price with humanized format */}
                      <div className="mb-1">
                        <span className={`inline-block font-extrabold text-base leading-tight px-2.5 py-1 rounded-lg border ${
                          item.priceNum === minPrice && items.length > 1
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-primary/5 text-primary border-primary/10"
                        }`}>
                          {formatPrice(item.priceNum)}
                          {item.type === "rent" && <span className="text-[10px] font-normal mr-0.5">/شهر</span>}
                        </span>
                        {item.priceNum === minPrice && items.length > 1 && (
                          <div><Badge label="أفضل سعر" color="green" /></div>
                        )}
                      </div>
                      <h3
                        className="font-bold text-gray-900 mt-1 text-sm leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-2"
                        onClick={() => setLocation(`/property/${item.id}`)}
                      >
                        {item.title}
                      </h3>
                      <span className={`mt-2 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        item.type === "sale" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {typeLabel(item.type)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ── Price row ── */}
              <CompareRow
                label="السعر الإجمالي"
                icon={TrendingUp}
                shaded
              >
                {items.map(item => {
                  const isCheap   = item.priceNum > 0 && item.priceNum === minPrice && items.length > 1;
                  const ppsmVal   = item.priceNum > 0 && item.area > 0 ? item.priceNum / item.area : 0;
                  const isBestVal = ppsmVal > 0 && ppsmVal === minPPSM && items.length > 1;
                  return (
                    <div key={item.id} className="p-4 flex flex-col gap-0.5">
                      <span className={`text-sm font-bold ${isCheap ? "text-emerald-600" : "text-gray-800"}`}>
                        {formatPrice(item.priceNum)}
                      </span>
                      {item.area > 0 && item.priceNum > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {Math.round(item.priceNum / item.area).toLocaleString("ar-EG")} ج.م/م²
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {isCheap   && <Badge label="أفضل سعر"   color="green" />}
                        {isBestVal && <Badge label="أوفر قيمة"  color="primary" />}
                      </div>
                    </div>
                  );
                })}
              </CompareRow>

              {/* ── Area row ── */}
              <CompareRow label="المساحة" icon={Maximize2}>
                {items.map(item => {
                  const isBig = item.area > 0 && item.area === maxArea && items.length > 1;
                  return (
                    <div key={item.id} className="p-4 flex flex-col gap-0.5">
                      <span className={`text-sm ${isBig ? "font-bold text-primary" : "text-gray-800"}`}>
                        {item.area > 0 ? `${item.area.toLocaleString("ar-EG")} م²` : "—"}
                      </span>
                      {isBig && <Badge label="أكبر مساحة" color="primary" />}
                      {!isBig && item.area > 0 && items.length > 1 && (
                        <span className="text-[11px] text-muted-foreground">
                          أصغر بـ {(maxArea - item.area).toLocaleString("ar-EG")} م²
                        </span>
                      )}
                    </div>
                  );
                })}
              </CompareRow>

              {/* ── Beds row ── */}
              <CompareRow label="غرف النوم" icon={BedDouble} shaded>
                {items.map(item => {
                  const isBest = item.beds > 0 && item.beds === maxBeds && items.length > 1;
                  return (
                    <div key={item.id} className="p-4 flex flex-col gap-0.5">
                      <span className={`text-sm ${isBest ? "font-bold text-primary" : "text-gray-800"}`}>
                        {item.beds > 0 ? `${item.beds} غرفة` : "—"}
                      </span>
                      {isBest && <Badge label="مساحة معيشة أفضل" color="primary" />}
                    </div>
                  );
                })}
              </CompareRow>

              {/* ── Baths row ── */}
              <CompareRow label="دورات المياه" icon={Bath}>
                {items.map(item => {
                  const isBest = item.baths > 0 && item.baths === maxBaths && items.length > 1;
                  return (
                    <div key={item.id} className="p-4 flex flex-col gap-0.5">
                      <span className={`text-sm ${isBest ? "font-bold text-primary" : "text-gray-800"}`}>
                        {item.baths > 0 ? `${item.baths} حمام` : "—"}
                      </span>
                      {isBest && items.length > 1 && <Badge label="أكثر دورات مياه" color="blue" />}
                    </div>
                  );
                })}
              </CompareRow>

              {/* ── Location row ── */}
              <CompareRow label="الموقع" icon={MapPin} shaded>
                {items.map(item => (
                  <div key={item.id} className="p-4 flex flex-col gap-0.5">
                    <span className="text-sm text-gray-800 font-medium">{item.location || "—"}</span>
                    {item.location && (
                      <span className="text-[11px] text-muted-foreground leading-snug">
                        {getLocationInsight(item.location)}
                      </span>
                    )}
                  </div>
                ))}
              </CompareRow>

              {/* ── Type row ── */}
              <CompareRow label="نوع الصفقة" icon={TrendingUp}>
                {items.map(item => (
                  <div key={item.id} className="p-4">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      item.type === "sale" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {typeLabel(item.type)}
                    </span>
                  </div>
                ))}
              </CompareRow>

              {/* ── Property kind row ── */}
              <CompareRow label="نوع العقار" icon={Home} shaded>
                {items.map(item => (
                  <div key={item.id} className="p-4">
                    <span className="text-sm text-gray-800">{item.kind || "—"}</span>
                  </div>
                ))}
              </CompareRow>

              {/* ── Finishing row ── */}
              <CompareRow label="التشطيب" icon={CheckCircle2}>
                {items.map(item => (
                  <div key={item.id} className="p-4">
                    <span className="text-sm text-gray-800">{item.finishing || "—"}</span>
                  </div>
                ))}
              </CompareRow>

              {/* ── Action row ── */}
              <div
                className="grid border-t border-border bg-gray-50"
                style={{ gridTemplateColumns: `200px repeat(${cols}, 1fr)` }}
              >
                <div className="p-4 border-l border-border" />
                {items.map(item => (
                  <div key={item.id} className="p-4">
                    <Button
                      className="w-full rounded-2xl"
                      size="sm"
                      variant={winner?.id === item.id && items.length > 1 ? "default" : "outline"}
                      onClick={() => setLocation(`/property/${item.id}`)}
                    >
                      عرض التفاصيل
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Recommended property section ── */}
            {items.length > 1 && winner && !hasMixedTypes && (
              <div className="bg-gradient-to-br from-primary/5 via-white to-primary/3 border-2 border-primary/20 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">العقار الموصى به</h2>
                    <p className="text-xs text-muted-foreground">بناءً على تحليل السعر والمساحة وعدد الغرف وقيمة المتر</p>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <div
                    className="w-24 h-20 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => setLocation(`/property/${winner.id}`)}
                  >
                    <img
                      src={winner.image || ""}
                      alt={winner.title}
                      className="w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER; }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3
                        className="font-bold text-gray-900 text-sm leading-snug cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setLocation(`/property/${winner.id}`)}
                      >
                        {winner.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shrink-0 shadow-md">
                        <Star className="w-3 h-3 fill-white" />
                        الأفضل
                      </span>
                    </div>
                    <p className="text-primary font-extrabold text-base mb-3">{formatPrice(winner.priceNum)}</p>
                    <div className="space-y-1.5">
                      {buildRecommendationReasons(winner, items).map((reason, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          {reason}
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="mt-4 rounded-full"
                      onClick={() => setLocation(`/property/${winner.id}`)}
                    >
                      عرض تفاصيل العقار الموصى به
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Add more ── */}
            {items.length < 4 && (
              <div className="text-center">
                <button
                  onClick={() => setLocation("/properties")}
                  className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
                >
                  + أضف عقاراً آخر للمقارنة ({items.length}/4)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <RealEstateFooter />
    </div>
  );
}

/* ── Shared row wrapper ─────────────────────────────────────────────── */
function CompareRow({
  label, icon: Icon, shaded = false, children
}: {
  label: string;
  icon: React.ElementType;
  shaded?: boolean;
  children: React.ReactNode;
}) {
  const items_count = Array.isArray(children) ? children.length : 1;
  return (
    <div
      className={`grid border-b border-border last:border-0 ${shaded ? "bg-gray-50/50" : ""}`}
      style={{ gridTemplateColumns: `200px repeat(${items_count}, 1fr)` }}
    >
      <div className="p-4 bg-gray-50 border-l border-border flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      {children}
    </div>
  );
}
