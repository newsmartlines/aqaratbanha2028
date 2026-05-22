import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye, EyeOff, User, Briefcase, CheckCircle2,
  Loader2, ArrowRight, Mail, KeyRound, ShieldCheck, Building2,
} from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api, type Region } from "@/lib/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useSiteSettings } from "@/App";
import { Header } from "@/components/Header";

interface AuthProps {
  defaultTab?: "login" | "register";
}

type View = "login" | "register" | "forgot" | "reset";

function getRedirectPath(role: string): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "provider") return "/provider/dashboard";
  return "/";
}

function safeReturnTo(path: string | null, role: string): string | null {
  if (!path || !path.startsWith("/")) return null;
  if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/admin/login")) return null;
  if (role === "user" && (path.startsWith("/admin") || path.startsWith("/dashboard") || path.startsWith("/provider/dashboard"))) return null;
  if (role === "provider" && (path.startsWith("/admin") || path.startsWith("/user/") || path.startsWith("/provider/register"))) return null;
  if (role === "admin" && !path.startsWith("/admin")) return null;
  if (role === "provider" && path.startsWith("/real-estate-onboarding")) return path;
  return path;
}

export default function AuthPage({ defaultTab = "login" }: AuthProps) {
  const siteSettings = useSiteSettings();
  const registrationEnabled = siteSettings ? siteSettings.allowRegistration !== "false" : true;
  const [view, setView] = useState<View>(defaultTab === "register" ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<"user" | "provider" | "real_estate" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState("");
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRegionId, setRegRegionId] = useState<string>("");
  const [regCityId, setRegCityId] = useState<string>("");

  const { data: regList = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
    staleTime: 5 * 60_000,
  });

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Reset password fields
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading, setUser } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;
    const path = window.location.pathname;
    if (path !== "/login" && path !== "/register") return;
    setLocation(getRedirectPath(user.role));
  }, [user, authLoading, setLocation]);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60 * 1000,
  });

  // Support ?returnTo= query param for post-login redirect
  const returnTo = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("returnTo")
    : null;

  const handleGoogleLogin = async (tokenOrCredential: string, type: "access_token" | "credential" = "credential") => {
    setLoading(true);
    setError(null);
    try {
      const body = type === "access_token" ? { access_token: tokenOrCredential } : { credential: tokenOrCredential };
      const result = await api.fetchJson<any>("/auth/google", { method: "POST", body: JSON.stringify(body) });
      setUser(result);
      toast({ title: "تم تسجيل الدخول بجوجل بنجاح!" });
      const dest = safeReturnTo(returnTo, result.role) ?? getRedirectPath(result.role);
      setLocation(dest);
    } catch (err: any) {
      setError(err?.message ?? "فشل تسجيل الدخول بجوجل");
    } finally {
      setLoading(false);
    }
  };

  const GoogleButton = ({ text }: { text: string }) => {
    const login = useGoogleLogin({
      onSuccess: (res) => handleGoogleLogin(res.access_token, "access_token"),
      onError: () => setError("فشل تسجيل الدخول بجوجل"),
    });
    return (
      <button
        type="button"
        onClick={() => login()}
        className="w-full flex items-center justify-center gap-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg h-11 px-4 shadow-sm transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        <span>{text}</span>
      </button>
    );
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.auth.login(loginEmail.trim(), loginPassword);
      const base = result as { providerId?: number; id: number; name: string; email: string; role: string; avatar?: string | null };
      let merged: typeof base & { providerApproved?: boolean } = { ...base };
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const me = await api.auth.me();
          merged = { ...me, providerId: me.providerId ?? base.providerId };
          if (merged.role !== "provider" || merged.providerId != null) break;
        } catch {
          /* keep merged from login response */
        }
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
      }
      setUser(merged as any);
      toast({ title: "مرحباً بعودتك!", description: `تم تسجيل الدخول بنجاح` });
      const dest = safeReturnTo(returnTo, result.role) ?? getRedirectPath(result.role);
      setLocation(dest);
    } catch (err: any) {
      setError(err?.message ?? "بيانات الدخول غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (regPassword !== regConfirm) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    if (regPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (regPhone && !/^(010|011|012|015)\d{8}$/.test(regPhone)) {
      setError("رقم الهاتف غير صحيح — يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويكون 11 رقماً");
      return;
    }
    setLoading(true);
    try {
      const role = (accountType === "provider" || accountType === "real_estate") ? "provider" : "user";
      const result = await api.auth.register({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        password: regPassword,
        role,
        regionId: regRegionId ? parseInt(regRegionId, 10) : undefined,
        cityId: regCityId ? parseInt(regCityId, 10) : undefined,
      });
      const reg = result as { providerId?: number; id: number; name: string; email: string; role: string; avatar?: string | null };
      let merged: typeof reg & { providerId?: number; providerApproved?: boolean } = { ...reg };
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          const me = await api.auth.me();
          merged = { ...me, providerId: me.providerId ?? reg.providerId };
          setUser(merged as any);
          if (role !== "provider" || merged.providerId != null) break;
        } catch {
          merged = { ...reg };
          setUser(merged as any);
        }
        await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
      }
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description:
          role === "provider" && merged.providerId == null
            ? "مرحباً بك. إذا لم تُفتح لوحة التحكم بشكل صحيح، حدّث الصفحة أو أعد تسجيل الدخول."
            : "مرحباً بك في عقارات بنها!",
      });
      if (role === "provider") {
        // New providers must complete onboarding (profile, services, package selection
        // → STC Pay redirect for paid plans) before landing on the dashboard.
        const dest = safeReturnTo(returnTo, "provider") ?? "/real-estate-onboarding";
        setLocation(dest);
      } else {
        const dest = safeReturnTo(returnTo, "user") ?? getRedirectPath("user");
        setLocation(dest);
      }
    } catch (err: any) {
      setError(err?.message ?? "فشل إنشاء الحساب، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.auth.forgotPassword(forgotEmail.trim());
      setForgotSent(true);
      if (result.dev_reset_token) {
        setDevResetToken(result.dev_reset_token);
        setResetToken(result.dev_reset_token);
      }
    } catch (err: any) {
      setError(err?.message ?? "فشلت عملية إعادة التعيين");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (resetNewPassword !== resetConfirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    if (resetNewPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(resetToken.trim(), resetNewPassword);
      setResetSuccess(true);
      toast({ title: "تم تغيير كلمة المرور", description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة" });
    } catch (err: any) {
      setError(err?.message ?? "فشل تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/20 selection:text-primary bg-background" dir="rtl">

      {/* ── Top Banner: Logo + Site Navigation ── */}
      <Header />

      {/* ── Split-screen content ── */}
      <div className="flex flex-1">
      {/* Left Decorative Panel */}
      <div className="hidden lg:flex w-[40%] bg-primary relative flex-col justify-center items-center text-primary-foreground p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative z-10 text-center flex flex-col items-center">
          <Link href="/" className="flex items-center gap-3 mb-8 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center text-primary font-bold text-3xl shadow-lg">✦</div>
            <span className="font-bold text-5xl tracking-tight text-primary-foreground">عقارات بنها</span>
          </Link>
          <h1 className="text-3xl font-bold leading-tight mb-4 max-w-sm">اعثر على عقارك المثالي في بنها والقليوبية</h1>
          <p className="text-primary-foreground/80 text-lg max-w-sm">بيع وشراء وإيجار العقارات مع خدمات التشطيبات والديكور ومواد البناء.</p>
        </div>
        <div className="absolute top-1/4 -right-12 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-12 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />

        {/* Trust badges */}
        <div className="absolute bottom-12 flex flex-col gap-3 w-full px-12">
          {[["🔒", "تسجيل دخول آمن ومشفر"], ["✅", "أكثر من 500 شركة عقارية موثّقة"], ["⭐", "تقييمات حقيقية من مستخدمين"]].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2 text-primary-foreground/70 text-sm">
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-[60%] flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          {/* Back to Home */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              العودة إلى الرئيسية
            </Link>
          </div>

          {/* ── LOGIN VIEW ── */}
          {view === "login" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-1">مرحباً بعودتك</h2>
                <p className="text-muted-foreground">سجل دخولك للمتابعة</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Google Login */}
              {(settings as any)?.googleClientId && (
                <div className="mb-6">
                  <GoogleButton text="متابعة بحساب جوجل" />
                  <div className="mt-4 flex items-center gap-4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                    <span className="text-muted-foreground text-xs">أو بالبريد الإلكتروني</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">البريد الإلكتروني</Label>
                  <Input
                    id="login-email" type="email" placeholder="example@email.com"
                    required className="h-12"
                    value={loginEmail} onChange={e => { setLoginEmail(e.target.value); clearError(); }}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="login-password">كلمة المرور</Label>
                    <button type="button" onClick={() => { setView("forgot"); clearError(); }} className="text-xs text-primary font-medium hover:underline">
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required className="h-12 pl-10 pr-3"
                      value={loginPassword} onChange={e => { setLoginPassword(e.target.value); clearError(); }}
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl mt-2 shadow-md" disabled={loading}>
                  {loading ? <><Loader2 className="h-5 w-5 animate-spin ml-2" />جاري الدخول...</> : "تسجيل الدخول"}
                </Button>
              </form>

              <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                <span className="text-muted-foreground text-sm">أو</span>
              </div>

              <Button variant="outline" className="w-full h-12 mt-6 text-base font-medium rounded-xl border-border hover:bg-secondary/50" onClick={() => { setView("register"); clearError(); }}>
                إنشاء حساب جديد
              </Button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                أنت مسؤول نظام؟{" "}
                <Link href="/admin/login" className="text-primary font-medium hover:underline">تسجيل دخول الإدارة</Link>
              </p>
            </div>
          )}

          {/* ── REGISTER VIEW ── */}
          {view === "register" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="mb-6">
                <h2 className="text-3xl font-bold mb-1">إنشاء حساب</h2>
                <p className="text-muted-foreground">اختر نوع حسابك للبدء</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Account type selection */}
              {!accountType ? (
                <div className="space-y-4 mb-6">
                  <Card
                    className="p-4 cursor-pointer border-2 border-transparent bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 transition-all duration-200 relative overflow-hidden"
                    onClick={() => setAccountType("user")}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-background text-muted-foreground flex items-center justify-center shrink-0">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">مستخدم عادي</h3>
                          <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-full">مجاني</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">ابحث عن العقارات وتواصل مع الشركات العقارية بكل سهولة.</p>
                      </div>
                    </div>
                  </Card>


                  <Card
                    className="p-4 cursor-pointer border-2 border-transparent bg-secondary/30 hover:bg-secondary/50 hover:border-amber-300/40 transition-all duration-200 relative overflow-hidden"
                    onClick={() => setLocation("/company-register")}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-background text-muted-foreground flex items-center justify-center shrink-0">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">شركة عقارية</h3>
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">عقارات</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">انشر عقاراتك وتواصل مع المشترين والمستأجرين عبر المنصة.</p>
                      </div>
                    </div>
                  </Card>

                  <Button disabled className="w-full h-12 text-base font-bold rounded-xl opacity-50">اختر نوع الحساب للمتابعة</Button>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Selected account type badge */}
                  <div className={`flex items-center gap-2 mb-5 px-3 py-2 rounded-xl border ${accountType === "provider" ? "bg-primary/5 border-primary/20 text-primary" : accountType === "real_estate" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-accent/5 border-accent/20 text-accent"}`}>
                    {accountType === "provider" ? <Briefcase className="h-4 w-4" /> : accountType === "real_estate" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    <span className="text-sm font-semibold">{accountType === "provider" ? "مقدم خدمة" : accountType === "real_estate" ? "شركة عقارية" : "مستخدم عادي"}</span>
                    <button className="mr-auto text-muted-foreground hover:text-foreground text-xs underline" onClick={() => setAccountType(null)}>تغيير</button>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">الاسم الكامل</Label>
                      <Input id="reg-name" type="text" placeholder="أدخل اسمك الكامل" required className="h-12"
                        value={regName} onChange={e => { setRegName(e.target.value); clearError(); }} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">البريد الإلكتروني</Label>
                      <Input id="reg-email" type="email" placeholder="example@email.com" required className="h-12"
                        value={regEmail} onChange={e => { setRegEmail(e.target.value); clearError(); }} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">
                        رقم الهاتف <span className="text-muted-foreground text-xs">(اختياري)</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono select-none">+20</span>
                        <Input
                          id="reg-phone"
                          type="tel"
                          inputMode="numeric"
                          placeholder="01XXXXXXXXX"
                          className="h-12 pr-12"
                          dir="ltr"
                          maxLength={11}
                          value={regPhone}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, "");
                            setRegPhone(v);
                          }}
                          disabled={loading}
                        />
                      </div>
                      {regPhone && !/^(010|011|012|015)\d{8}$/.test(regPhone) && (
                        <p className="text-xs text-destructive">يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويكون 11 رقماً</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">كلمة المرور</Label>
                      <div className="relative">
                        <Input id="reg-password" type={showPassword ? "text" : "password"}
                          placeholder="6 أحرف على الأقل" required className="h-12 pl-10"
                          value={regPassword} onChange={e => { setRegPassword(e.target.value); clearError(); }} disabled={loading} />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">تأكيد كلمة المرور</Label>
                      <div className="relative">
                        <Input id="reg-confirm" type={showConfirmPassword ? "text" : "password"}
                          placeholder="أعد إدخال كلمة المرور" required className="h-12 pl-10"
                          value={regConfirm} onChange={e => { setRegConfirm(e.target.value); clearError(); }} disabled={loading} />
                        <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl mt-2 shadow-md" disabled={loading}>
                      {loading ? <><Loader2 className="h-5 w-5 animate-spin ml-2" />جاري الإنشاء...</> : "إنشاء الحساب"}
                    </Button>
                  </form>

                  {/* Google Register */}
                  {(settings as any)?.googleClientId && accountType === "user" && (
                    <div className="mt-4">
                      <div className="flex items-center gap-4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border mb-4">
                        <span className="text-muted-foreground text-xs">أو سجل بجوجل</span>
                      </div>
                      <GoogleButton text="إنشاء حساب بجوجل" />
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 text-center">
                <span className="text-muted-foreground text-sm">لديك حساب؟ </span>
                <button onClick={() => { setView("login"); clearError(); setAccountType(null); }} className="text-primary font-bold text-sm hover:underline">تسجيل الدخول</button>
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === "forgot" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <button onClick={() => { setView("login"); clearError(); setForgotSent(false); setDevResetToken(null); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowRight className="h-4 w-4" /> العودة لتسجيل الدخول
              </button>

              <div className="mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-1">نسيت كلمة المرور؟</h2>
                <p className="text-muted-foreground text-sm">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>
              </div>

              {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

              {!forgotSent ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">البريد الإلكتروني</Label>
                    <Input id="forgot-email" type="email" placeholder="example@email.com" required className="h-12"
                      value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); clearError(); }} disabled={loading} />
                  </div>
                  <Button type="submit" className="w-full h-12 font-bold rounded-xl shadow-md" disabled={loading}>
                    {loading ? <><Loader2 className="h-5 w-5 animate-spin ml-2" />جاري الإرسال...</> : "إرسال رابط إعادة التعيين"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">تم إرسال رابط إعادة التعيين</p>
                      <p className="text-xs text-green-700 mt-1">تحقق من بريدك الإلكتروني {forgotEmail} واتبع التعليمات</p>
                    </div>
                  </div>

                  {devResetToken && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-amber-700 mb-1">🔧 وضع التطوير — رمز إعادة التعيين:</p>
                      <code className="text-xs text-amber-800 break-all block bg-amber-100 p-2 rounded">{devResetToken}</code>
                      <Button size="sm" variant="outline" className="mt-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={() => { setResetToken(devResetToken); setView("reset"); clearError(); }}>
                        إعادة تعيين كلمة المرور الآن
                      </Button>
                    </div>
                  )}

                  <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => { setView("reset"); clearError(); }}>
                    لدي رمز إعادة التعيين بالفعل
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── RESET PASSWORD VIEW ── */}
          {view === "reset" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <button onClick={() => { setView("forgot"); clearError(); setResetSuccess(false); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowRight className="h-4 w-4" /> العودة
              </button>

              <div className="mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-1">تعيين كلمة مرور جديدة</h2>
                <p className="text-muted-foreground text-sm">أدخل الرمز المرسل إليك وكلمة المرور الجديدة</p>
              </div>

              {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

              {!resetSuccess ? (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-token">رمز إعادة التعيين</Label>
                    <Input id="reset-token" type="text" placeholder="الصق الرمز هنا" required className="h-12 font-mono text-sm"
                      value={resetToken} onChange={e => { setResetToken(e.target.value); clearError(); }} disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-new">كلمة المرور الجديدة</Label>
                    <div className="relative">
                      <Input id="reset-new" type={showPassword ? "text" : "password"}
                        placeholder="6 أحرف على الأقل" required className="h-12 pl-10"
                        value={resetNewPassword} onChange={e => { setResetNewPassword(e.target.value); clearError(); }} disabled={loading} />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm">تأكيد كلمة المرور</Label>
                    <Input id="reset-confirm" type="password" placeholder="أعد الكتابة" required className="h-12"
                      value={resetConfirmPassword} onChange={e => { setResetConfirmPassword(e.target.value); clearError(); }} disabled={loading} />
                  </div>
                  <Button type="submit" className="w-full h-12 font-bold rounded-xl shadow-md" disabled={loading}>
                    {loading ? <><Loader2 className="h-5 w-5 animate-spin ml-2" />جاري الحفظ...</> : "حفظ كلمة المرور الجديدة"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
                    <ShieldCheck className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-green-800 mb-1">تم تغيير كلمة المرور بنجاح!</p>
                      <p className="text-sm text-green-700">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
                    </div>
                  </div>
                  <Button className="w-full h-12 font-bold rounded-xl" onClick={() => { setView("login"); clearError(); setResetSuccess(false); }}>
                    تسجيل الدخول
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>{/* end split-screen flex */}
    </div>
  );
}
