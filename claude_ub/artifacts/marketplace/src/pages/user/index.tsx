import { Link } from "wouter";
import { 
  Heart, 
  Bell, 
  Star, 
  Users,
  Search,
  Grid,
  Clock,
  CheckCircle2
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function UserDashboard() {
  const { user } = useAuth();

  const stats = [
    { name: "المفضلة", value: "12", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    { name: "طلباتي", value: "5", icon: Bell, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "تقييماتي", value: "3", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "مزودين تواصلت معهم", value: "8", icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  const recentActivity = [
    { id: 1, type: "request", title: "طلب جديد", desc: "قمت بطلب خدمة صيانة تكييف من صيانة الفهد", date: "منذ ساعتين", icon: Bell, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: 2, type: "favorite", title: "تمت الإضافة للمفضلة", desc: "قمت بإضافة حلويات نورة إلى قائمتك المفضلة", date: "منذ 5 ساعات", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    { id: 3, type: "review", title: "تقييم جديد", desc: "قمت بتقييم صالون أريج المتنقل بـ 5 نجوم", date: "أمس", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: 4, type: "completed", title: "طلب مكتمل", desc: "اكتمل طلب تنسيق حفلة تخرج من تنسيق ليالينا", date: "منذ 3 أيام", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { id: 5, type: "request", title: "طلب جديد", desc: "قمت بطلب خدمة تنظيف من شركة النظافة الشاملة", date: "الأسبوع الماضي", icon: Clock, color: "text-slate-500", bg: "bg-slate-500/10" },
  ];

  const avatarSrc = user?.avatar
    ? user.avatar
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name ?? "user")}`;

  return (
    <UserLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 overflow-hidden border-2 border-white shadow-sm">
              <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">مرحباً، {user?.name ?? "المستخدم"} 👋</h2>
              <p className="text-muted-foreground mt-1">تصفح الخدمات، تابع طلباتك، وأدر حسابك من هنا.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/search">
              <Button className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                <Search className="w-4 h-4" />
                ابحث عن مزود
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-border/50 shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-lg">روابط سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/search" className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">البحث عن خدمات</h4>
                    <p className="text-xs text-muted-foreground">تصفح آلاف الخدمات المتاحة</p>
                  </div>
                </Link>
                <Link href="/" className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Grid className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">تصفح الفئات</h4>
                    <p className="text-xs text-muted-foreground">اكتشف الخدمات حسب التصنيف</p>
                  </div>
                </Link>
                <Link href="/user/favorites" className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">المفضلة</h4>
                    <p className="text-xs text-muted-foreground">الخدمات التي أعجبتك</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">النشاط الأخير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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
                      <span className="text-xs text-muted-foreground mt-1 sm:mt-0 shrink-0">{activity.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
