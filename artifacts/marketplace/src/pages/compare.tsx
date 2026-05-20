import { useLocation } from "wouter";
import { NO_IMAGE_PLACEHOLDER } from "@/lib/no-image-placeholder";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Button } from "@/components/ui/button";
import { useCompare, removeFromCompare, clearCompare } from "@/lib/compare-store";
import {
  BedDouble, Bath, Maximize2, MapPin, X, ArrowLeft,
  Home, TrendingUp, Calendar, Layers, CheckCircle2, XCircle,
} from "lucide-react";

export default function ComparePage() {
  const [, setLocation] = useLocation();
  const { items } = useCompare();

  const rows: { label: string; key: keyof typeof items[0]; unit?: string; icon: React.ElementType }[] = [
    { label: "نوع الصفقة", key: "type", icon: TrendingUp },
    { label: "نوع العقار", key: "kind", icon: Home },
    { label: "الموقع", key: "location", icon: MapPin },
    { label: "المساحة", key: "area", unit: "م²", icon: Maximize2 },
    { label: "غرف النوم", key: "beds", icon: BedDouble },
    { label: "دورات المياه", key: "baths", icon: Bath },
    { label: "الطوابق", key: "year", icon: Layers },
    { label: "التشطيب", key: "finishing", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => setLocation(-1 as any)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              رجوع
            </button>
            <h1 className="text-2xl font-extrabold text-gray-900">مقارنة العقارات</h1>
            <p className="text-sm text-muted-foreground mt-1">مقارنة {items.length} عقار</p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { clearCompare(); }} className="text-red-500 border-red-200 hover:bg-red-50">
              <X className="w-4 h-4 ml-1" />
              مسح الكل
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">لا توجد عقارات للمقارنة</h2>
            <p className="text-muted-foreground mb-6">أضف عقارات من خلال زر المقارنة في صفحة تفاصيل العقار</p>
            <Button onClick={() => setLocation("/properties")}>
              تصفح العقارات
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">

            {/* Property header cards */}
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `200px repeat(${items.length}, 1fr)` }}>
              <div className="p-5 bg-gray-50 border-l border-border flex items-center">
                <span className="text-sm font-bold text-muted-foreground">العقار</span>
              </div>
              {items.map(item => (
                <div key={item.id} className="p-4 relative">
                  <button
                    onClick={() => removeFromCompare(item.id)}
                    className="absolute top-3 left-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div
                    className="h-32 rounded-2xl overflow-hidden mb-3 cursor-pointer"
                    onClick={() => setLocation(`/property/${item.id}`)}
                  >
                    <img src={item.image || ""} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" onError={(e) => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }} />
                  </div>
                  <p className="text-primary font-extrabold text-lg leading-tight">
                    {item.price} <span className="text-xs text-muted-foreground font-normal">ج.م</span>
                  </p>
                  <h3
                    className="font-bold text-gray-900 mt-1 text-sm leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-2"
                    onClick={() => setLocation(`/property/${item.id}`)}
                  >
                    {item.title}
                  </h3>
                  <span className={`mt-2 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${item.type === "للبيع" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>

            {/* Comparison rows */}
            {rows.map((row, ri) => (
              <div
                key={row.key}
                className={`grid border-b border-border last:border-0 ${ri % 2 === 0 ? "" : "bg-gray-50/50"}`}
                style={{ gridTemplateColumns: `200px repeat(${items.length}, 1fr)` }}
              >
                <div className="p-4 bg-gray-50 border-l border-border flex items-center gap-2.5">
                  <row.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-gray-700">{row.label}</span>
                </div>
                {items.map(item => {
                  const val = item[row.key];
                  const display = (val === 0 || val === "" || val == null) ? "—" : `${val}${row.unit ? " " + row.unit : ""}`;
                  const allVals = items.map(i => i[row.key]);
                  const isBest = (row.key === "area" || row.key === "beds" || row.key === "baths")
                    && val === Math.max(...(allVals as number[]).filter(v => v > 0));
                  const isCheapest = row.key === "priceNum" && val === Math.min(...(allVals as number[]).filter(v => v > 0));
                  return (
                    <div key={item.id} className={`p-4 flex items-center ${isBest || isCheapest ? "text-primary font-bold" : "text-gray-800"}`}>
                      <span className="text-sm">{display}</span>
                      {(isBest || isCheapest) && <CheckCircle2 className="w-3.5 h-3.5 text-primary mr-1.5 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Price row */}
            <div
              className="grid bg-primary/5 border-t-2 border-primary/20"
              style={{ gridTemplateColumns: `200px repeat(${items.length}, 1fr)` }}
            >
              <div className="p-4 bg-primary/10 border-l border-primary/20 flex items-center gap-2.5">
                <span className="text-sm font-bold text-primary">السعر الإجمالي</span>
              </div>
              {items.map(item => {
                const allPrices = items.map(i => i.priceNum).filter(p => p > 0);
                const isCheapest = item.priceNum > 0 && item.priceNum === Math.min(...allPrices);
                return (
                  <div key={item.id} className="p-4">
                    <p className={`text-base font-extrabold ${isCheapest ? "text-emerald-600" : "text-gray-900"}`}>
                      {item.price} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
                    </p>
                    {isCheapest && <span className="text-xs text-emerald-600 font-semibold">الأقل سعراً ✓</span>}
                  </div>
                );
              })}
            </div>

            {/* Action row */}
            <div
              className="grid border-t border-border"
              style={{ gridTemplateColumns: `200px repeat(${items.length}, 1fr)` }}
            >
              <div className="p-4 bg-gray-50 border-l border-border" />
              {items.map(item => (
                <div key={item.id} className="p-4">
                  <Button
                    className="w-full rounded-2xl"
                    size="sm"
                    onClick={() => setLocation(`/property/${item.id}`)}
                  >
                    عرض التفاصيل
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add more */}
        {items.length > 0 && items.length < 4 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation("/properties")}
              className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
            >
              + أضف عقاراً آخر للمقارنة ({items.length}/4)
            </button>
          </div>
        )}
      </div>
      <RealEstateFooter />
    </div>
  );
}
