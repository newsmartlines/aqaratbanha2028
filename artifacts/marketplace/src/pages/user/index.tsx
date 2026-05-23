import { Link } from "wouter";
import {
  Heart,
  Bell,
  Search,
  Building2,
  Plus,
  MapPin,
  Eye,
  Clock,
  Phone,
  CheckCircle2,
  BellRing,
  Home,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function UserDashboard() {
  const { user } = useAuth();

  const { data: myProperties = [] } = useQuery({
    queryKey: ["user-properties"],
    queryFn: () => api.userProperties.list(),
    enabled: !!user,
    refetchInterval: 3000,
    staleTime: 0,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["property-favorites"],
    queryFn: () => api.propertyFavorites.list(),
    enabled: !!user,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => api.savedSearches.list(),
    enabled: !!user,
    refetchInterval: 5000,
    staleTime: 0,
  });

  const stats = [
    {
      name: "عقاراتي المعلنة",
      value: String(myProperties.length),
      icon: Building2,
      color: "text-teal-600",
      bg: "bg-teal-500/10",
      href: "/user/my-properties",
    },
    {
      name: "المفضلة",
      value: String(favorites.length),
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      href: "/user/favorites",
    },
    {
      name: "تنبيهات البحث",
      value: String(savedSearches.length),
      icon: BellRing,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/user/saved-searches",
    },
    {
      name: "مشاهدات العقارات",
      value: String(myProperties.reduce((sum: number, p: any) => sum + (p.viewCount ?? 0), 0)),
      icon: Eye,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      href: "/user/my-properties",
    },
    {
      name: "ضغطات الاتصال",
      value: String(myProperties.reduce((sum: number, p: any) => sum + (p.phoneClickCount ?? 0), 0)),
      icon: Phone,
      color: "text-teal-600",
      bg: "bg-teal-500/10",
      href: "/user/my-properties",
    },
  ];

  const recentActivity = [
    {
      id: 1,
      title: "بحث محفوظ جديد",
      desc: 'تم حفظ بحثك "شقق للإيجار في بنها" مع تنبيه بريدي',
      date: "منذ ساعتين",
      icon: BellRing,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      id: 2,
      title: "إضافة إلى المفضلة",
      desc: "قمت بإضافة فيلا في حي الزيتون إلى المفضلة",
      date: "منذ 5 ساعات",
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      id: 3,
      title: "تطابق مع بحث محفوظ",
      desc: 'تم العثور على 3 عقارات جديدة تطابق بحثك "شقق للبيع"',
      date: "أمس",
      icon: Bell,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      id: 4,
      title: "تصفح عقارات",
      desc: "زرت صفحة شقة 3 غرف بحي النزهة",
      date: "منذ 3 أيام",
      icon: Eye,
      color: "text-slate-500",
      bg: "bg-slate-500/10",
    },
  ];

  const avatarSrc = user?.avatar
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name ?? "user")}`;

  return (
    <UserLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Welcome hero */}
        <div className="relative overflow-hidden bg-gradient-to-l from-teal-700 to-[#0a1628] rounded-2xl p-6 text-white shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 w-32 h-32 rounded-full border-4 border-white/30" />
            <div className="absolute bottom-0 right-16 w-20 h-20 rounded-full border-2 border-white/20" />
          </div>
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 shrink-0">
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">مرحباً، {user?.name ?? "المستخدم"}</h2>
                <p className="text-white/70 mt-0.5 text-sm">ابحث عن عقار أحلامك أو أعلن عن عقارك بسهولة</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/properties">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-xl gap-2 text-sm">
                  <Search className="w-4 h-4" />
                  تصفح العقارات
                </Button>
              </Link>
              <Link href="/add-property">
                <Button className="bg-white text-teal-700 hover:bg-white/90 rounded-xl gap-2 text-sm font-bold">
                  <Plus className="w-4 h-4" />
                  أضف عقارك
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link key={stat.name} href={stat.href}>
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{stat.name}</p>
                      <p className="text-3xl font-bold text-foreground mt-1.5">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick links + Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Quick links */}
          <div className="lg:col-span-1">
            <Card className="border-border/50 shadow-sm h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">روابط سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Link href="/add-property">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/15 transition-colors border border-teal-200/50 dark:border-teal-800/50 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-teal-700 dark:text-teal-400">أضف عقارك مجاناً</h4>
                      <p className="text-xs text-muted-foreground">أعلن وابدأ في استقبال العروض</p>
                    </div>
                  </div>
                </Link>

                <Link href="/properties">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">البحث عن عقار</h4>
                      <p className="text-xs text-muted-foreground">تصفح آلاف العقارات</p>
                    </div>
                  </div>
                </Link>

                <Link href="/user/my-properties">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">عقاراتي المعلنة</h4>
                      <p className="text-xs text-muted-foreground">تابع حالة إعلاناتك</p>
                    </div>
                  </div>
                </Link>

                <Link href="/user/favorites">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">المفضلة</h4>
                      <p className="text-xs text-muted-foreground">العقارات التي أعجبتك</p>
                    </div>
                  </div>
                </Link>

                <Link href="/user/saved-searches">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <BellRing className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">تنبيهات البحث</h4>
                      <p className="text-xs text-muted-foreground">تنبيه عند وجود عقارات جديدة</p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent activity */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">النشاط الأخير</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Home className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لا يوجد نشاط حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {recentActivity.map((activity, index) => (
                    <div key={activity.id} className="relative flex gap-4">
                      {index !== recentActivity.length - 1 && (
                        <div className="absolute top-10 right-5 w-[2px] h-full bg-border -z-10" />
                      )}
                      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center z-10 border-4 border-background ${activity.bg} ${activity.color}`}>
                        <activity.icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pb-2">
                        <div>
                          <h4 className="font-medium text-sm">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground mt-0.5">{activity.desc}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 sm:mt-0 shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activity.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Properties section — only if user has submitted any */}
        {myProperties.length > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">عقاراتي المعلنة</CardTitle>
              <Link href="/user/my-properties">
                <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 text-xs">
                  عرض الكل
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myProperties.slice(0, 3).map((prop: any) => (
                  <div key={prop.id} className="border border-border/50 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    {prop.images ? (
                      <img
                        src={(() => { try { const imgs = JSON.parse(prop.images); return imgs[0] ?? "/placeholder-property.jpg"; } catch { return prop.images; } })()}
                        alt={prop.title}
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <div className="w-full h-28 bg-muted flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm line-clamp-1">{prop.title}</h4>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                          prop.status === "active" ? "bg-green-100 text-green-700" :
                          prop.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {prop.status === "active" ? "نشط" : prop.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                        </span>
                      </div>
                      {prop.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {prop.address}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </UserLayout>
  );
}
