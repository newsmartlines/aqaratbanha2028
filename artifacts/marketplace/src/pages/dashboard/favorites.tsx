import { useState } from "react";
import { Link } from "wouter";
import {
  Heart,
  MapPin,
  Loader2,
  Building2,
  Trash2,
  Search,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function listingTypeLabel(type: string) {
  if (type === "sale") return "للبيع";
  if (type === "rent") return "للإيجار";
  return type ?? "";
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<number | null>(null);

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["property-favorites"],
    queryFn: () => api.propertyFavorites.list(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (propertyId: number) => api.propertyFavorites.remove(propertyId),
    onMutate: (propertyId) => setRemovingId(propertyId),
    onSettled: () => {
      setRemovingId(null);
      queryClient.invalidateQueries({ queryKey: ["property-favorites"] });
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
              المفضلة
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">العقارات التي قمت بحفظها</p>
          </div>
          {!isLoading && favorites.length > 0 && (
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              {favorites.length} عقار محفوظ
            </Badge>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        )}

        {!isLoading && favorites.length === 0 && (
          <div className="text-center py-20 bg-secondary/20 rounded-2xl border border-border/50">
            <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-rose-300" />
            </div>
            <h3 className="text-xl font-bold mb-2">لا توجد عقارات محفوظة</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              لم تقم بإضافة أي عقارات إلى مفضلتك بعد. تصفح العقارات واضغط على قلب ❤️ لحفظها هنا.
            </p>
            <Link href="/properties">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2">
                <Search className="w-4 h-4" />
                تصفح العقارات
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && favorites.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favorites.map((fav: any) => {
              let firstImage: string | null = null;
              try {
                const imgs = JSON.parse(fav.images ?? "[]");
                firstImage = imgs[0] ?? null;
              } catch {
                firstImage = fav.images ?? null;
              }
              const isRemoving = removingId === fav.propertyId;

              return (
                <Card
                  key={fav.id}
                  className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-muted">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={fav.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}
                    <button
                      onClick={() => removeMutation.mutate(fav.propertyId)}
                      disabled={isRemoving}
                      title="إزالة من المفضلة"
                      className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center text-rose-500 hover:bg-white transition-colors shadow-sm disabled:opacity-60"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Heart className="w-4 h-4 fill-rose-500" />
                      )}
                    </button>
                    {fav.listingType && (
                      <span className="absolute top-2 right-2 bg-teal-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        {listingTypeLabel(fav.listingType)}
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4">
                    {fav.mainCategory && (
                      <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 mb-1 block">
                        {fav.mainCategory}
                      </span>
                    )}
                    <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-2 leading-snug">
                      {fav.title}
                    </h3>
                    {(fav.district || fav.address) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {[fav.district, fav.address].filter(Boolean).join("، ")}
                        </span>
                      </div>
                    )}
                    {fav.price && (
                      <p className="font-bold text-base text-teal-700 dark:text-teal-400 mb-3">
                        {Number(fav.price).toLocaleString("ar-EG")} ج.م
                        {fav.listingType === "rent" && (
                          <span className="text-xs text-muted-foreground font-normal mr-1">/ شهرياً</span>
                        )}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40">
                      <Link href={`/property/${fav.propertyId}`}>
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs rounded-lg">
                          عرض العقار
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                        onClick={() => removeMutation.mutate(fav.propertyId)}
                        disabled={isRemoving}
                      >
                        <Trash2 className="w-3 h-3" />
                        إزالة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
