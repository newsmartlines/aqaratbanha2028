import { useMemo, useState } from "react";
import {
  Loader2, Package, TrendingUp, Users, Building2, RefreshCw,
  Search, ChevronLeft, ChevronRight, Crown, Zap, Star,
  CheckCircle2, XCircle, Clock, Filter, UserCircle2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const PAGE_SIZE = 15;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function fmtMoney(v: string | number | null | undefined) {
  const n = parseFloat(String(v ?? "0"));
  return n === 0 ? "مجاني" : `${n.toLocaleString("en-US")} ج.م`;
}

function PlanBadge({ nameAr, price }: { nameAr?: string | null; price?: string | null }) {
  const p = parseFloat(String(price ?? "0"));
  const cls = p === 0
    ? "bg-slate-100 text-slate-600 border-slate-200"
    : p < 200
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-purple-50 text-purple-700 border-purple-200";
  const Icon = p === 0 ? Package : p < 200 ? Zap : Crown;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="w-3 h-3" />
      {nameAr ?? "—"}
    </span>
  );
}

function StatusBadge({ isActive, isPastDue, status }: { isActive: boolean; isPastDue: boolean; status: string }) {
  if (isActive) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> نشط
    </span>
  );
  if (isPastDue) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
      <XCircle className="w-3 h-3" /> منتهٍ
    </span>
  );
  if (status === "cancelled") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
      <XCircle className="w-3 h-3" /> ملغى
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
      <Clock className="w-3 h-3" /> {status}
    </span>
  );
}

function DaysLeftPill({ days, isActive }: { days: number; isActive: boolean }) {
  if (!isActive) return <span className="text-slate-400 text-xs">—</span>;
  const cls = days > 14 ? "text-emerald-600 bg-emerald-50" : days > 7 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${cls}`}>
      <Clock className="w-3 h-3" />
      {days} يوم
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

type SubRow = {
  id: number;
  subscriberType: string;
  subscriberName: string;
  subscriberEmail: string | null;
  packageNameAr: string | null;
  packagePrice: string | null;
  daysLeft: number;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
  isPastDue: boolean;
  durationDays: number | null;
};

export default function AdminSubscriptions() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "expired" | "cancelled">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "user" | "company">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => api.admin.subscriptions.list(),
    refetchInterval: 20_000,
  });

  const rows: SubRow[] = data?.rows ?? [];
  const totals = data?.totals ?? {
    premiumActive: 0, bronzeActive: 0, freeActive: 0,
    monthlyRecurring: 0, totalActive: 0, userActive: 0, companyActive: 0,
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchTab =
        tab === "all" ? true :
        tab === "active" ? r.isActive :
        tab === "expired" ? r.isPastDue :
        r.status === "cancelled";
      const matchType =
        typeFilter === "all" ? true :
        typeFilter === "user" ? r.subscriberType === "user" :
        r.subscriberType === "company";
      const matchSearch = !search || [r.subscriberName, r.subscriberEmail, r.packageNameAr]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()));
      return matchTab && matchType && matchSearch;
    });
  }, [rows, tab, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleTab(t: typeof tab) { setTab(t); setPage(1); }
  function handleType(t: typeof typeFilter) { setTypeFilter(t); setPage(1); }

  const TABS = [
    { key: "all", label: "الكل", count: rows.length },
    { key: "active", label: "نشطة", count: rows.filter(r => r.isActive).length },
    { key: "expired", label: "منتهية", count: rows.filter(r => r.isPastDue).length },
    { key: "cancelled", label: "ملغاة", count: rows.filter(r => r.status === "cancelled").length },
  ] as const;

  return (
    <AdminLayout title="الاشتراكات">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="الاشتراكات النشطة" value={totals.totalActive} icon={CheckCircle2} color="bg-emerald-500" />
        <StatCard label="مستخدمون" value={totals.userActive} sub="اشتراك نشط" icon={UserCircle2} color="bg-blue-500" />
        <StatCard label="شركات" value={totals.companyActive} sub="اشتراك نشط" icon={Building2} color="bg-violet-500" />
        <StatCard
          label="الإيراد الشهري"
          value={`${Math.round(totals.monthlyRecurring).toLocaleString("en-US")} ج.م`}
          sub={`${totals.premiumActive} مميز · ${totals.bronzeActive} أساسي · ${totals.freeActive} مجاني`}
          icon={TrendingUp}
          color="bg-teal-500"
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-5">
        {/* Tab Bar */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => handleTab(t.key)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
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

        {/* Search + Type Filter */}
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="بحث باسم المشترك أو الباقة..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pr-9 text-sm"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            {(["all", "user", "company"] as const).map(t => (
              <button
                key={t}
                onClick={() => handleType(t)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  typeFilter === t
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t === "all" ? <Filter className="w-3.5 h-3.5 inline ml-1" /> : null}
                {t === "all" ? "الكل" : t === "user" ? "مستخدمون" : "شركات"}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-700">المشترك</TableHead>
                <TableHead className="font-bold text-slate-700">الباقة</TableHead>
                <TableHead className="font-bold text-slate-700">الحالة</TableHead>
                <TableHead className="font-bold text-slate-700">المتبقي</TableHead>
                <TableHead className="font-bold text-slate-700">البداية</TableHead>
                <TableHead className="font-bold text-slate-700">الانتهاء</TableHead>
                <TableHead className="font-bold text-slate-700 text-end">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">جاري التحميل…</p>
                  </TableCell>
                </TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">
                      {search ? "لا توجد نتائج مطابقة للبحث" : "لا توجد اشتراكات"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          s.subscriberType === "company"
                            ? "bg-violet-100 text-violet-600"
                            : "bg-blue-100 text-blue-600"
                        }`}>
                          {s.subscriberType === "company"
                            ? <Building2 className="w-4 h-4" />
                            : <UserCircle2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{s.subscriberName}</p>
                          {s.subscriberEmail && (
                            <p className="text-xs text-slate-400">{s.subscriberEmail}</p>
                          )}
                          <Badge variant="outline" className={`mt-0.5 text-[10px] px-1.5 py-0 h-auto ${
                            s.subscriberType === "company"
                              ? "border-violet-200 text-violet-600"
                              : "border-blue-200 text-blue-600"
                          }`}>
                            {s.subscriberType === "company" ? "شركة" : "مستخدم"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlanBadge nameAr={s.packageNameAr} price={s.packagePrice} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={s.isActive} isPastDue={s.isPastDue} status={s.status} />
                    </TableCell>
                    <TableCell>
                      <DaysLeftPill days={s.daysLeft} isActive={s.isActive} />
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{fmtDate(s.startDate)}</TableCell>
                    <TableCell className={`text-sm font-medium ${s.isPastDue ? "text-red-500" : "text-slate-600"}`}>
                      {fmtDate(s.endDate)}
                    </TableCell>
                    <TableCell className="text-end">
                      <span className={`font-bold text-sm ${
                        parseFloat(String(s.packagePrice ?? "0")) === 0
                          ? "text-slate-400"
                          : "text-slate-900"
                      }`}>
                        {fmtMoney(s.packagePrice)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
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

      {/* Summary footer */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-purple-400" /> {totals.premiumActive} مميز (≥200 ج.م)</span>
        <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-blue-400" /> {totals.bronzeActive} أساسي</span>
        <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-slate-400" /> {totals.freeActive} مجاني</span>
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {filtered.length} نتيجة معروضة</span>
      </div>
    </AdminLayout>
  );
}
