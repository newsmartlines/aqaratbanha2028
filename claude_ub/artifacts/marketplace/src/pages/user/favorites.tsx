import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, Star, MapPin, Loader2 } from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, FavoriteItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function UserFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    api.favorites
      .list(user.id)
      .then(setFavorites)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const removeFavorite = async (providerId: number) => {
    if (!user?.id) return;
    setRemovingId(providerId);
    try {
      await api.favorites.remove(user.id, providerId);
      setFavorites((prev) => prev.filter((f) => f.providerId !== providerId));
    } catch {
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <UserLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">المفضلة</h1>
            <p className="text-muted-foreground mt-1">مزودو الخدمات الذين قمت بحفظهم</p>
          </div>
          {!loading && (
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              {favorites.length} مفضلة
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20 bg-secondary/20 rounded-2xl border border-border/50">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">لا توجد مفضلات بعد</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              لم تقم بإضافة أي مزودين إلى مفضلتك حتى الآن. استكشف الخدمات وأضف ما يعجبك.
            </p>
            <Link href="/search">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                استكشف الخدمات
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => {
              const avatarSrc = fav.providerAvatar
                ? fav.providerAvatar
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fav.providerName)}`;

              return (
                <Card
                  key={fav.id}
                  className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-indigo-50 dark:bg-indigo-950/20">
                    <img
                      src={avatarSrc}
                      alt={fav.providerName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <button
                        onClick={() => removeFavorite(fav.providerId)}
                        disabled={removingId === fav.providerId}
                        className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-rose-500 hover:bg-white transition-colors shadow-sm disabled:opacity-60"
                      >
                        {removingId === fav.providerId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Heart className="w-5 h-5 fill-rose-500" />
                        )}
                      </button>
                    </div>
                    {fav.categoryNameAr && (
                      <Badge className="absolute top-3 right-3 bg-black/60 hover:bg-black/70 backdrop-blur-md border-none text-white">
                        {fav.categoryNameAr}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-foreground line-clamp-1">
                        {fav.providerName}
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        {Number(fav.providerRating).toFixed(1)}
                      </div>
                    </div>

                    {fav.providerCity && (
                      <div className="flex items-center text-sm text-muted-foreground mb-4">
                        <MapPin className="w-4 h-4 mr-1 ml-1.5" />
                        {fav.providerCity}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/50">
                      <Link href={`/provider/${fav.providerId}`}>
                        <Button variant="outline" className="w-full h-9 text-xs" size="sm">
                          عرض الملف
                        </Button>
                      </Link>
                      <Link href={`/provider/${fav.providerId}`}>
                        <Button
                          className="w-full h-9 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                          size="sm"
                        >
                          تواصل الآن
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
