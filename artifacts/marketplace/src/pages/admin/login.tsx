import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Lock, User, Loader2, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT, useLanguage } from "@/lib/i18n";

const dict = {
  brand: { ar: "عقارتي - لوحة المسؤول", en: "Aqaraty Admin" },
  subtitle: { ar: "سجّل الدخول إلى لوحة التحكم", en: "Sign in to the control panel" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  defaults: { ar: "الافتراضي: admin@aqaratbanha.com / admin123", en: "Default: admin@aqaratbanha.com / admin123" },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  signingIn: { ar: "جاري تسجيل الدخول...", en: "Signing in..." },
  notAdmin: { ar: "هذه الصفحة مخصصة للمسؤولين فقط. يرجى استخدام صفحة الدخول العادية.", en: "This page is for admins only. Please use the regular sign-in page." },
  badCreds: { ar: "بيانات الدخول غير صحيحة", en: "Invalid credentials" },
  regularUser: { ar: "مستخدم عادي؟", en: "Regular user?" },
  backLogin: { ar: "العودة لتسجيل الدخول الرئيسي", en: "Back to main login" },
  langToggle: { ar: "English", en: "العربية" },
};

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const t = useT(dict);
  const { dir, toggle } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.auth.login(email.trim(), password);
      if (result.role !== "admin" && !result.staffRole) {
        setError(t("notAdmin"));
        setLoading(false);
        return;
      }
      setUser(result as any);
      setLocation("/admin/dashboard");
    } catch (err: any) {
      setError(err?.message ?? t("badCreds"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans" dir={dir}>
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <button onClick={toggle} className="text-xs text-slate-400 hover:text-white px-2 py-1">{t("langToggle")}</button>
        </div>
        <div className="text-center mb-8 text-white">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg shadow-teal-900/50">✦</div>
          <h1 className="text-3xl font-bold">{t("brand")}</h1>
          <p className="text-slate-400 mt-2">{t("subtitle")}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-950/50 border-red-800 text-red-300">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-slate-800 bg-slate-900 text-slate-100 shadow-2xl shadow-black/50">
          <form onSubmit={handleLogin}>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-slate-300">{t("email")}</Label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    id="admin-email" type="email" placeholder="admin@aqaratbanha.com" dir="ltr"
                    className="ps-10 bg-slate-950 border-slate-800 text-white h-12 focus-visible:ring-teal-500 placeholder:text-slate-600"
                    value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                    disabled={loading} required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-slate-300">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    id="admin-password" type={showPassword ? "text" : "password"} placeholder="••••••••" dir="ltr"
                    className="ps-10 pe-10 bg-slate-950 border-slate-800 text-white h-12 focus-visible:ring-teal-500"
                    value={password} onChange={e => { setPassword(e.target.value); setError(null); }}
                    disabled={loading} required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">{t("defaults")}</p>
            </CardContent>
            <CardFooter className="pb-6">
              <Button type="submit"
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg transition-colors shadow-lg shadow-teal-900/30"
                disabled={loading}>
                {loading ? <><Loader2 className="w-5 h-5 animate-spin me-2" />{t("signingIn")}</> : t("signIn")}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          {t("regularUser")}{" "}
          <Link href="/login" className="text-teal-400 hover:underline">{t("backLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
