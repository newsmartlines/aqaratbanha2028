import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";

type Status = "loading" | "success" | "error" | "missing";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("missing");
      return;
    }

    (async () => {
      try {
        const result = await api.fetchJson<{ success: boolean; message?: string }>(
          `/auth/verify-email?token=${encodeURIComponent(token)}`
        );
        if (result.success) {
          // Refresh auth context so emailVerified flag updates immediately
          await refetch().catch(() => {});
          setStatus("success");
          setMessage(result.message ?? "تم التحقق من بريدك الإلكتروني بنجاح");
        } else {
          setStatus("error");
          setMessage("رمز التحقق غير صالح أو منتهي الصلاحية");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message ?? "رمز التحقق غير صالح أو منتهي الصلاحية");
      }
    })();
  }, [refetch]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" dir="rtl">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">

          {status === "loading" && (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold">جارٍ التحقق من بريدك الإلكتروني…</h1>
              <p className="text-muted-foreground">يرجى الانتظار لحظة</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-11 w-11 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-700">تم التحقق بنجاح!</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button
                className="w-full h-12 font-bold rounded-xl"
                onClick={() => setLocation("/dashboard")}
              >
                الذهاب إلى لوحة التحكم
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="h-11 w-11 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">فشل التحقق</h1>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">
                قد يكون الرابط منتهي الصلاحية (صالح لمدة ساعة واحدة فقط).
                <br />
                يمكنك طلب رابط تحقق جديد من لوحة التحكم.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full h-12 font-bold rounded-xl"
                  onClick={() => setLocation("/dashboard/settings")}
                >
                  إعادة إرسال رابط التحقق
                </Button>
                <Button variant="outline" className="w-full h-12 rounded-xl" asChild>
                  <Link href="/">العودة للرئيسية</Link>
                </Button>
              </div>
            </>
          )}

          {status === "missing" && (
            <>
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Mail className="h-11 w-11 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold">رابط التحقق غير مكتمل</h1>
              <p className="text-muted-foreground">
                لم يتم العثور على رمز التحقق في الرابط. يرجى النقر على الرابط الموجود في بريدك الإلكتروني مباشرة.
              </p>
              <Button variant="outline" className="w-full h-12 rounded-xl" asChild>
                <Link href="/">العودة للرئيسية</Link>
              </Button>
            </>
          )}

        </div>
      </div>

      <RealEstateFooter />
    </div>
  );
}
