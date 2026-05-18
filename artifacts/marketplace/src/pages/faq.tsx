import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { ChevronDown, ChevronUp, HelpCircle, Loader2 } from "lucide-react";
import { useInterpolate } from "@/lib/use-interpolate";

interface FaqItem { q: string; a: string }

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
  });

  const siteName = settings?.siteName ?? "عقارات بنها";
  let faqItems: FaqItem[] = [];
  try {
    faqItems = JSON.parse(settings?.faqContent ?? "[]");
  } catch {}

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />

      <div className="bg-gradient-to-br from-secondary/60 to-background border-b border-border/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">الأسئلة الشائعة</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">إجابات على أكثر الأسئلة التي يطرحها مستخدمو {siteName}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : faqItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا توجد أسئلة متاحة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div key={i} className={`border rounded-2xl overflow-hidden transition-all ${openIdx === i ? "border-primary/30 shadow-md" : "border-border/50"}`}>
                <button
                  className="w-full flex items-center justify-between p-5 text-right hover:bg-secondary/30 transition-colors"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                >
                  <span className="font-bold text-base md:text-lg text-foreground pr-2">{item.q}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${openIdx === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {openIdx === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {openIdx === i && (
                  <div className="px-5 pb-5 border-t border-border/30 bg-secondary/20">
                    <p className="text-muted-foreground leading-relaxed pt-4 text-base">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Still have questions? */}
        <div className="mt-12 text-center p-8 bg-primary/5 border border-primary/20 rounded-3xl">
          <h3 className="text-xl font-bold mb-2">لديك سؤال آخر؟</h3>
          <p className="text-muted-foreground mb-4">فريقنا جاهز للمساعدة في أي وقت</p>
          <a href="/contact" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-colors">
            تواصل معنا
          </a>
        </div>
      </div>

      <footer className="py-8 border-t border-border/30 bg-secondary/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 {siteName} — جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
