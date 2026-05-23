import { useState } from "react";
import { Link } from "wouter";
import {
  Building2, MapPin, Eye, Plus, Trash2, Clock, CheckCircle2,
  XCircle, AlertCircle, Search, Home, Pencil, RefreshCw, Phone,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

type StatusKey = "pending" | "approved" | "rejected" | string;

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  badgeCls: string;
  bannerCls: string;
  bannerMsg: string;
}> = {
  approved: {
    label: "تمت الموافقة",
    icon: CheckCircle2,
    badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bannerCls: "bg-emerald-50 border-emerald-200 text-emerald-700",
    bannerMsg: "عقارك معتمد ومرئي للجمهور. يمكنك تعديله في أي وقت.",
  },
  pending: {
    label: "قيد المراجعة",
    icon: Clock,
    badgeCls: "bg-amber-100 text-amber-700 border-amber-200",
    bannerCls: "bg-amber-50 border-amber-200 text-amber-700",
    bannerMsg: "جارٍ مراجعة إعلانك من قِبل الإدارة. سيتم إشعارك فور البت فيه.",
  },
  rejected: {
    label: "مرفوض",
    icon: XCircle,
    badgeCls: "bg-red-100 text-red-700 border-red-200",
    bannerCls: "bg-red-50 border-red-200 text-red-700",
    bannerMsg: "تم رفض إعلانك. قم بتعديل البيانات وإعادة التقديم.",
  },
};

function getStatus(s: StatusKey) {
  return STATUS_CONFIG[s] ?? STATUS_CONFIG.pending;
}

