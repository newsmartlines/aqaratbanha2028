import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Building2, Plus, Trash2, Clock, CheckCircle2, XCircle, AlertCircle,
  Search, RefreshCw, Eye, Pencil, Star, CheckCheck, LayoutGrid,
  TrendingUp, Home, TreePine, Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";
import { NO_IMAGE_PLACEHOLDER } from "@/lib/no-image-placeholder";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: "قيد الموافقة", color: "bg-amber-100 text-amber-700 border-amber-200",  icon: Clock },
  approved: { label: "موافق عليه",   color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2 },
  active:   { label: "نشط",          color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2 },
  sold:     { label: "مُباع",         color: "bg-blue-100 text-blue-700 border-blue-200",    icon: CheckCheck },
  rented:   { label: "مُؤجَّر",        color: "bg-purple-100 text-purple-700 border-purple-200", icon: CheckCheck },
  rejected: { label: "مرفوض",        color: "bg-red-100 text-red-700 border-red-200",        icon: XCircle },
  draft:    { label: "مسودة",         color: "bg-gray-100 text-gray-600 border-gray-200",    icon: AlertCircle },
};

function getStatus(s: string) {
  return STATUS_LABELS[s] ?? STATUS_LABELS.pending;
}

const LISTING_LABELS: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  residential: { label: "سكني", icon: Home },
  commercial:  { label: "تجاري", icon: Building2 },
  land:        { label: "أرض", icon: TreePine },
};

