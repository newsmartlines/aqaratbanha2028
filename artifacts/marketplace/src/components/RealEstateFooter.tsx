import { useLocation } from "wouter";
import { Building2, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Youtube } from "lucide-react";

export function RealEstateFooter() {
  const [, setLocation] = useLocation();

  return (
    <footer className="bg-gray-900 text-gray-300 pt-14 pb-6 mt-12" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-extrabold text-white text-lg leading-none">دليل بلس</p>
                <p className="text-xs text-gray-400">العقارات</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              منصتك الموثوقة للعثور على أفضل العقارات في جميع أنحاء جمهورية مصر العربية — بيعاً وإيجاراً واستثماراً.
            </p>
            <div className="flex items-center gap-3">
              {[
                { Icon: Facebook, href: "#" },
                { Icon: Twitter, href: "#" },
                { Icon: Instagram, href: "#" },
                { Icon: Youtube, href: "#" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-primary flex items-center justify-center transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <p className="font-bold text-white mb-4 text-sm uppercase tracking-wide">روابط سريعة</p>
            <ul className="space-y-2.5">
              {[
                { label: "الرئيسية", path: "/" },
                { label: "جميع العقارات", path: "/properties" },
                { label: "للبيع", path: "/properties" },
                { label: "للإيجار", path: "/properties" },
                { label: "من نحن", path: "/about" },
                { label: "تواصل معنا", path: "/contact" },
              ].map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => setLocation(l.path)}
                    className="text-sm text-gray-400 hover:text-primary transition-colors hover:translate-x-[-4px] block"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Property Types */}
          <div>
            <p className="font-bold text-white mb-4 text-sm uppercase tracking-wide">أنواع العقارات</p>
            <ul className="space-y-2.5">
              {["فيلل فاخرة", "شقق سكنية", "مكاتب تجارية", "دوبلكس", "أراضي", "عمارات استثمارية"].map((t) => (
                <li key={t}>
                  <button
                    onClick={() => setLocation("/properties")}
                    className="text-sm text-gray-400 hover:text-primary transition-colors block"
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-bold text-white mb-4 text-sm uppercase tracking-wide">تواصل معنا</p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-gray-400">طريق الملك فهد، حي العليا، القاهرة 12244</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-gray-400" dir="ltr">+20 11 234 5678</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-gray-400">realestate@daleelplus.sa</span>
              </li>
            </ul>

            <div className="mt-5 p-4 bg-gray-800 rounded-2xl border border-gray-700">
              <p className="text-xs font-bold text-white mb-1">ساعات العمل</p>
              <p className="text-xs text-gray-400">السبت – الخميس: ٩ ص – ٦ م</p>
              <p className="text-xs text-gray-400">الجمعة: مغلق</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} دليل بلس للعقارات. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <button className="hover:text-gray-300 transition-colors">سياسة الخصوصية</button>
            <span>·</span>
            <button className="hover:text-gray-300 transition-colors">الشروط والأحكام</button>
            <span>·</span>
            <button className="hover:text-gray-300 transition-colors">خريطة الموقع</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
