import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useT, useLanguage } from "@/lib/i18n";

const dict = {
  pageTitle: { ar: "التقارير والتحليلات", en: "Reports & Analytics" },
  revenueMonth: { ar: "الإيرادات (هذا الشهر)", en: "Revenue (This Month)" },
  conversion: { ar: "معدل التحويل (من البحث إلى الحجز)", en: "Conversion Rate (Search to Booking)" },
  topProviders: { ar: "أعلى 5 وسطاء عقاريين (حسب الأرباح)", en: "Top 5 Providers (By Earnings)" },
  topCats: { ar: "أبرز التصنيفات (حسب عدد الخدمات)", en: "Top Categories (By Listings)" },
  week: { ar: "أسبوع", en: "Week" },
  sar: { ar: "ج.م", en: "EGP" },
  listings: { ar: "خدمة", en: "listings" },
  n1: { ar: "أحمد عبدالله", en: "Ahmed Abdullah" },
  n2: { ar: "سارة خالد", en: "Sara Khalid" },
  n3: { ar: "فاطمة آل سعود", en: "Fatima Al-Saud" },
  n4: { ar: "محمد علي", en: "Mohammed Ali" },
  n5: { ar: "عمر فهد", en: "Omar Fahad" },
  cFood: { ar: "طعام وضيافة", en: "Food & Hospitality" },
  cMaint: { ar: "صيانة منزلية", en: "Home Maintenance" },
  cEvents: { ar: "فعاليات ومناسبات", en: "Events & Occasions" },
  cBeauty: { ar: "تجميل وعناية", en: "Beauty & Care" },
  cHand: { ar: "منتجات يدوية", en: "Handmade Products" },
  catFood: { ar: "طعام", en: "Food" },
  catBeauty: { ar: "تجميل", en: "Beauty" },
  catMaint: { ar: "صيانة", en: "Maintenance" },
  catEvents: { ar: "فعاليات", en: "Events" },
  catHand: { ar: "حرف يدوية", en: "Handmade" },
};

export default function AdminReports() {
  const t = useT(dict);
  const { formatNumber } = useLanguage();

  const data = [1, 2, 3, 4].map((n, i) => ({
    name: `${t("week")} ${formatNumber(n)}`,
    rev: [4000, 3000, 5500, 4500][i],
    conv: [2.4, 1.3, 3.8, 3.1][i],
  }));

  const providers = [
    { name: t("n1"), earn: 12450, cat: t("catFood") },
    { name: t("n2"), earn: 9820, cat: t("catBeauty") },
    { name: t("n3"), earn: 8100, cat: t("catMaint") },
    { name: t("n4"), earn: 7540, cat: t("catEvents") },
    { name: t("n5"), earn: 5300, cat: t("catHand") },
  ];

  const cats = [
    { name: t("cFood"), count: 184, percent: "35%" },
    { name: t("cMaint"), count: 115, percent: "22%" },
    { name: t("cEvents"), count: 95, percent: "18%" },
    { name: t("cBeauty"), count: 78, percent: "15%" },
    { name: t("cHand"), count: 36, percent: "7%" },
  ];

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>{t("revenueMonth")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rev" stroke="#0d9488" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>{t("conversion")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="conv" stroke="#8b5cf6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>{t("topProviders")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{formatNumber(i + 1)}</div>
                    <div>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.cat}</p>
                    </div>
                  </div>
                  <span className="font-bold text-teal-600">{formatNumber(p.earn)} {t("sar")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>{t("topCats")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cats.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{c.name}</span>
                    <span className="text-slate-500">{formatNumber(c.count)} {t("listings")}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: c.percent }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
