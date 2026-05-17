import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { CheckCircle2, Users, Star, Shield, Loader2 } from "lucide-react";
import { useInterpolate } from "@/lib/use-interpolate";

export default function AboutPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
  });

  const siteName = settings?.siteName ?? "سمارت لاينز للنظم المتطورة";
  const aboutContent = settings?.aboutContent ?? "نحن منصة سمارت لاينز للنظم المتطورة، الوجهة الأولى للخدمات المنزلية والمحلية في جمهورية مصر العربية.";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />

      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">من نحن</h1>
          <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto">
            نعرّفك على {siteName} — المنصة التي تُغيّر طريقة الحصول على الخدمات في مصر
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Main Content */}
            <div className="prose prose-lg max-w-none text-right mb-16">
              {aboutContent.split("\n").filter(Boolean).map((paragraph, i) => (
                <p key={i} className="text-foreground/80 text-lg leading-relaxed mb-4">{paragraph}</p>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[
                { label: "مقدم خدمة", value: "500+", icon: Users },
                { label: "تصنيف متاح", value: "50+", icon: Star },
                { label: "عملية ناجحة", value: "10K+", icon: CheckCircle2 },
                { label: "مدينة مغطاة", value: "20+", icon: Shield },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center p-6 rounded-2xl border border-border/40 bg-card shadow-sm">
                  <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-extrabold text-primary mb-1">{value}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Values */}
            <div className="bg-secondary/30 rounded-3xl p-8 md:p-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">قيمنا الأساسية</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: "الموثوقية", desc: "نتحقق من جميع مقدمي الخدمات لضمان تجربة آمنة وموثوقة لعملائنا.", icon: Shield },
                  { title: "الشفافية", desc: "التقييمات حقيقية من عملاء حقيقيين، والأسعار واضحة بدون رسوم خفية.", icon: Star },
                  { title: "دعم المجتمع", desc: "نؤمن بقوة المجتمع المحلي ونساعد أصحاب المشاريع المنزلية على النمو.", icon: Users },
                ].map(({ title, desc, icon: Icon }) => (
                  <div key={title} className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm">
                    <Icon className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-bold mb-2">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="py-8 border-t border-border/30 bg-secondary/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 {siteName} — جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
