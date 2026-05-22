import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { PropertyFormWizard, type FormMode } from "@/components/PropertyFormWizard";

export default function UserAddPropertyPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login?returnTo=/user/add-property");
    return null;
  }

  const mode: FormMode = user.role === "provider" ? "company" : "user";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PropertyFormWizard
          mode={mode}
          backPath="/user/dashboard"
          showPlans={true}
        />
      </div>
      <RealEstateFooter />
    </div>
  );
}
