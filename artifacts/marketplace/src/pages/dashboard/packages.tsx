import { Link } from "wouter";
import { Package, Building2, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import SubscriptionPage from "@/pages/dashboard/subscription";

export default function PackagesPage() {
  const { user } = useAuth();

  if (user?.role === "user") {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              الباقات
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">إدارة اشتراكاتك وباقاتك</p>
          </div>

          <div className="rounded-2xl border border-teal-200 dark:border-teal-800/40 bg-teal-50 dark:bg-teal-950/20 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">أضف عقاراتك مجاناً</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              كمستخدم عادي، يمكنك إضافة إعلانات عقارية مجاناً دون الحاجة إلى اشتراك مدفوع.
              أعلن الآن وابدأ في استقبال الاستفسارات مباشرة.
            </p>
            <div className="flex gap-3 justify-center flex-wrap pt-2">
              <Link href="/add-property">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2">
                  <Plus className="w-4 h-4" />
                  أضف عقارك الآن
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="rounded-xl">عرض الأسعار</Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return <SubscriptionPage />;
}
