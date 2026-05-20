import { useState, useMemo } from "react";
import { NO_IMAGE_PLACEHOLDER } from "@/lib/no-image-placeholder";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import ProviderLayout from "@/components/ProviderLayout";
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, RefreshCw, Search, Eye, Pencil, Star, CheckCircle,
  XCircle, Trash2, Home, Building2, TreePine, TrendingUp,
  AlertCircle, CheckCheck, LayoutGrid, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Property {
  id: number;
  providerId: number;
  title: string;
  mainCategory: string;
  listingType: string;
  subCategory?: string;
  price?: string;
  area?: string;
  rooms?: number;
  bathrooms?: number;
  floor?: number;
  images?: string[];
  status: string;
  featured?: boolean;
  viewCount?: number;
  phoneClickCount?: number;
  createdAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "قيد الموافقة", color: "bg-amber-100 text-amber-700 border-amber-200" },
  published: { label: "منشور",        color: "bg-green-100 text-green-700 border-green-200" },
  active:    { label: "نشط",          color: "bg-green-100 text-green-700 border-green-200" },
  sold:      { label: "مُباع",         color: "bg-blue-100 text-blue-700 border-blue-200" },
  rented:    { label: "مُؤجَّر",        color: "bg-purple-100 text-purple-700 border-purple-200" },
  rejected:  { label: "مرفوض",        color: "bg-red-100 text-red-700 border-red-200" },
  draft:     { label: "مسودة",         color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Home }> = {
  residential: { label: "سكني",  icon: Home },
  commercial:  { label: "تجاري", icon: Building2 },
  land:        { label: "أرض",   icon: TreePine },
};

