import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OnboardingPage from "@/pages/onboarding";

export default function ProviderRegisterPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setLocation("/login?returnTo=/provider/register");
      return;
    }

    if (user.role === "admin") {
      setLocation("/admin/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium">جاري التحقق من حسابك...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <OnboardingPage />;
}
