import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye, EyeOff, User, Briefcase, CheckCircle2,
  Loader2, ArrowRight, Mail, KeyRound, ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface AuthProps {
  defaultTab?: "login" | "register";
}

type View = "login" | "register" | "forgot" | "reset";

function getRedirectPath(role: string): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "provider") return "/dashboard";
  return "/user/dashboard";
}

export default function AuthPage({ defaultTab = "login" }: AuthProps) {
  const [view, setView] = useState<View>(defaultTab === "register" ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<"user" | "provider" | null>(null);
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

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Reset password fields
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60 * 1000,
  });
  const siteName = (settings as any)?.siteName ?? "دليل بلس";

  const siteNavLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/categories", label: "التصنيفات" },
    { href: "/about", label: "من نحن" },
    { href: "/contact", label: "تواصل معنا" },
    { href: "/faq", label: "الأسئلة الشائعة" },
  ];

  // Support ?returnTo= query param for post-login redirect
  const returnTo = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("returnTo")
    : null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.auth.login(loginEmail.trim(), loginPassword);
      setUser(result as any);
      toast({ title: "مرحباً بعودتك!", description: `تم تسجيل الدخول بنجاح` });
      // Use returnTo if present and it's a safe internal path
      if (returnTo && returnTo.startsWith("/") && result.role !== "admin") {
        setLocation(returnTo);
      } else {
        setLocation(getRedirectPath(result.role));
      }
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
    setLoading(true);
    try {
      const role = accountType === "provider" ? "provider" : "user";
      const result = await api.auth.register({ name: regName.trim(), email: regEmail.trim(), phone: regPhone.trim() || undefined, password: regPassword, role });
      setUser(result as any);
      toast({ title: "تم إنشاء الحساب بنجاح", description: "مرحباً بك في دليل بلس!" });
      if (role === "provider") {
        setLocation(returnTo && returnTo.startsWith("/") ? returnTo : "/onboarding");
      } else {
        setLocation(returnTo && returnTo.startsWith("/") ? returnTo : "/user/dashboard");
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
      <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow group-hover:opacity-90 transition-opacity">
              د
            </div>
            <span className="font-extrabold text-xl text-primary tracking-tight hidden sm:block">{siteName}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {siteNavLinks.map(link => (
              <Link key={link.href} href={link.href}>
                <span className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors">
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>
          <Link href="/provider/register">
            <span className="hidden sm:inline-flex px-4 py-1.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors shadow-sm">
              كن مقدم خدمة
            </span>
          </Link>
        </div>
      </header>

      {/* ── Split-screen content ── */}
      <div className="flex flex-1">
      {/* Left Decorative Panel */}
      <div className="hidden lg:flex w-[40%] bg-primary relative flex-col justify-center items-center text-primary-foreground p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative z-10 text-center flex flex-col items-center">
          <Link href="/" className="flex items-center gap-3 mb-8 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center text-primary font-bold text-3xl shadow-lg">د</div>
            <span className="font-bold text-5xl tracking-tight text-primary-foreground">دليل بلس</span>
          </Link>
          <h1 className="text-3xl font-bold leading-tight mb-4 max-w-sm">اكتشف أفضل الخدمات من أيدٍ محلية موثوقة</h1>
          <p className="text-primary-foreground/80 text-lg max-w-sm">المنصة الأولى التي تجمع بين أصحاب المهارات والباحثين عن الجودة.</p>
        </div>
        <div className="absolute top-1/4 -right-12 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-12 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />

        {/* Trust badges */}
        <div className="absolute bottom-12 flex flex-col gap-3 w-full px-12">
          {[["🔒", "تسجيل دخول آمن ومشفر"], ["✅", "أكثر من 500 مزود خدمة موثق"], ["⭐", "تقييمات حقيقية من مستخدمين"]].map(([icon, text]) => (
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

          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-10">
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-md">د</div>
              <span className="font-bold text-3xl tracking-tight text-primary">دليل بلس</span>
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
                        <p className="text-sm text-muted-foreground leading-relaxed">ابحث عن الخدمات وتواصل مع مقدميها بكل سهولة.</p>
                      </div>
                    </div>
                  </Card>

                  <Card
                    className="p-4 cursor-pointer border-2 border-transparent bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 transition-all duration-200 relative overflow-hidden"
                    onClick={() => setAccountType("provider")}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-background text-muted-foreground flex items-center justify-center shrink-0">
                        <Briefcase className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">مقدم خدمة</h3>
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">مزود</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">اعرض خدماتك وتواصل مع العملاء وضاعف دخلك.</p>
                      </div>
                    </div>
                  </Card>

                  <Button disabled className="w-full h-12 text-base font-bold rounded-xl opacity-50">اختر نوع الحساب للمتابعة</Button>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Selected account type badge */}
                  <div className={`flex items-center gap-2 mb-5 px-3 py-2 rounded-xl border ${accountType === "provider" ? "bg-primary/5 border-primary/20 text-primary" : "bg-accent/5 border-accent/20 text-accent"}`}>
                    {accountType === "provider" ? <Briefcase className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    <span className="text-sm font-semibold">{accountType === "provider" ? "مقدم خدمة" : "مستخدم عادي"}</span>
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
                      <Label htmlFor="reg-phone">رقم الجوال <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
                      <Input id="reg-phone" type="tel" placeholder="05XXXXXXXX" className="h-12"
                        value={regPhone} onChange={e => setRegPhone(e.target.value)} disabled={loading} />
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
