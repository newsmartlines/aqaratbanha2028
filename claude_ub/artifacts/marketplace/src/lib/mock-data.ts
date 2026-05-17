import { ChefHat, Scissors, Wrench, Package, Truck, Music } from "lucide-react";

export const CATEGORIES = [
  { id: "food", name: "طعام وضيافة", icon: ChefHat, color: "bg-orange-100 text-orange-600 border-orange-200" },
  { id: "handmade", name: "منتجات يدوية", icon: Package, color: "bg-blue-100 text-blue-600 border-blue-200" },
  { id: "maintenance", name: "صيانة منزلية", icon: Wrench, color: "bg-slate-100 text-slate-600 border-slate-200" },
  { id: "delivery", name: "توصيل", icon: Truck, color: "bg-green-100 text-green-600 border-green-200" },
  { id: "beauty", name: "عناية وتجميل", icon: Scissors, color: "bg-pink-100 text-pink-600 border-pink-200" },
  { id: "events", name: "مناسبات", icon: Music, color: "bg-purple-100 text-purple-600 border-purple-200" },
];

export const FEATURED_LISTINGS = [
  { id: 1, title: "مطبخ أم خالد", desc: "أشهى المأكولات الشعبية والمحاشي ورق العنب المحضرة منزلياً بنظافة وحب", cat: "طعام", img: "/images/food.jpg", defaultImg: "/images/food.jpg", rating: 4.9, reviews: 124, location: "الرياض، الياسمين", featured: true },
  { id: 2, title: "أنامل للإبداع", desc: "خزفيات وتحف فنية مصنوعة يدوياً تناسب الديكورات الحديثة والكلاسيكية", cat: "حرف يدوية", img: "/images/handmade.jpg", defaultImg: "/images/handmade.jpg", rating: 4.8, reviews: 86, location: "جدة، الشاطئ", featured: true },
  { id: 3, title: "تنسيق ليالينا", desc: "تنسيق طاولات وكوش أفراح حديثة وتجهيز كامل للحفلات والمناسبات الخاصة", cat: "مناسبات", img: "/images/event.jpg", defaultImg: "/images/event.jpg", rating: 5.0, reviews: 42, location: "الدمام، الفيصلية", featured: true },
  { id: 4, title: "صيانة الفهد", desc: "إصلاح أعطال التكييف والسباكة والكهرباء مع ضمان على الخدمة وسرعة استجابة", cat: "صيانة", img: "/images/hero.jpg", defaultImg: "/images/hero.jpg", rating: 4.7, reviews: 210, location: "الرياض، الملقا", featured: false },
  { id: 5, title: "حلويات نورة", desc: "كيك وحلويات للمناسبات وأعياد الميلاد بتصاميم مخصصة حسب الطلب", cat: "طعام", img: "/images/food2.jpg", defaultImg: "/images/food.jpg", rating: 4.9, reviews: 315, location: "الرياض، النرجس", featured: true },
  { id: 6, title: "صالون أريج المتنقل", desc: "خدمات تجميل وعناية بالشعر والبشرة تصلك إلى باب منزلك بأفضل الأسعار", cat: "عناية وتجميل", img: "/images/beauty2.jpg", defaultImg: "/images/beauty2.jpg", rating: 4.6, reviews: 92, location: "جدة، الحمراء", featured: false },
  { id: 7, title: "توصيل سريع", desc: "توصيل الطرود والهدايا داخل المدينة في نفس اليوم بأمان تام", cat: "توصيل", img: "/images/delivery2.jpg", defaultImg: "/images/delivery2.jpg", rating: 4.8, reviews: 412, location: "الرياض، كافة الأحياء", featured: false },
  { id: 8, title: "لقطات للتصوير", desc: "تصوير منتجات وتغطية مناسبات صغيرة بجودة احترافية وأسعار منافسة", cat: "مناسبات", img: "/images/event.jpg", defaultImg: "/images/event.jpg", rating: 4.9, reviews: 58, location: "الدمام، الخبر", featured: true },
  { id: 9, title: "ورشتي للصيانة", desc: "أفضل فنيي الصيانة لتصليح الأجهزة الكهربائية والمنزلية بأسعار معقولة", cat: "صيانة", img: "/images/maintenance2.jpg", defaultImg: "/images/hero.jpg", rating: 4.5, reviews: 150, location: "مكة، العوالي", featured: false },
  { id: 10, title: "مخبوزات الفرن", desc: "أطيب المخبوزات الطازجة يومياً، معجنات وفطائر تناسب جميع الأذواق", cat: "طعام", img: "/images/food2.jpg", defaultImg: "/images/food.jpg", rating: 4.7, reviews: 89, location: "المدينة، الهجرة", featured: false },
  { id: 11, title: "إبداع الخشب", desc: "أثاث منزلي وديكورات خشبية مصممة خصيصاً لتناسب مساحتك", cat: "حرف يدوية", img: "/images/handmade.jpg", defaultImg: "/images/handmade.jpg", rating: 4.8, reviews: 67, location: "الرياض، النخيل", featured: true },
  { id: 12, title: "نقليات السهم", desc: "نقل عفش وأثاث منزلي داخل وخارج المدينة مع الفك والتركيب", cat: "توصيل", img: "/images/delivery2.jpg", defaultImg: "/images/delivery2.jpg", rating: 4.4, reviews: 204, location: "جدة، المروة", featured: false },
  { id: 13, title: "مركز التألق", desc: "مركز متخصص في العناية بالبشرة والليزر بأحدث التقنيات", cat: "عناية وتجميل", img: "/images/beauty2.jpg", defaultImg: "/images/beauty2.jpg", rating: 4.9, reviews: 340, location: "الرياض، العليا", featured: true },
  { id: 14, title: "بوفيه الضيافة", desc: "تجهيز بوفيهات مفتوحة للمناسبات الكبيرة والصغيرة بتشكيلة واسعة", cat: "طعام", img: "/images/food.jpg", defaultImg: "/images/food.jpg", rating: 4.8, reviews: 178, location: "الدمام، الشاطئ", featured: false },
  { id: 15, title: "كهربائي محترف", desc: "تأسيس وصيانة كهرباء المنازل والمحلات التجارية بدقة عالية", cat: "صيانة", img: "/images/maintenance2.jpg", defaultImg: "/images/hero.jpg", rating: 4.6, reviews: 120, location: "الرياض، الروضة", featured: false },
  { id: 16, title: "هدايا مميزة", desc: "تنسيق هدايا وتغليف مبتكر لجميع المناسبات مع التوصيل", cat: "حرف يدوية", img: "/images/handmade.jpg", defaultImg: "/images/handmade.jpg", rating: 4.9, reviews: 55, location: "جدة، الصفا", featured: true },
];
