import { useMemo, useState } from "react";
import {
  Download, Filter, Loader2, RefreshCw, Search,
  CheckCircle2, Clock, XCircle, CreditCard, Building2,
  UserCircle2, ChevronLeft, ChevronRight, TrendingUp, Banknote,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const PAGE_SIZE = 15;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtMoney(v: string | number | null | undefined) {
  const n = parseFloat(String(v ?? "0"));
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

type PayRow = {
  id: string;
  invoiceId: string | null;
  type: string;
  subscriberType?: string;
  providerName: string | null;
  providerEmail: string | null;
  planName?: string | null;
  amount: string;
  commissionAmount: string;
  status: string;
  gateway: string | null;
  createdAt: string;
};

const TYPE_META: Record<string, { label: string; cls: string }> = {
  subscription:    { label: "اشتراك",     cls: "bg-purple-50 text-purple-700 border-purple-200" },
  service_request: { label: "خدمة",       cls: "bg-blue-50 text-blue-700 border-blue-200" },
  commission:      { label: "عمولة",      cls: "bg-amber-50 text-amber-700 border-amber-200" },
  featured:        { label: "ترقية",      cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

const STATUS_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  paid:    { label: "مدفوع",  icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  pending: { label: "معلّق",  icon: Clock,        cls: "text-amber-600 bg-amber-50 border-amber-200" },
  failed:  { label: "فشل",    icon: XCircle,      cls: "text-red-600 bg-red-50 border-red-200" },
};

const GATEWAY_LABELS: Record<string, string> = {
  stcpay: "STC Pay",
  manual: "يدوي",
  free: "مجاني",
};

function StatCard({ label, value, sub, icon: Icon, valueColor = "text-slate-900" }: {
  label: string; value: string; sub?: string; icon: React.ElementType; valueColor?: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        </div>
        <p className={`text-2xl font-black tabular-nums ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminPayments() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{ from?: string; to?: string; status?: string }>({});
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"all" | "paid" | "pending" | "failed">("all");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-payments", appliedFilters],
    queryFn: () => api.admin.payments.list(appliedFilters),
    refetchInterval: 15_000,
  });

  const rows: PayRow[] = data?.rows ?? [];
  const totals = data?.totals ?? {
    paid: 0, pending: 0, failed: 0,
    paidAmount: 0, pendingAmount: 0, failedAmount: 0,
    totalAmount: 0, commissionTotal: 0,
  };

  const rangeError = useMemo(() => {
    if (from && to && new Date(from) > new Date(to)) return "تاريخ البداية يجب أن يسبق تاريخ النهاية";
    return "";
  }, [from, to]);

  function applyFilters() {
    if (rangeError) return;
    const params: typeof appliedFilters = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (statusFilter) params.status = statusFilter;
    setAppliedFilters(params);
    setPage(1);
  }

  function resetFilters() {
    setFrom(""); setTo(""); setStatusFilter("");
    setAppliedFilters({}); setPage(1); setTab("all"); setSearch("");
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchTab =
        tab === "all" ? true : r.status === tab;
      const matchSearch = !search || [r.providerName, r.providerEmail, r.invoiceId, r.planName]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()));
      return matchTab && matchSearch;
    });
  }, [rows, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const TABS = [
    { key: "all",     label: "الكل",    count: rows.length },
    { key: "paid",    label: "مدفوع",   count: rows.filter(r => r.status === "paid").length },
    { key: "pending", label: "معلّق",   count: rows.filter(r => r.status === "pending").length },
    { key: "failed",  label: "فشل",     count: rows.filter(r => r.status === "failed").length },
  ] as const;

  const exportHref = api.admin.payments.exportUrl({
    ...(appliedFilters.from ? { from: appliedFilters.from } : {}),
    ...(appliedFilters.to ? { to: appliedFilters.to } : {}),
    status: "paid",
  });

  return (
    <AdminLayout title="المدفوعات والمعاملات">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="إجمالي المحصّل"
          value={`${fmtMoney(totals.paidAmount)} ج.م`}
          sub={`${totals.paid} معاملة مكتملة`}
          icon={TrendingUp}
          valueColor="text-emerald-600"
        />
        <StatCard
          label="تسويات معلّقة"
          value={`${fmtMoney(totals.pendingAmount)} ج.م`}
          sub={`${totals.pending} معاملة`}
          icon={Clock}
          valueColor="text-amber-500"
        />
        <StatCard
          label="المعاملات الفاشلة"
          value={`${fmtMoney(totals.failedAmount)} ج.م`}
          sub={`${totals.failed} معاملة`}
          icon={AlertCircle}
          valueColor="text-red-500"
        />
        <StatCard
          label="عمولات المنصة"
          value={`${fmtMoney((totals as any).commissionTotal ?? 0)} ج.م`}
          sub="من المعاملات المكتملة"
          icon={Banknote}
          valueColor="text-violet-600"
        />
      </div>

      {/* Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-5">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="بحث باسم أو بريد أو رقم فاتورة..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pr-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-400">من</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 text-sm w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-400">إلى</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 text-sm w-36" />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={applyFilters}
                disabled={!!rangeError}
                size="sm"
                className="gap-1.5 h-9"
              >
                <Filter className="w-3.5 h-3.5" /> تطبيق
              </Button>
              <Button variant="outline" onClick={resetFilters} size="sm" className="h-9">إعادة</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-9"
              >
                {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
              <Button asChild size="sm" className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700" disabled={filtered.length === 0}>
                <a href={exportHref} download>
                  <Download className="w-3.5 h-3.5" /> CSV
                </a>
              </Button>
            </div>
          </div>
        </div>
        {rangeError && <p className="text-xs text-red-500 px-4 py-2">{rangeError}</p>}

        {/* Tab Bar */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`flex-shrink-0 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                tab === t.key
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tab === t.key ? "bg-teal-50 text-teal-600" : "bg-slate-100 text-slate-500"
              }`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-700">المشترك</TableHead>
                <TableHead className="font-bold text-slate-700">الباقة / النوع</TableHead>
                <TableHead className="font-bold text-slate-700">المبلغ</TableHead>
                <TableHead className="font-bold text-slate-700">الحالة</TableHead>
                <TableHead className="font-bold text-slate-700">البوابة</TableHead>
                <TableHead className="font-bold text-slate-700">التاريخ</TableHead>
                <TableHead className="font-bold text-slate-700 text-end">الفاتورة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">جاري التحميل…</p>
                  </TableCell>
                </TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">
                      {search ? "لا توجد نتائج مطابقة" : "لا توجد معاملات في هذه الفترة"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((r) => {
                  const typeMeta = TYPE_META[r.type] ?? { label: r.type, cls: "bg-slate-100 text-slate-600 border-slate-200" };
                  const stMeta = STATUS_META[r.status] ?? { label: r.status, icon: Clock, cls: "text-slate-500 bg-slate-50 border-slate-200" };
                  const StIcon = stMeta.icon;
                  const isUser = r.subscriberType === "user";
                  const amount = parseFloat(String(r.amount ?? "0"));
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                      {/* Subscriber */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isUser ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600"
                          }`}>
                            {isUser ? <UserCircle2 className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{r.providerName ?? "—"}</p>
                            {r.providerEmail && (
                              <p className="text-xs text-slate-400">{r.providerEmail}</p>
                            )}
                            <Badge variant="outline" className={`mt-0.5 text-[10px] px-1.5 py-0 h-auto ${
                              isUser ? "border-blue-200 text-blue-600" : "border-violet-200 text-violet-600"
                            }`}>
                              {isUser ? "مستخدم" : "شركة"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Plan + Type */}
                      <TableCell>
                        <div className="space-y-1">
                          {r.planName && (
                            <p className="text-sm font-medium text-slate-700">{r.planName}</p>
                          )}
                          <Badge variant="outline" className={`text-xs ${typeMeta.cls}`}>
                            {typeMeta.label}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <p className={`font-bold text-sm tabular-nums ${
                          amount === 0 ? "text-slate-400" : "text-slate-900"
                        }`}>
                          {amount === 0 ? "مجاني" : `${fmtMoney(amount)} ج.م`}
                        </p>
                        {parseFloat(String(r.commissionAmount ?? "0")) > 0 && (
                          <p className="text-xs text-slate-400">
                            عمولة: {fmtMoney(r.commissionAmount)} ج.م
                          </p>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${stMeta.cls}`}>
                          <StIcon className="w-3 h-3" />
                          {stMeta.label}
                        </span>
                      </TableCell>

                      {/* Gateway */}
                      <TableCell>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          {GATEWAY_LABELS[r.gateway ?? ""] ?? r.gateway ?? "—"}
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-slate-500 text-xs">{fmtDate(r.createdAt)}</TableCell>

                      {/* Invoice ID */}
                      <TableCell className="text-end">
                        <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          {r.invoiceId ?? r.id}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              عرض {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} من {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                      page === p
                        ? "bg-teal-500 text-white border border-teal-500"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
