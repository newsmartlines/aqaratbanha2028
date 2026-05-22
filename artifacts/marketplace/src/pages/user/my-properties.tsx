import { useState } from "react";
import { Link } from "wouter";
import {
  Building2,
  MapPin,
  Eye,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Home,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function statusBadge(status: string) {
  if (status === "active") return { label: "نشط", icon: CheckCircle2, cls: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" };
  if (status === "rejected") return { label: "مرفوض", icon: XCircle, cls: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" };
  return { label: "قيد المراجعة", icon: Clock, cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" };
}

function listingTypeLabel(type: string) {
  if (type === "sale") return "للبيع";
  if (type === "rent") return "للإيجار";
  return type;
}

export default function MyPropertiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["user-properties"],
    queryFn: () => api.userProperties.list(),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.properties.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-properties"] });
      setDeletingId(null);
    },
  });

  const filtered = properties.filter((p: any) =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.mainCategory?.includes(search) ||
    p.address?.includes(search) ||
    p.district?.includes(search)
  );

  const counts = {
    active: properties.filter((p: any) => p.status === "active").length,
    pending: properties.filter((p: any) => p.status !== "active" && p.status !== "rejected").length,
    rejected: properties.filter((p: any) => p.status === "rejected").length,
  };

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
              {properties.length} إعلان مسجل
            </p>
          </div>
          <Link href="/user/add-property">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              إضافة عقار
            </Button>
          </Link>
        </div>

        {/* Stats summary */}
        {properties.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200/50 dark:border-green-900/50 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{counts.active}</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/70 mt-0.5">نشط</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/50 text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{counts.pending}</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">قيد المراجعة</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200/50 dark:border-red-900/50 text-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{counts.rejected}</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">مرفوض</p>
            </div>
          </div>
        )}

        {/* Search */}
        {properties.length > 3 && (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث في عقاراتك..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 rounded-xl"
            />
          </div>
        )}

        {/* Loading */}
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
        {!isLoading && properties.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold mb-2">لا توجد عقارات معلنة</h3>
              <p className="text-sm text-muted-foreground mb-6">أضف أول عقار لك وابدأ في استقبال العروض</p>
              <Link href="/user/add-property">
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
              const badge = statusBadge(prop.status);
              const BadgeIcon = badge.icon;
              let firstImage: string | null = null;
              try {
                const imgs = JSON.parse(prop.images ?? "[]");
                firstImage = imgs[0] ?? null;
              } catch {
                firstImage = prop.images ?? null;
              }

              return (
                <Card key={prop.id} className="border-border/50 overflow-hidden hover:shadow-md transition-shadow group">
                  {/* Property image */}
                  <div className="relative h-36 bg-muted">
                    {firstImage ? (
                      <img src={firstImage} alt={prop.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.cls}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                      {listingTypeLabel(prop.listingType)}
                    </span>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2">{prop.title}</h3>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {[prop.district, prop.address].filter(Boolean).join("، ") || "الموقع غير محدد"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {prop.viewCount ?? 0} مشاهدة
                      </span>
                      <span>{prop.area ? `${prop.area} م²` : prop.mainCategory}</span>
                    </div>

                    {prop.price && (
                      <p className="mt-2 font-bold text-sm text-teal-700 dark:text-teal-400">
                        {Number(prop.price).toLocaleString("ar-EG")} ج.م
                      </p>
                    )}

                    {/* Status message */}
                    {prop.status === "pending" && (
                      <div className="mt-3 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        قيد المراجعة — سيتم نشره خلال 24 ساعة
                      </div>
                    )}
                    {prop.status === "rejected" && (
                      <div className="mt-3 flex items-start gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-400">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        تم رفض الإعلان — يرجى مراجعة بيانات العقار
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex justify-between items-center gap-2">
                      {prop.status === "active" && (
                        <Link href={`/property/${prop.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg text-xs h-7 px-2 gap-1">
                            <Eye className="w-3 h-3" />
                            عرض
                          </Button>
                        </Link>
                      )}
                      <div className="mr-auto">
                        {deletingId === prop.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">تأكيد الحذف؟</span>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="rounded-lg text-xs h-7 px-2"
                              onClick={() => deleteMutation.mutate(prop.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? "..." : "نعم"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg text-xs h-7 px-2"
                              onClick={() => setDeletingId(null)}
                            >
                              لا
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-xs h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
                            onClick={() => setDeletingId(prop.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            حذف
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* No search results */}
        {!isLoading && properties.length > 0 && filtered.length === 0 && (
          <div className="py-10 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد نتائج لـ "{search}"</p>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
