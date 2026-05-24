import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Map, Home, Building2, Search, User, Info, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

const LINKS = [
  {
    title: "الصفحات الرئيسية",
    Icon: Home,
    color: "bg-blue-50 text-blue-600",
    items: [
      { label: "الرئيسية", path: "/" },
      { label: "جميع العقارات", path: "/properties" },
      { label: "من نحن", path: "/about" },
      { label: "تواصل معنا", path: "/contact" },
      { label: "الأسئلة الشائعة", path: "/faq" },
    ],
  },
  {
    title: "البحث والتصفية",
    Icon: Search,
    color: "bg-teal-50 text-teal-600",
    items: [
      { label: "عقارات للبيع", path: "/properties?listingType=sale" },
      { label: "عقارات للإيجار", path: "/properties?listingType=rent" },
      { label: "فيلل فاخرة", path: "/properties?mainCategory=فيلا" },
      { label: "شقق سكنية", path: "/properties?mainCategory=شقة" },
      { label: "مكاتب تجارية", path: "/properties?mainCategory=مكتب" },
      { label: "دوبلكس", path: "/properties?mainCategory=دوبلكس" },
      { label: "أراضي", path: "/properties?mainCategory=أرض" },
      { label: "عمارات استثمارية", path: "/properties?mainCategory=عمارة" },
    ],
  },
  {
    title: "حسابي",
    Icon: User,
    color: "bg-purple-50 text-purple-600",
    items: [
      { label: "تسجيل الدخول", path: "/login" },
      { label: "إنشاء حساب", path: "/register" },
      { label: "لوحة تحكم المعلن", path: "/dashboard" },
      { label: "المفضلة", path: "/user/favorites" },
    ],
  },
  {
    title: "سياسات الموقع",
    Icon: Info,
    color: "bg-orange-50 text-orange-600",
    items: [
      { label: "سياسة الخصوصية", path: "/privacy" },
      { label: "الشروط والأحكام", path: "/terms" },
    ],
  },
];

export default function SitemapPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />

      <div className="bg-primary text-primary-foreground py-14">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 mb-4">
            <Map className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">خريطة الموقع</h1>
          <p className="text-primary-foreground/80 text-lg">دليل بجميع صفحات منصة عقارات بنها</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <button onClick={() => setLocation("/")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4 rotate-180" /> العودة للرئيسية
        </button>

        <div className="grid gap-5 sm:grid-cols-2">
          {LINKS.map(section => {
            const Icon = section.Icon;
            return (
              <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-100 ${section.color}`}>
                  <Icon className="w-4 h-4" />
                  <span className="font-bold text-sm">{section.title}</span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {section.items.map(item => (
                    <li key={item.label}>
                      <button
                        onClick={() => setLocation(item.path)}
                        className="w-full text-right px-5 py-3 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 transition-all flex items-center justify-between group"
                      >
                        <span>{item.label}</span>
                        <ChevronLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 rotate-180 transition-all text-primary" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <RealEstateFooter />
    </div>
  );
}
