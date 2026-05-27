import { useState } from "react";
import {
  TrendingUp, Zap, Star, Sparkles, DollarSign,
  RefreshCw, Loader2, X, ChevronRight, ChevronLeft,
  Building2, User, Clock, CheckCircle2, ShieldOff,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { promotions } from "@/lib/api";

const PAGE_SIZE = 20;

type PromoDashboard = {
  stats: {
    totalActive: number;
    activeBumps: number;
    activeFeatured: number;
    activeSpotlight: number;
    manualCount: number;
    addonCount: number;
    revenue: number;
    totalGranted: number;
    totalUsed: number;
  };
  activePromos: Array<{
    id: number;
    propertyId: number;
    userId: number;
    type: string;
    source: string;
    boostScore: number;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
    propertyTitle: string | null;
    propertyStatus: string | null;
    userName: string | null;
    userEmail: string | null;
  }>;
  topProperties: Array<{
    propertyId: number;
    propertyTitle: string | null;
    userName: string | null;
    totalBoost: number;
    types: string | null;
  }>;
};

const TYPE_META: Record<string, { label: string; icon: React.ElementType; cls: string; badge: string }> = {
  bump:      { label: "ترفيع",    icon: TrendingUp, cls: "text-blue-600 bg-blue-50",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  featured:  { label: "مميّز",   icon: Star,       cls: "text-amber-600 bg-amber-50",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  spotlight: { label: "سبوتلايت", icon: Sparkles,  cls: "text-purple-600 bg-purple-50", badge: "bg-purple-50 text-purple-700 border-purple-200" },
};

const SOURCE_META: Record<string, { label: string; cls: string }> = {
  plan:   { label: "باقة",  cls: "bg-slate-100 text-slate-600" },
  addon:  { label: "إضافة", cls: "bg-teal-50 text-teal-700" },
  manual: { label: "يدوي", cls: "bg-orange-50 text-orange-700" },
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function fmtMoney(v: number | string | null | undefined) {
  const n = parseFloat(String(v ?? "0"));
  if (isNaN(n)) return "0";
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function StatCard({ label, value, sub, icon: Icon, valueColor = "text-slate-900" }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; valueColor?: string;
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

export default function AdminPromotions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");

  const [applyPropertyId, setApplyPropertyId] = useState("");
  const [applyType, setApplyType] = useState<"bump" | "featured" | "spotlight">("bump");
  const [applyDays, setApplyDays] = useState("7");

  const [grantUserId, setGrantUserId] = useState("");
  const [grantType, setGrantType] = useState("bump");
  const [grantQty, setGrantQty] = useState("1");
  const [grantNote, setGrantNote] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-promotions-dashboard"],
    queryFn: () => promotions.adminDashboard(),
    refetchInterval: 20_000,
  });

  const dash: PromoDashboard | null = data?.data ?? null;

  const revokeMutation = useMutation({
    mutationFn: (id: number) => promotions.adminRevoke(id),
    onSuccess: () => {
      toast({ title: "✅ تم إلغاء الترقية" });
      queryClient.invalidateQueries({ queryKey: ["admin-promotions-dashboard"] });
    },
    onError: (e: any) => toast({ title: "فشل الإلغاء", description: e?.message, variant: "destructive" }),
  });

  const applyMutation = useMutation({
    mutationFn: async ({ propertyId, type, days }: { propertyId: number; type: string; days: number }) => {
      if (type === "bump") return promotions.adminBumpProperty(propertyId, days);
      if (type === "featured") return promotions.adminFeatureProperty(propertyId);
      if (type === "spotlight") return promotions.adminSpotlightProperty(propertyId);
      throw new Error("نوع غير معروف");
    },
    onSuccess: () => {
      toast({ title: "✅ تم تطبيق الترقية بنجاح" });
      setApplyPropertyId("");
      queryClient.invalidateQueries({ queryKey: ["admin-promotions-dashboard"] });
    },
    onError: (e: any) => toast({ title: "فشل التطبيق", description: e?.message, variant: "destructive" }),
  });

  const grantMutation = useMutation({
    mutationFn: (data: { userId: number; type: string; quantity: number; note?: string }) =>
      promotions.adminGrantAddon(data),
    onSuccess: () => {
      toast({ title: "✅ تم منح الإضافات بنجاح" });
      setGrantUserId(""); setGrantQty("1"); setGrantNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-promotions-dashboard"] });
    },
    onError: (e: any) => toast({ title: "فشل المنح", description: e?.message, variant: "destructive" }),
  });

  function handleApply() {
    const pid = parseInt(applyPropertyId, 10);
    if (isNaN(pid) || pid <= 0) {
      toast({ title: "أدخل رقم العقار", variant: "destructive" });
      return;
    }
    applyMutation.mutate({ propertyId: pid, type: applyType, days: parseInt(applyDays, 10) || 7 });
  }

  function handleGrant() {
    const uid = parseInt(grantUserId, 10);
    const qty = parseInt(grantQty, 10);
    if (isNaN(uid) || uid <= 0) { toast({ title: "أدخل رقم المستخدم", variant: "destructive" }); return; }
    if (isNaN(qty) || qty <= 0) { toast({ title: "أدخل كمية صحيحة", variant: "destructive" }); return; }
    grantMutation.mutate({ userId: uid, type: grantType, quantity: qty, note: grantNote || undefined });
  }

  const promos = dash?.activePromos ?? [];
  const filtered = typeFilter === "all" ? promos : promos.filter(p => p.type === typeFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminLayout title="الترقيات والبوستات">
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-slate-500">إدارة ترقيات العقارات وإضافات البوستات في الوقت الفعلي</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="ترفيعات نشطة"
              value={dash?.stats.activeBumps ?? 0}
              sub="bump نشط حالياً"
              icon={TrendingUp}
              valueColor="text-blue-600"
            />
            <StatCard
              label="مميّزة نشطة"
              value={dash?.stats.activeFeatured ?? 0}
              sub="featured نشط"
              icon={Star}
              valueColor="text-amber-600"
            />
            <StatCard
              label="سبوتلايت نشط"
              value={dash?.stats.activeSpotlight ?? 0}
              sub="spotlight نشط"
              icon={Sparkles}
              valueColor="text-purple-600"
            />
            <StatCard
              label="إيرادات الإضافات"
              value={`${fmtMoney(dash?.stats.revenue)} ج.م`}
              sub={`${dash?.stats.totalUsed ?? 0} من ${dash?.stats.totalGranted ?? 0} مُستخدمة`}
              icon={DollarSign}
              valueColor="text-emerald-600"
            />
          </div>

          {/* Main grid: left = active promos table, right = apply + top properties */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Active promotions table */}
            <div className="xl:col-span-2">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700">
                    الترقيات النشطة
                    <Badge variant="outline" className="mr-2 text-xs">{filtered.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="bump">ترفيع</SelectItem>
                        <SelectItem value="featured">مميّز</SelectItem>
                        <SelectItem value="spotlight">سبوتلايت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs text-slate-500 bg-slate-50">
                        <TableHead className="text-right">العقار</TableHead>
                        <TableHead className="text-right">المستخدم</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">المصدر</TableHead>
                        <TableHead className="text-right">تنتهي</TableHead>
                        <TableHead className="text-right w-14">إلغاء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-400 py-12 text-sm">
                            لا توجد ترقيات نشطة
                          </TableCell>
                        </TableRow>
                      ) : (
                        paged.map(promo => {
                          const tm = TYPE_META[promo.type] ?? TYPE_META.bump;
                          const sm = SOURCE_META[promo.source] ?? SOURCE_META.plan;
                          const TypeIcon = tm.icon;
                          return (
                            <TableRow key={promo.id} className="hover:bg-slate-50">
                              <TableCell className="max-w-[200px]">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  {promo.propertyTitle ?? `#${promo.propertyId}`}
                                </p>
                                <p className="text-xs text-slate-400">ID: {promo.propertyId}</p>
                              </TableCell>
                              <TableCell>
                                <p className="text-xs text-slate-600 truncate">{promo.userName ?? "—"}</p>
                                <p className="text-xs text-slate-400">{promo.userEmail ?? ""}</p>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${tm.badge}`}>
                                  <TypeIcon className="w-3 h-3" />
                                  {tm.label}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sm.cls}`}>
                                  {sm.label}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  {fmtDate(promo.expiresAt)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <button
                                  onClick={() => revokeMutation.mutate(promo.id)}
                                  disabled={revokeMutation.isPending && revokeMutation.variables === promo.id}
                                  title="إلغاء الترقية"
                                  className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                >
                                  {revokeMutation.isPending && revokeMutation.variables === promo.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <ShieldOff className="w-3.5 h-3.5" />
                                  }
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} من {filtered.length}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right column: Apply promotion + Top properties */}
            <div className="flex flex-col gap-5">
              {/* Apply promotion card */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="px-5 py-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-500" />
                    تطبيق ترقية يدوياً
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">رقم العقار (ID)</Label>
                    <Input
                      type="number"
                      placeholder="مثال: 42"
                      value={applyPropertyId}
                      onChange={e => setApplyPropertyId(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">نوع الترقية</Label>
                    <Select value={applyType} onValueChange={v => setApplyType(v as any)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bump">ترفيع (Bump)</SelectItem>
                        <SelectItem value="featured">مميّز (Featured)</SelectItem>
                        <SelectItem value="spotlight">سبوتلايت (Spotlight)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {applyType === "bump" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">المدة (أيام)</Label>
                      <Input
                        type="number"
                        placeholder="7"
                        value={applyDays}
                        onChange={e => setApplyDays(e.target.value)}
                        className="h-9 text-sm"
                        min={1}
                        max={365}
                      />
                    </div>
                  )}
                  <Button
                    className="w-full h-9 text-sm bg-teal-600 hover:bg-teal-700"
                    onClick={handleApply}
                    disabled={applyMutation.isPending}
                  >
                    {applyMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin ml-1" />
                      : <CheckCircle2 className="w-4 h-4 ml-1" />
                    }
                    تطبيق الترقية
                  </Button>
                </CardContent>
              </Card>

              {/* Grant addon boosts card */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="px-5 py-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    منح إضافات لمستخدم
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">رقم المستخدم (ID)</Label>
                    <Input
                      type="number"
                      placeholder="مثال: 5"
                      value={grantUserId}
                      onChange={e => setGrantUserId(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">النوع</Label>
                      <Select value={grantType} onValueChange={setGrantType}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bump">ترفيع</SelectItem>
                          <SelectItem value="featured">مميّز</SelectItem>
                          <SelectItem value="spotlight">سبوتلايت</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">الكمية</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={grantQty}
                        onChange={e => setGrantQty(e.target.value)}
                        className="h-9 text-sm"
                        min={1}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">ملاحظة (اختياري)</Label>
                    <Input
                      placeholder="سبب المنح..."
                      value={grantNote}
                      onChange={e => setGrantNote(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-9 text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={handleGrant}
                    disabled={grantMutation.isPending}
                  >
                    {grantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                    منح الإضافات
                  </Button>
                </CardContent>
              </Card>

              {/* Top boosted properties */}
              {(dash?.topProperties?.length ?? 0) > 0 && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-500" />
                      أعلى عقارات مُرقّاة
                    </CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-slate-100">
                    {(dash?.topProperties ?? []).map((prop, i) => (
                      <div key={prop.propertyId} className="flex items-center gap-3 px-5 py-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {prop.propertyTitle ?? `#${prop.propertyId}`}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {prop.userName ?? "—"}
                            {prop.types && <span className="mr-1 text-slate-300">·</span>}
                            {prop.types && <span className="text-slate-400">{prop.types}</span>}
                          </p>
                        </div>
                        <div className="text-sm font-bold text-teal-600 tabular-nums shrink-0">
                          {prop.totalBoost}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
