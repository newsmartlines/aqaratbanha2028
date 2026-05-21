import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Shield, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />

      <div className="bg-primary text-primary-foreground py-14">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">سياسة الخصوصية</h1>
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
              num: "١", title: "جمع المعلومات",
              body: "نجمع المعلومات التي تقدّمها لنا مباشرةً عند إنشاء حساب أو نشر عقار أو التواصل معنا. تشمل هذه المعلومات: الاسم، البريد الإلكتروني، رقم الهاتف، وبيانات العقارات.",
            },
            {
              num: "٢", title: "استخدام المعلومات",
              body: "نستخدم المعلومات لتشغيل المنصة وتحسين خدماتها، والتواصل معك بشأن حسابك، وإرسال إشعارات العقارات، وتحسين تجربة المستخدم.",
            },
            {
              num: "٣", title: "حماية المعلومات",
              body: "نتّخذ إجراءات أمنية مناسبة لحماية معلوماتك من الوصول غير المصرّح به. تُخزَّن كلمات المرور مُشفَّرة ولا يمكن الاطلاع عليها بأي شكل.",
            },
            {
              num: "٤", title: "مشاركة المعلومات",
              body: "لا نبيع أو نؤجر أو نتاجر بمعلوماتك الشخصية مع أطراف ثالثة. قد نشارك معلومات مجهولة الهوية ومجمّعة لأغراض تحليلية فقط.",
            },
            {
              num: "٥", title: "ملفات تعريف الارتباط (Cookies)",
              body: "نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتذكّر تفضيلاتك. يمكنك ضبط متصفحك لرفض هذه الملفات لكن ذلك قد يؤثر على بعض وظائف الموقع.",
            },
            {
              num: "٦", title: "التواصل معنا",
              body: "إن كان لديك أي استفسار حول سياسة الخصوصية، تواصل معنا عبر: realestate@aqarat-banha.com",
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