const LISTING_LABELS: Record<string, string> = {
  sale: "للبيع",
  rent: "للإيجار",
};

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Home; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/60 p-4 flex items-center gap-4 shadow-sm">
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyPropertiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [filterDeal, setFilterDeal] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: reCategories = [] } = useQuery<{ id: number; nameAr: string; slug: string | null }[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
    staleTime: 5 * 60 * 1000,
  });

  const getCatLabel = (slug: string) => reCategories.find(c => (c.slug ?? String(c.id)) === slug)?.nameAr ?? CATEGORY_LABELS[slug]?.label ?? slug;

  // fetch my properties
  const { data: raw, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["my-properties", user?.id],
    queryFn: () => (api.properties as any).list({ providerId: user?.providerId }),
    enabled: !!user?.providerId,
    staleTime: 10_000,
  });

  const allProps: Property[] = useMemo(() => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Property[];
    if (Array.isArray((raw as any).data)) return (raw as any).data as Property[];
    return [];
  }, [raw]);

  // Stats
  const stats = useMemo(() => ({
    rent:      allProps.filter(p => p.listingType === "rent").length,
    sale:      allProps.filter(p => p.listingType === "sale").length,
    featured:  allProps.filter(p => p.featured).length,
    pending:   allProps.filter(p => p.status === "pending").length,
    published: allProps.filter(p => p.status === "published" || p.status === "active").length,
    total:     allProps.length,
  }), [allProps]);

  // Filtered list
  const filtered = useMemo(() => allProps.filter(p => {
    if (filterDeal !== "all" && p.listingType !== filterDeal) return false;
    if (filterType !== "all" && p.mainCategory !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allProps, filterDeal, filterType, filterStatus, search]);

  // Mutations
  const deleteMut = useMutation({
    mutationFn: (id: number) => (api.properties as any).delete(id),
    onSuccess: () => {
      toast.success("تم حذف العقار");
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
      setDeleteId(null);
    },
    onError: () => toast.error("فشل الحذف"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      (api.properties as any).patchStatus(id, status),
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
    },
    onError: () => toast.error("فشل التحديث"),
  });

  const featureMut = useMutation({
    mutationFn: ({ id, featured }: { id: number; featured: boolean }) =>
      (api.properties as any).update(id, { featured }),
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
    },
    onError: () => toast.error("فشل التحديث"),
  });

  const firstImage = (p: Property) => {
    const imgs = Array.isArray(p.images) ? p.images : [];
    return imgs[0] ?? null;
  };

  return (
    <ProviderLayout>
      <TooltipProvider>
        <div className="p-4 sm:p-6 space-y-6" dir="rtl">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">عقاراتي</h1>
              <p className="text-sm text-muted-foreground mt-0.5">إدارة وتتبع جميع إعلاناتك العقارية</p>
            </div>
            <Link href="/add-property">
              <Button className="gap-1.5 rounded-full font-bold bg-primary hover:bg-primary/90 text-white shadow">
                <Plus className="w-4 h-4" />
                إضافة عقار
              </Button>
            </Link>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={TrendingUp}    label="للإيجار"       value={stats.rent}      color="bg-blue-50 text-blue-600" />
            <StatCard icon={Home}          label="للبيع"          value={stats.sale}      color="bg-teal-50 text-teal-600" />
            <StatCard icon={Star}          label="مميز"           value={stats.featured}  color="bg-amber-50 text-amber-500" />
            <StatCard icon={AlertCircle}   label="قيد الموافقة"  value={stats.pending}   color="bg-orange-50 text-orange-500" />
            <StatCard icon={CheckCheck}    label="منشور"          value={stats.published} color="bg-green-50 text-green-600" />
            <StatCard icon={LayoutGrid}    label="إجمالي العقارات" value={stats.total}   color="bg-primary/10 text-primary" />
          </div>

          {/* ── Filters & search ── */}
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالعنوان أو الموقع..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9 rounded-xl"
                />
              </div>
              {/* Deal type */}
              <Select value={filterDeal} onValueChange={setFilterDeal}>
                <SelectTrigger className="w-full sm:w-40 rounded-xl">
                  <SelectValue placeholder="كل الصفقات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الصفقات</SelectItem>
                  <SelectItem value="sale">للبيع</SelectItem>
                  <SelectItem value="rent">للإيجار</SelectItem>
                </SelectContent>
              </Select>
              {/* Property type — dynamic from admin real estate categories */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-40 rounded-xl">
                  <SelectValue placeholder="كل الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {reCategories.length > 0
                    ? reCategories.map(c => <SelectItem key={c.id} value={c.slug ?? String(c.id)}>{c.nameAr}</SelectItem>)
                    : <>
                        <SelectItem value="residential">سكني</SelectItem>
                        <SelectItem value="commercial">تجاري</SelectItem>
                        <SelectItem value="land">أراضي</SelectItem>
                      </>
                  }
                </SelectContent>
              </Select>
              {/* Status */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40 rounded-xl">
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="pending">قيد الموافقة</SelectItem>
                  <SelectItem value="published">منشور</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="sold">مُباع</SelectItem>
                  <SelectItem value="rented">مُؤجَّر</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl shrink-0"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Count row */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{filtered.length} عقار</span>
              {(filterDeal !== "all" || filterType !== "all" || filterStatus !== "all" || search) && (
                <button
                  className="text-primary hover:underline text-xs"
                  onClick={() => { setSearch(""); setFilterDeal("all"); setFilterType("all"); setFilterStatus("all"); }}
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جار التحميل...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Home className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">لا توجد عقارات</p>
                  <p className="text-sm text-muted-foreground mt-1">ابدأ بإضافة أول عقار لك الآن</p>
                </div>
                <Link href="/add-property">
                  <Button className="rounded-full gap-1.5 font-bold">
                    <Plus className="w-4 h-4" /> إضافة عقار
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">صورة</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">العقار</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">النوع</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">التفاصيل</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">السعر</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">📊 إحصائيات</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">مميز</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الحالة</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((prop, idx) => {
                      const img = firstImage(prop);
                      const cat = CATEGORY_LABELS[prop.mainCategory];
                      const CatIcon = cat?.icon ?? Home;
                      const status = STATUS_LABELS[prop.status] ?? { label: prop.status, color: "bg-gray-100 text-gray-600 border-gray-200" };
                      return (
                        <tr
                          key={prop.id}
                          className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${idx % 2 === 1 ? "bg-muted/10" : ""}`}
                        >
                          {/* Thumbnail */}
                          <td className="px-4 py-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted border border-border/60 shrink-0">
                              <img
                                src={img ? mediaUrl(img) : NO_IMAGE_PLACEHOLDER}
                                alt={prop.title}
                                className="w-full h-full object-cover"
                                onError={e => { e.currentTarget.src = NO_IMAGE_PLACEHOLDER; }}
                              />
                            </div>
                          </td>

                          {/* Title + ID */}
                          <td className="px-4 py-3 max-w-[180px]">
                            <p className="font-semibold text-foreground truncate">{prop.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">#{prop.id}</p>
                          </td>

                          {/* Category + Listing type */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                              <CatIcon className="w-3 h-3" />
                              {getCatLabel(prop.mainCategory)}
                            </span>
                            <span className={`mt-1 block text-xs font-medium ${prop.listingType === "rent" ? "text-blue-600" : "text-teal-600"}`}>
                              {LISTING_LABELS[prop.listingType] ?? prop.listingType}
                            </span>
                          </td>

                          {/* Details */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {prop.rooms && <span>🛏 {prop.rooms} غرف</span>}
                              {prop.bathrooms && <span>🚿 {prop.bathrooms} حمام</span>}
                              {prop.area && <span>📐 {prop.area} م²</span>}
                            </div>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                            {prop.price
                              ? `${Number(prop.price).toLocaleString("ar-EG")} ج.م`
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </td>

                          {/* Stats */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="flex items-center gap-1 text-blue-600">
                                <Eye className="w-3 h-3" />
                                {(prop.viewCount ?? 0).toLocaleString("ar-EG")} مشاهدة
                              </span>
                              <span className="flex items-center gap-1 text-teal-600">
                                <TrendingUp className="w-3 h-3" />
                                {(prop.phoneClickCount ?? 0).toLocaleString("ar-EG")} ضغطة اتصال
                              </span>
                            </div>
                          </td>

                          {/* Featured toggle */}
                          <td className="px-4 py-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setLocation("/dashboard/subscription")}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    prop.featured
                                      ? "bg-amber-100 text-amber-500 hover:bg-amber-200"
                                      : "bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-400"
                                  }`}
                                >
                                  <Star className={`w-4 h-4 ${prop.featured ? "fill-amber-400" : ""}`} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{prop.featured ? "أنت مميز — عدّل باقتك" : "تميّز عقارك — اشترك الآن"}</TooltipContent>
                            </Tooltip>
                          </td>

                          {/* Status badge */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                              {status.label}
                            </span>
                          </td>

                          {/* Action buttons */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {/* View */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/property/${prop.id}`}>
                                    <button className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors">
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>عرض</TooltipContent>
                              </Tooltip>

                              {/* Edit */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/dashboard/property-edit/${prop.id}`}>
                                    <button className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 flex items-center justify-center transition-colors">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>تعديل</TooltipContent>
                              </Tooltip>

                              {/* Publish (if pending/rejected) */}
                              {(prop.status === "pending" || prop.status === "rejected" || prop.status === "draft") && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => statusMut.mutate({ id: prop.id, status: "published" })}
                                      disabled={statusMut.isPending}
                                      className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>نشر</TooltipContent>
                                </Tooltip>
                              )}

                              {/* Mark sold/rented */}
                              {(prop.status === "published" || prop.status === "active") && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => statusMut.mutate({
                                        id: prop.id,
                                        status: prop.listingType === "rent" ? "rented" : "sold",
                                      })}
                                      disabled={statusMut.isPending}
                                      className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center transition-colors"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{prop.listingType === "rent" ? "مُؤجَّر" : "مُباع"}</TooltipContent>
                                </Tooltip>
                              )}

                              {/* Delete */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setDeleteId(prop.id)}
                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>حذف</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Delete confirm dialog ── */}
        <AlertDialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف العقار</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا العقار؟ لا يمكن التراجع عن هذه العملية.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteId && deleteMut.mutate(deleteId)}
              >
                {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
              </AlertDialogAction>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </ProviderLayout>
  );
}
