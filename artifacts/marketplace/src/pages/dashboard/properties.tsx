import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Building2, Plus, Trash2, Clock, CheckCircle2, XCircle, AlertCircle,
  Search, RefreshCw, Eye, Pencil, Star, CheckCheck, LayoutGrid,
  TrendingUp, Home, TreePine, Loader2, MapPin, DollarSign,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, mediaUrl } from "@/lib/api";
import { useRole } from "@/lib/use-role";
import toast from "react-hot-toast";
import { NO_IMAGE_PLACEHOLDER } from "@/lib/no-image-placeholder";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: "قيد الموافقة", color: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock },
  approved: { label: "موافق عليه",   color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  active:   { label: "نشط",          color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  sold:     { label: "مُباع",         color: "bg-blue-50 text-blue-700 border-blue-200",      icon: CheckCheck },
  rented:   { label: "مُؤجَّر",        color: "bg-purple-50 text-purple-700 border-purple-200",  icon: CheckCheck },
  rejected: { label: "مرفوض",        color: "bg-red-50 text-red-700 border-red-200",          icon: XCircle },
  draft:    { label: "مسودة",         color: "bg-gray-100 text-gray-600 border-gray-200",     icon: AlertCircle },
};

function getStatus(s: string) {
  return STATUS_LABELS[s] ?? STATUS_LABELS.pending;
}

const LISTING_LABELS: Record<string, { label: string; color: string }> = {
  sale: { label: "للبيع",    color: "bg-teal-600 text-white" },
  rent: { label: "للإيجار",  color: "bg-blue-600 text-white" },
};

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  residential: { label: "سكني",  icon: Home },
  commercial:  { label: "تجاري", icon: Building2 },
  land:        { label: "أرض",   icon: TreePine },
};

interface Property {
  id: number;
  title: string;
  mainCategory?: string;
  listingType?: string;
  price?: string;
  area?: string;
  city?: string;
  district?: string;
  status: string;
  featured?: boolean;
  viewCount?: number;
  images?: string[];
  createdAt?: string;
}

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ElementType; label: string; value: number; color: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white dark:bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all text-right w-full ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-foreground leading-none">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      </div>
    </button>
  );
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function fmtPrice(p?: string) {
  if (!p || p === "0") return null;
  return Number(p).toLocaleString("ar-EG");
}

