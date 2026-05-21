import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { FileText, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />

      <div className="bg-primary text-primary-foreground py-14">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">الشروط والأحكام</h1>
          <p className="text-primary-foreground/80 text-lg">آخر تحديث: يناير ٢٠٢٥</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <button onClick={() => setLocation("/")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4 rotate-180" /> العودة للرئيسية
        </button>

        <div className="space-y-4">
          {[
            {
              num: "١", title: "قبول الشروط",
              body: "باستخدامك منصة عقارات بنها، فإنك توافق على الالتزام بهذه الشروط والأحكام. إن لم توافق على هذه الشروط، يُرجى عدم استخدام المنصة.",
            },
            {
              num: "٢", title: "استخدام المنصة",
              body: "تلتزم باستخدام المنصة للأغراض المشروعة فقط، وتتعهد بعدم نشر معلومات كاذبة أو مضلّلة، وعدم انتهاك حقوق الآخرين، وعدم محاولة اختراق الأنظمة.",
            },
            {
              num: "٣", title: "المحتوى المنشور",
              body: "أنت المسؤول الوحيد عن المحتوى الذي تنشره. تمنحنا ترخيصاً لعرض هذا المحتوى على المنصة وترويجه، مع احتفاظك بملكيته الكاملة.",
            },
            {
              num: "٤", title: "حقوق الملكية الفكرية",
              body: "جميع المحتويات والتصاميم والشعارات الخاصة بمنصة عقارات بنها هي ملك حصري للمنصة ومحمية بموجب قوانين حقوق الملكية الفكرية.",
            },
            {
              num: "٥", title: "تعليق الحساب وإنهاؤه",
              body: "نحتفظ بالحق في تعليق أو إنهاء حسابك في حال انتهاك هذه الشروط، مع إخطارك بالأسباب عند الإمكان.",
            },
            {
              num: "٦", title: "إخلاء المسؤولية",
              body: "تُقدَّم المنصة \"كما هي\" دون أي ضمانات. لا نتحمل مسؤولية أي خسائر ناتجة عن استخدامك للمنصة أو عدم قدرتك على استخدامها.",
            },
            {
              num: "٧", title: "التواصل",
              body: "لأي استفسارات قانونية، تواصل معنا: realestate@aqarat-banha.com",
            },
          ].map(s => (
            <div key={s.num} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-2">{s.num}. {s.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <RealEstateFooter />
    </div>
  );
}
