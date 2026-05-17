import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, TrendingUp, Users } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT, useLanguage } from "@/lib/i18n";
import { api } from "@/lib/api";

const dict = {
  pageTitle: { ar: "الاشتراكات", en: "Subscriptions" },
  activePremium: { ar: "اشتراكات بسعر أعلى (≥200 ر.س)", en: "Premium-tier Subscriptions (≥200 SAR)" },
  activeBronze: { ar: "اشتراكات أساسية (<200 ر.س)", en: "Standard Subscriptions (<200 SAR)" },
  monthlyRecurring: { ar: "الإيراد المتكرر شهرياً", en: "Monthly Recurring Revenue" },
  activeSubs: { ar: "جميع الاشتراكات", en: "All Subscriptions" },
  provider: { ar: "مقدم الخدمة", en: "Provider" },
  plan: { ar: "الباقة", en: "Plan" },
  status: { ar: "الحالة", en: "Status" },
  startDate: { ar: "تاريخ البداية", en: "Start Date" },
  endDate: { ar: "تاريخ الانتهاء", en: "End Date" },
  amount: { ar: "المبلغ", en: "Amount" },
  sar: { ar: "ر.س", en: "SAR" },
  active: { ar: "نشط", en: "Active" },
  expired: { ar: "منتهٍ", en: "Expired" },
  cancelled: { ar: "ملغى", en: "Cancelled" },
  loading: { ar: "جاري التحميل…", en: "Loading…" },
  noSubs: { ar: "لا توجد اشتراكات حتى الآن", en: "No subscriptions yet" },
  unknownProvider: { ar: "غير معروف", en: "Unknown" },
  unknownPlan: { ar: "غير محدد", en: "Unknown" },
};

function formatDate(iso: string, lang: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusMeta(s: string, isActive: boolean, isPastDue: boolean) {
  if (isPastDue) return { key: "expired", color: "text-red-600", dot: "bg-red-500" };
  if (s === "cancelled") return { key: "cancelled", color: "text-slate-500", dot: "bg-slate-400" };
  if (isActive) return { key: "active", color: "text-emerald-600", dot: "bg-emerald-500" };
  return { key: "expired", color: "text-red-600", dot: "bg-red-500" };
}

export default function AdminSubscriptions() {
  const t = useT(dict);
  const { formatNumber, lang } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => api.admin.subscriptions.list(),
    refetchInterval: 15000,
  });

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { premiumActive: 0, bronzeActive: 0, monthlyRecurring: 0 };

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <p className="font-medium text-purple-100 mb-1">{t("activePremium")}</p>
            <h3 className="text-3xl font-bold" data-testid="stat-premium-count">
              {formatNumber(totals.premiumActive)}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="font-medium text-blue-100 mb-1">{t("activeBronze")}</p>
            <h3 className="text-3xl font-bold" data-testid="stat-bronze-count">
              {formatNumber(totals.bronzeActive)}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{t("monthlyRecurring")}</p>
            <h3 className="text-3xl font-bold text-slate-900" data-testid="stat-mrr">
              {formatNumber(Math.round(totals.monthlyRecurring))}{" "}
              <span className="text-sm text-slate-500 font-normal">{t("sar")}</span>
            </h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>{t("activeSubs")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>{t("provider")}</TableHead>
                  <TableHead>{t("plan")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("startDate")}</TableHead>
                  <TableHead>{t("endDate")}</TableHead>
                  <TableHead className="text-end">{t("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-10">
                      {t("noSubs")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((s) => {
                    const meta = statusMeta(s.status, s.isActive, s.isPastDue);
                    const price = parseFloat(s.packagePrice ?? "0");
                    const isPremium = price >= 200;
                    return (
                      <TableRow key={s.id} data-testid={`subscription-row-${s.id}`}>
                        <TableCell className="font-medium">
                          {s.providerName ?? t("unknownProvider")}
                          {s.providerEmail && (
                            <div className="text-xs text-slate-400 font-normal">{s.providerEmail}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isPremium
                                ? "bg-purple-100 text-purple-700"
                                : price > 0
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {(lang === "ar" ? s.packageNameAr : s.packageNameEn) ?? s.packageNameAr ?? t("unknownPlan")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1.5 text-sm ${meta.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {t(meta.key as keyof typeof dict)}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500">{formatDate(s.startDate, lang)}</TableCell>
                        <TableCell className="text-slate-500">{formatDate(s.endDate, lang)}</TableCell>
                        <TableCell className="text-end font-medium">
                          {formatNumber(price)} {t("sar")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