export default function PropertiesPage() {
  const { user, isProvider } = useRole();
  const queryClient = useQueryClient();

  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDeal, setFilterDeal]   = useState("all");
  const [deleteId, setDeleteId]       = useState<number | null>(null);

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
    total:      allProps.length,
    published:  allProps.filter(p => p.status === "approved" || p.status === "active").length,
    pending:    allProps.filter(p => p.status === "pending").length,
    sale:       allProps.filter(p => p.listingType === "sale").length,
    rent:       allProps.filter(p => p.listingType === "rent").length,
    featured:   allProps.filter(p => p.featured).length,
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
      <TooltipProvider>
        <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-500" dir="rtl">

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

          {/* Stats */}
          {allProps.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={LayoutGrid}  label="إجمالي العقارات" value={stats.total}     color="bg-primary/10 text-primary"         onClick={() => setFilterStatus("all")} />
              <StatCard icon={CheckCircle2} label="موافق عليه"      value={stats.published} color="bg-emerald-50 text-emerald-600"     onClick={() => setFilterStatus("approved")} />
              <StatCard icon={Clock}       label="قيد الموافقة"     value={stats.pending}   color="bg-amber-50 text-amber-500"         onClick={() => setFilterStatus("pending")} />
              <StatCard icon={Eye}         label="إجمالي المشاهدات" value={stats.totalViews} color="bg-sky-50 text-sky-600" />
              {isProvider && (
                <>
                  <StatCard icon={Home}       label="للبيع"   value={stats.sale}     color="bg-teal-50 text-teal-600"   onClick={() => setFilterDeal("sale")} />
                  <StatCard icon={TrendingUp} label="للإيجار" value={stats.rent}     color="bg-blue-50 text-blue-600"   onClick={() => setFilterDeal("rent")} />
                  <StatCard icon={Star}       label="مميز"    value={stats.featured} color="bg-amber-50 text-amber-500" />
                </>
              )}
            </div>
          )}

          {/* Filters */}
          {allProps.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في عقاراتك..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9 rounded-xl text-sm h-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44 rounded-xl h-9 text-sm">
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
              {(filterStatus !== "all" || filterDeal !== "all" || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
                  onClick={() => { setFilterStatus("all"); setFilterDeal("all"); setSearch(""); }}
                >
                  مسح الفلاتر
                </Button>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="bg-white dark:bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/40 animate-pulse last:border-0">
                  <div className="w-16 h-12 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-full" />
                  <div className="h-6 w-16 bg-muted rounded-full" />
                  <div className="h-8 w-24 bg-muted rounded-lg" />
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

          {/* ─── Table ─────────────────────────────────────────────────────── */}
          {!isLoading && filtered.length > 0 && (
            <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">

              {/* Table header */}
              <div className="hidden md:grid grid-cols-[64px_1fr_120px_90px_110px_120px_100px] gap-x-4 items-center px-5 py-3 bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span></span>
                <span>العقار</span>
                <span className="text-center">الحالة</span>
                <span className="text-center">النوع</span>
                <span className="text-center">السعر</span>
                <span className="text-center">التاريخ</span>
                <span className="text-center">الإجراءات</span>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-border/40">
                {filtered.map((p) => {
                  const img        = firstImage(p);
                  const statusCfg  = getStatus(p.status);
                  const StatusIcon = statusCfg.icon;
                  const catCfg     = CATEGORY_LABELS[p.mainCategory ?? ""] ?? null;
                  const CatIcon    = catCfg?.icon ?? Building2;
                  const dealCfg    = LISTING_LABELS[p.listingType ?? ""] ?? null;
                  const price      = fmtPrice(p.price);

                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-1 md:grid-cols-[64px_1fr_120px_90px_110px_120px_100px] gap-x-4 gap-y-2 items-center px-5 py-4 hover:bg-muted/20 transition-colors group"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0 hidden md:block">
                        <img
                          src={img ?? NO_IMAGE_PLACEHOLDER}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Title + meta */}
                      <div className="min-w-0 flex gap-3 items-start md:items-center">
                        {/* Mobile thumbnail */}
                        <div className="w-14 h-12 rounded-lg overflow-hidden bg-muted shrink-0 md:hidden">
                          <img
                            src={img ?? NO_IMAGE_PLACEHOLDER}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {p.featured && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" /> مميز
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm text-foreground line-clamp-1 leading-snug">{p.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {catCfg && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                                <CatIcon className="w-3 h-3" /> {catCfg.label}
                              </span>
                            )}
                            {(p.city || p.district) && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                <MapPin className="w-2.5 h-2.5" /> {p.district || p.city}
                              </span>
                            )}
                            {(p.viewCount ?? 0) > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                <Eye className="w-2.5 h-2.5" /> {p.viewCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex md:justify-center">
                        <Badge variant="outline" className={`text-[11px] px-2 py-0.5 flex items-center gap-1 w-fit font-medium ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {/* Deal type */}
                      <div className="flex md:justify-center">
                        {dealCfg ? (
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${dealCfg.color}`}>
                            {dealCfg.label}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </div>

                      {/* Price */}
                      <div className="flex md:justify-center items-center gap-1">
                        {price ? (
                          <span className="text-sm font-bold text-teal-700 dark:text-teal-400 flex items-center gap-0.5">
                            <DollarSign className="w-3 h-3 opacity-70" />
                            {price}
                            <span className="text-[10px] font-normal text-muted-foreground">ج.م</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex md:justify-center">
                        <span className="text-xs text-muted-foreground">{fmtDate(p.createdAt)}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 md:justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/property/${p.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>عرض</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/dashboard/edit-property/${p.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>تعديل</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteId(p.id)}
                              disabled={deleteMut.isPending && deleteId === p.id}
                            >
                              {deleteMut.isPending && deleteId === p.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>حذف</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table footer */}
              <div className="px-5 py-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  إجمالي: <span className="font-semibold text-foreground">{filtered.length}</span> عقار
                  {filtered.length !== allProps.length && (
                    <span className="mr-1">(من {allProps.length})</span>
                  )}
                </p>
              </div>
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
      </TooltipProvider>
    </DashboardLayout>
  );
}