function listingTypeLabel(type: string) {
  if (type === "sale") return "للبيع";
  if (type === "rent") return "للإيجار";
  return type;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

export default function MyPropertiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | StatusKey>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ["user-properties"],
    queryFn: () => api.userProperties.list(),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.properties.delete(id),
    onSuccess: () => {
      toast.success("تم حذف العقار");
      queryClient.invalidateQueries({ queryKey: ["user-properties"] });
      setDeletingId(null);
    },
    onError: () => toast.error("فشل حذف العقار"),
  });

  const filtered = (properties as any[]).filter((p: any) => {
    const matchSearch =
      !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.mainCategory?.includes(search) ||
      p.address?.includes(search) ||
      p.district?.includes(search);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: (properties as any[]).length,
    published: (properties as any[]).filter((p: any) => p.status === "approved").length,
    pending: (properties as any[]).filter((p: any) => p.status === "pending").length,
    rejected: (properties as any[]).filter((p: any) => p.status === "rejected").length,
  };

  const STATUS_TABS = [
    { key: "all", label: "الكل", count: counts.all, cls: "text-slate-700 border-slate-300" },
    { key: "approved", label: "تمت الموافقة", count: counts.published, cls: "text-emerald-700 border-emerald-300" },
    { key: "pending", label: "قيد المراجعة", count: counts.pending, cls: "text-amber-700 border-amber-300" },
    { key: "rejected", label: "مرفوض", count: counts.rejected, cls: "text-red-700 border-red-300" },
  ];

  return (
    <UserLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              عقاراتي المعلنة
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {counts.all} إعلان مسجل
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-slate-600"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Link href="/add-property">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2">
                <Plus className="w-4 h-4" />
                إضافة عقار
              </Button>
            </Link>
          </div>
        </div>

        {/* Status summary cards */}
        {counts.all > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setFilterStatus("all")}>
              <p className="text-2xl font-bold text-slate-800">{counts.all}</p>
              <p className="text-xs text-slate-500 mt-0.5">الكل</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => setFilterStatus("approved")}>
              <p className="text-2xl font-bold text-emerald-700">{counts.published}</p>
              <p className="text-xs text-emerald-600/80 mt-0.5">موافق عليه</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => setFilterStatus("pending")}>
              <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
              <p className="text-xs text-amber-600/80 mt-0.5">قيد المراجعة</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setFilterStatus("rejected")}>
              <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
              <p className="text-xs text-red-600/80 mt-0.5">مرفوض</p>
            </div>
          </div>
        )}

        {/* Filter tabs + Search row */}
        {counts.all > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key as any)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    filterStatus === tab.key
                      ? `${tab.cls} bg-white shadow-sm font-semibold`
                      : "text-slate-500 border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="mr-1.5 bg-current/10 text-current rounded-full px-1.5 py-0.5 text-[10px]">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {counts.all > 2 && (
              <div className="relative w-full sm:w-52">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في عقاراتك..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9 rounded-xl text-sm h-9"
                />
              </div>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden animate-pulse">
                <div className="h-36 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && counts.all === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold mb-2">لا توجد عقارات معلنة</h3>
              <p className="text-sm text-muted-foreground mb-6">أضف أول عقار لك وابدأ في استقبال العروض</p>
              <Link href="/add-property">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2">
                  <Plus className="w-4 h-4" />
                  أضف عقارك الأول
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Properties grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((prop: any) => {
              const cfg = getStatus(prop.status);
              const StatusIcon = cfg.icon;
              let firstImage: string | null = null;
              try {
                const imgs = JSON.parse(prop.images ?? "[]");
                firstImage = imgs[0] ?? null;
              } catch {
                firstImage = prop.images ?? null;
              }

              return (
                <Card
                  key={prop.id}
                  className={`overflow-hidden hover:shadow-md transition-all group border ${
                    prop.status === "pending"
                      ? "border-amber-200"
                      : prop.status === "rejected"
                      ? "border-red-200"
                      : "border-border/50"
                  }`}
                >
                  {/* Property image */}
                  <div className="relative h-40 bg-muted">
                    {firstImage ? (
                      <img src={firstImage} alt={prop.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Status badge */}
                    <span className={`absolute top-2 right-2 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border ${cfg.badgeCls}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>

                    {/* Listing type */}
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                      {listingTypeLabel(prop.listingType)}
                    </span>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{prop.title}</h3>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {[prop.district, prop.address].filter(Boolean).join("، ") || "الموقع غير محدد"}
                      </span>
                    </div>

                    {prop.price && (
                      <p className="font-bold text-sm text-teal-700 dark:text-teal-400 mb-2">
                        {Number(prop.price).toLocaleString("ar-EG")} ج.م
                      </p>
                    )}

                    {/* Status message banner */}
                    <div className={`mb-2 flex items-start gap-1.5 p-2 rounded-lg border text-xs ${cfg.bannerCls}`}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{cfg.bannerMsg}</span>
                    </div>

                    {/* Rejection reason panel */}
                    {prop.status === "rejected" && prop.rejectionReason && (
                      <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                        <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          أسباب الرفض:
                        </p>
                        <div className="text-xs text-red-700 leading-relaxed space-y-0.5">
                          {String(prop.rejectionReason).split("\n").map((line: string, i: number) =>
                            line.trim() ? (
                              <p key={i} className="flex items-start gap-1.5">
                                <span className="shrink-0 mt-0.5">•</span>
                                <span>{line.trim()}</span>
                              </p>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {prop.viewCount ?? 0} مشاهدة
                        </span>
                        {(prop.phoneClickCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-teal-600">
                            <Phone className="w-3 h-3" />
                            {prop.phoneClickCount} ضغطة اتصال
                          </span>
                        )}
                      </div>
                      <span>{prop.createdAt ? fmtDate(prop.createdAt) : ""}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Edit button — available for all statuses */}
                      <Link href={`/user/edit-property/${prop.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-lg text-xs h-8 gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                        >
                          <Pencil className="w-3 h-3" />
                          {prop.status === "rejected" ? "تعديل وإعادة التقديم" : "تعديل"}
                        </Button>
                      </Link>

                      {/* View — only for published */}
                      {prop.status === "approved" && (
                        <Link href={`/property/${prop.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg text-xs h-8 px-2.5 gap-1">
                            <Eye className="w-3 h-3" />
                            عرض
                          </Button>
                        </Link>
                      )}

                      {/* Delete */}
                      {deletingId === prop.id ? (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-xs text-muted-foreground">تأكيد؟</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-lg text-xs h-8 px-2"
                            onClick={() => deleteMutation.mutate(prop.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? "..." : "نعم"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-xs h-8 px-2"
                            onClick={() => setDeletingId(null)}
                          >
                            لا
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-xs h-8 px-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
                          onClick={() => setDeletingId(prop.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* No search results */}
        {!isLoading && counts.all > 0 && filtered.length === 0 && (
          <div className="py-10 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد نتائج مطابقة</p>
            <button
              className="text-xs text-teal-600 hover:underline mt-1"
              onClick={() => { setSearch(""); setFilterStatus("all"); }}
            >
              مسح الفلاتر
            </button>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