interface Property {
  id: number;
  title: string;
  mainCategory?: string;
  listingType?: string;
  price?: string;
  area?: string;
  status: string;
  featured?: boolean;
  viewCount?: number;
  images?: string[];
  createdAt?: string;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-foreground leading-none">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isProvider = user?.role === "provider";

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDeal, setFilterDeal] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Provider fetches by providerId; user fetches their own properties
  const { data: raw, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["my-properties", user?.id, user?.providerId],
    queryFn: () => isProvider
      ? (api.properties as any).list({ providerId: user?.providerId })
      : api.userProperties.list(),
    enabled: !!user && (isProvider ? !!user.providerId : true),
    staleTime: 10_000,
  });

  const allProps: Property[] = useMemo(() => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Property[];
    if (Array.isArray((raw as any).data)) return (raw as any).data as Property[];
    return [];
  }, [raw]);

  const filtered = useMemo(() => allProps.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterDeal !== "all" && p.listingType !== filterDeal) return false;
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allProps, filterStatus, filterDeal, search]);

  const stats = useMemo(() => ({
    total: allProps.length,
    published: allProps.filter(p => p.status === "approved" || p.status === "active").length,
    pending: allProps.filter(p => p.status === "pending").length,
    sale: allProps.filter(p => p.listingType === "sale").length,
    rent: allProps.filter(p => p.listingType === "rent").length,
    featured: allProps.filter(p => p.featured).length,
    totalViews: allProps.reduce((s, p) => s + (p.viewCount ?? 0), 0),
  }), [allProps]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => (api.properties as any).delete(id),
    onSuccess: () => {
      toast.success("تم حذف العقار");
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
      setDeleteId(null);
    },
    onError: () => toast.error("فشل الحذف"),
  });

  const firstImage = (p: Property) => {
    const imgs = Array.isArray(p.images) ? p.images : [];
    const img = imgs[0] ?? null;
    if (!img) return null;
    try { return mediaUrl(img); } catch { return img; }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">عقاراتي</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isProvider ? "إدارة وتتبع جميع إعلاناتك العقارية" : "جميع عقاراتك المعلنة في مكان واحد"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Link href="/add-property">
              <Button className="gap-1.5 rounded-full font-bold bg-primary hover:bg-primary/90 text-white shadow">
                <Plus className="w-4 h-4" />
                إضافة عقار
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats — provider gets richer stats */}
        {isProvider && allProps.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard icon={TrendingUp}  label="للإيجار"         value={stats.rent}       color="bg-blue-50 text-blue-600" />
            <StatCard icon={Home}        label="للبيع"            value={stats.sale}       color="bg-teal-50 text-teal-600" />
            <StatCard icon={Star}        label="مميز"             value={stats.featured}   color="bg-amber-50 text-amber-500" />
            <StatCard icon={AlertCircle} label="قيد الموافقة"    value={stats.pending}    color="bg-orange-50 text-orange-500" />
            <StatCard icon={CheckCheck}  label="منشور"            value={stats.published}  color="bg-green-50 text-green-600" />
            <StatCard icon={LayoutGrid}  label="إجمالي العقارات" value={stats.total}      color="bg-primary/10 text-primary" />
            <StatCard icon={Eye}         label="إجمالي المشاهدات" value={stats.totalViews} color="bg-sky-50 text-sky-600" />
          </div>
        )}

        {/* User compact stats */}
        {!isProvider && allProps.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "الكل", value: stats.total, cls: "bg-slate-50 border-slate-200 text-slate-800", onClick: () => setFilterStatus("all") },
              { label: "موافق عليه", value: stats.published, cls: "bg-emerald-50 border-emerald-200 text-emerald-700", onClick: () => setFilterStatus("approved") },
              { label: "قيد المراجعة", value: stats.pending, cls: "bg-amber-50 border-amber-200 text-amber-700", onClick: () => setFilterStatus("pending") },
              { label: "للبيع", value: stats.sale, cls: "bg-blue-50 border-blue-200 text-blue-700", onClick: () => setFilterDeal("sale") },
            ].map((s) => (
              <div
                key={s.label}
                className={`p-3 rounded-xl border text-center cursor-pointer hover:opacity-80 transition-opacity ${s.cls}`}
                onClick={s.onClick}
              >
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs mt-0.5 opacity-75">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {allProps.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث في عقاراتك..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 rounded-xl text-sm h-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 rounded-xl h-9 text-sm">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد الموافقة</SelectItem>
                <SelectItem value="approved">موافق عليه</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                {isProvider && <SelectItem value="sold">مُباع</SelectItem>}
                {isProvider && <SelectItem value="rented">مُؤجَّر</SelectItem>}
              </SelectContent>
            </Select>
            <Select value={filterDeal} onValueChange={setFilterDeal}>
              <SelectTrigger className="w-36 rounded-xl h-9 text-sm">
                <SelectValue placeholder="نوع الصفقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="sale">للبيع</SelectItem>
                <SelectItem value="rent">للإيجار</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden animate-pulse">
                <div className="h-44 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allProps.length === 0 && (
          <div className="text-center py-20 bg-secondary/20 rounded-2xl border border-border/50">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
            <h3 className="text-xl font-bold mb-2">لا توجد عقارات بعد</h3>
            <p className="text-muted-foreground mb-6 text-sm">أضف أول عقار لك الآن وابدأ في استقبال الاستفسارات</p>
            <Link href="/add-property">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2">
                <Plus className="w-4 h-4" />
                أضف عقارك الآن
              </Button>
            </Link>
          </div>
        )}

        {/* No results */}
        {!isLoading && allProps.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد نتائج تطابق بحثك</p>
          </div>
        )}

        {/* Properties grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const img = firstImage(p);
              const statusCfg = getStatus(p.status);
              const StatusIcon = statusCfg.icon;
              const catCfg = CATEGORY_LABELS[p.mainCategory ?? ""] ?? null;
              const CatIcon = catCfg?.icon ?? Building2;

              return (
                <Card key={p.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all group">
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-muted">
                    <img
                      src={img ?? NO_IMAGE_PLACEHOLDER}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {p.featured && (
                      <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" /> مميز
                      </span>
                    )}
                    {p.listingType && (
                      <span className="absolute top-2 left-2 bg-teal-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        {LISTING_LABELS[p.listingType] ?? p.listingType}
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Category + title */}
                    <div>
                      {catCfg && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 mb-1">
                          <CatIcon className="w-3 h-3" /> {catCfg.label}
                        </span>
                      )}
                      <h3 className="font-bold text-sm line-clamp-2 leading-snug">{p.title}</h3>
                    </div>

                    {/* Status + price */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`text-[11px] px-2 py-0.5 flex items-center gap-1 ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </Badge>
                      {p.price && (
                        <span className="text-sm font-bold text-teal-700 dark:text-teal-400">
                          {Number(p.price).toLocaleString("ar-EG")} ج.م
                        </span>
                      )}
                    </div>

                    {/* Meta: date + views */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {p.createdAt && <span>{fmtDate(p.createdAt)}</span>}
                      {(p.viewCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {p.viewCount}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1 border-t border-border/40">
                      <Link href={`/property/${p.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs rounded-lg gap-1">
                          <Eye className="w-3 h-3" /> عرض
                        </Button>
                      </Link>
                      <Link href={`/dashboard/edit-property/${p.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs rounded-lg gap-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                          <Pencil className="w-3 h-3" /> تعديل
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteId(p.id)}
                        disabled={deleteMut.isPending && deleteId === p.id}
                      >
                        {deleteMut.isPending && deleteId === p.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete confirm */}
        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا العقار؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteId !== null && deleteMut.mutate(deleteId)}
              >
                حذف
              </AlertDialogAction>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
