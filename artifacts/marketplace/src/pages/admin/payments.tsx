import { useMemo, useState } from "react";
import { Download, Filter, Loader2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT, useLanguage, commonDict } from "@/lib/i18n";
import { api } from "@/lib/api";

const dict = {
  pageTitle: { ar: "المدفوعات والمعاملات", en: "Payments & Transactions" },
  totalCollected: { ar: "إجمالي المحصّل", en: "Total Collected" },
  pendingSettlement: { ar: "تسويات معلّقة", en: "Pending Settlements" },
  failedTotal: { ar: "المعاملات الفاشلة", en: "Failed Transactions" },
  inRange: { ar: "في الفترة المحددة", en: "In selected range" },
  recentTrx: { ar: "أحدث المعاملات", en: "Recent Transactions" },
  provider: { ar: "مقدم الخدمة", en: "Provider" },
  type: { ar: "النوع", en: "Type" },
  amount: { ar: "المبلغ", en: "Amount" },
  date: { ar: "التاريخ", en: "Date" },
  trxId: { ar: "رقم المعاملة", en: "Transaction ID" },
  sar: { ar: "ج.م", en: "EGP" },
  subscription: { ar: "اشتراك", en: "Subscription" },
  commission: { ar: "عمولة", en: "Commission" },
  featured: { ar: "خدمة مميزة", en: "Featured" },
  paid: { ar: "مدفوع", en: "Paid" },
  pendingS: { ar: "معلّق", en: "Pending" },
  failed: { ar: "فشل", en: "Failed" },
  filters: { ar: "فلترة التقارير", en: "Report Filters" },
  fromDate: { ar: "من تاريخ", en: "From Date" },
  toDate: { ar: "إلى تاريخ", en: "To Date" },
  apply: { ar: "تطبيق", en: "Apply" },
  reset: { ar: "إعادة تعيين", en: "Reset" },
  exportCsv: { ar: "تصدير المدفوعات (CSV)", en: "Export Payments (CSV)" },
  exportHint: {
    ar: "يحمّل ملف يضم جميع مقدمي الخدمة الذين أتمّوا الدفع خلال الفترة المحددة.",
    en: "Downloads a file with all service providers who completed payment in the selected period.",
  },
  loading: { ar: "جاري التحميل…", en: "Loading…" },
  noPayments: { ar: "لا توجد معاملات في الفترة المحددة", en: "No transactions in the selected period" },
  invalidRange: { ar: "تاريخ البداية يجب أن يسبق تاريخ النهاية", en: "Start date must be before end date" },
  unknownProvider: { ar: "غير معروف", en: "Unknown" },
  status: { ar: "الحالة", en: "Status" },
  allStatuses: { ar: "كل الحالات", en: "All statuses" },
};

const TYPE_LABELS: Record<string, { key: string; cls: string }> = {
  subscription: { key: "subscription", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  commission: { key: "commission", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  featured: { key: "featured", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

const STATUS_LABELS: Record<string, { key: string; cls: string }> = {
  paid: { key: "paid", cls: "text-emerald-600" },
  pending: { key: "pendingS", cls: "text-amber-500" },
  failed: { key: "failed", cls: "text-red-500" },
};

function formatDate(iso: string, lang: string) {
  const d = new Date(iso);
  return d.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPayments() {
  const t = useT(dict);
  const tc = useT(commonDict);
  const { formatNumber, lang } = useLanguage();
  void tc;

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [appliedFilters, setAppliedFilters] = useState<{ from?: string; to?: string; status?: string }>({});

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-payments", appliedFilters],
    queryFn: () => api.admin.payments.list(appliedFilters),
    refetchInterval: 15000, // poll so successful payments appear instantly
  });

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? {
    paid: 0,
    pending: 0,
    failed: 0,
    paidAmount: 0,
    pendingAmount: 0,
    failedAmount: 0,
    totalAmount: 0,
  };

  const rangeError = useMemo(() => {
    if (from && to && new Date(from) > new Date(to)) return t("invalidRange");
    return "";
  }, [from, to, t]);

  function applyFilters() {
    if (rangeError) return;
    const params: { from?: string; to?: string; status?: string } = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (statusFilter) params.status = statusFilter;
    setAppliedFilters(params);
  }

  function resetFilters() {
    setFrom("");
    setTo("");
    setStatusFilter("");
    setAppliedFilters({});
  }

  const exportHref = api.admin.payments.exportUrl({
    ...(appliedFilters.from ? { from: appliedFilters.from } : {}),
    ...(appliedFilters.to ? { to: appliedFilters.to } : {}),
    status: "paid",
  });

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">{t("totalCollected")}</p>
            <h3 className="text-3xl font-bold text-emerald-600">
              {formatNumber(Math.round(totals.paidAmount))}{" "}
              <span className="text-sm text-emerald-600/70 font-normal">{t("sar")}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              {formatNumber(totals.paid)} {t("inRange")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">{t("pendingSettlement")}</p>
            <h3 className="text-3xl font-bold text-amber-500">
              {formatNumber(Math.round(totals.pendingAmount))}{" "}
              <span className="text-sm text-amber-500/70 font-normal">{t("sar")}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              {formatNumber(totals.pending)} {t("inRange")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">{t("failedTotal")}</p>
            <h3 className="text-3xl font-bold text-slate-900">
              {formatNumber(Math.round(totals.failedAmount))}{" "}
              <span className="text-sm text-slate-500 font-normal">{t("sar")}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              {formatNumber(totals.failed)} {t("inRange")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            {t("filters")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-payments"
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-2"
              disabled={rows.length === 0}
              data-testid="button-export-payments"
            >
              <a href={exportHref} download>
                <Download className="w-4 h-4" />
                {t("exportCsv")}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="from-date" className="text-xs text-slate-500">
              {t("fromDate")}
            </Label>
            <Input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              data-testid="input-from-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-date" className="text-xs text-slate-500">
              {t("toDate")}
            </Label>
            <Input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="input-to-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-filter" className="text-xs text-slate-500">
              {t("status")}
            </Label>
            <select
              id="status-filter"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="select-status-filter"
            >
              <option value="">{t("allStatuses")}</option>
              <option value="paid">{t("paid")}</option>
              <option value="pending">{t("pendingS")}</option>
              <option value="failed">{t("failed")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={applyFilters}
              disabled={!!rangeError}
              className="flex-1"
              data-testid="button-apply-filters"
            >
              {t("apply")}
            </Button>
            <Button variant="outline" onClick={resetFilters} data-testid="button-reset-filters">
              {t("reset")}
            </Button>
          </div>
          <div className="md:col-span-4 flex items-center justify-between text-xs">
            <p className="text-slate-400">{t("exportHint")}</p>
            {rangeError && <p className="text-red-500">{rangeError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>{t("recentTrx")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>{t("provider")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead className="text-end">{t("trxId")}</TableHead>
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
                      {t("noPayments")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const typeMeta = TYPE_LABELS[r.type] ?? {
                      key: "subscription",
                      cls: "bg-slate-50 text-slate-700 border-slate-200",
                    };
                    const statusMeta = STATUS_LABELS[r.status] ?? { key: "pendingS", cls: "text-slate-500" };
                    return (
                      <TableRow key={r.id} data-testid={`payment-row-${r.id}`}>
                        <TableCell className="font-medium">
                          {r.providerName ?? t("unknownProvider")}
                          {r.providerEmail && (
                            <div className="text-xs text-slate-400 font-normal">{r.providerEmail}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeMeta.cls}>
                            {t(typeMeta.key as keyof typeof dict)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatNumber(parseFloat(r.amount))} {t("sar")}
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${statusMeta.cls}`}>
                            {t(statusMeta.key as keyof typeof dict)}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">{formatDate(r.createdAt, lang)}</TableCell>
                        <TableCell className="text-end text-slate-400 font-mono text-xs">
                          {r.invoiceId ?? `TRX-${r.id}`}
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
