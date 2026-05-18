import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { api, mediaUrl, type PublicService, type Category } from "@/lib/api";
import {
  Search, SlidersHorizontal, X, MapPin, Tag, Star,
  User, Loader2, Building2, Phone, ChevronLeft, Wrench,
} from "lucide-react";

const CITIES = [
  "بنها", "قليوب", "شبرا الخيمة", "خانكة", "طوخ", "كفر شكر",
  "منشأة القناطر", "تلبانة", "أبو زعبل",
];

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["categories", "service"],
    queryFn: () => api.categories.list("service"),
  });

  const { data: allServices = [], isLoading } = useQuery({
    queryKey: ["public-services"],
    queryFn: () => api.services.listAll(),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    return (allServices as PublicService[]).filter(s => {
      const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "all" || String(s.categoryId) === selectedCategory;
      const matchCity = selectedCity === "all" || (s.providerCity ?? "").includes(selectedCity);
      const price = parseFloat(s.price ?? "0");
      const matchPrice = price >= priceRange[0] && price <= priceRange[1];
      return matchSearch && matchCat && matchCity && matchPrice;
    });
  }, [allServices, search, selectedCategory, selectedCity, priceRange]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedCity("all");
    setPriceRange([0, 50000]);
  };

  const hasFilters = search || selectedCategory !== "all" || selectedCity !== "all" ||
    priceRange[0] > 0 || priceRange[1] < 50000;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" dir="rtl">
      <Header />

      {/* Page Header */}
      <div className="bg-gradient-to-l from-primary/5 to-primary/10 border-b border-border/40">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/"><span className="hover:text-primary cursor-pointer">الرئيسية</span></Link>
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">الخدمات</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-1 flex items-center gap-2">
            <Wrench className="w-7 h-7 text-primary" />
            الخدمات
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "جاري التحميل..." : `${allServices.length} خدمة متاحة في بنها والقليوبية`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex gap-8 items-start">

          {/* ── RIGHT SIDEBAR FILTERS ── */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24">
            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <div className="flex items-center gap-2 font-bold text-base">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  فلاتر البحث
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium">
                    <X className="w-3.5 h-3.5" /> مسح الكل
                  </button>
                )}
              </div>

              <div className="p-5 space-y-6">
                {/* Search */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">البحث بالكلمة</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="ابحث عن خدمة..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pr-9 h-10 text-sm"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2">
                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">التصنيف</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-10 text-sm">
                      <Building2 className="w-3.5 h-3.5 ml-1.5 text-primary shrink-0" />
                      <SelectValue placeholder="كل التصنيفات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل التصنيفات</SelectItem>
                      {(categories as Category[]).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">المدينة / المنطقة</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-10 text-sm">
                      <MapPin className="w-3.5 h-3.5 ml-1.5 text-primary shrink-0" />
                      <SelectValue placeholder="كل المناطق" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المناطق</SelectItem>
                      {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-foreground">نطاق السعر</label>
                    <span className="text-xs text-primary font-bold">
                      {priceRange[0].toLocaleString("ar-EG")} — {priceRange[1].toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={50000}
                    step={500}
                    value={priceRange}
                    onValueChange={v => setPriceRange(v as [number, number])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                    <span>0</span>
                    <span>٥٠,٠٠٠ ج.م</span>
                  </div>
                </div>

                {/* Quick chips: subcategories */}
                {selectedCategory !== "all" && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">نتائج التصنيف</label>
                    <div className="flex flex-wrap gap-1.5">
                      {filtered
                        .map(s => s.subcategory)
                        .filter((v, i, a) => v && a.indexOf(v) === i)
                        .slice(0, 8)
                        .map(sub => (
                          <Badge key={sub} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                            {sub}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <span className="text-2xl font-black text-primary">{filtered.length}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">خدمة مطابقة</p>
                </div>
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0">
            {/* Mobile filter toggle */}
            <div className="lg:hidden mb-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                الفلاتر
                {hasFilters && <Badge className="h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center">!</Badge>}
              </Button>
              <span className="text-sm text-muted-foreground">{filtered.length} نتيجة</span>
            </div>

            {/* Mobile filters panel */}
            {filtersOpen && (
              <div className="lg:hidden mb-6 bg-card border border-border/60 rounded-2xl p-5 space-y-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input placeholder="ابحث عن خدمة..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 h-10 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="التصنيف" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل التصنيفات</SelectItem>
                      {(categories as Category[]).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="المدينة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المناطق</SelectItem>
                      {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters} className="text-red-500 w-full"><X className="w-3.5 h-3.5 me-1.5" />مسح الفلاتر</Button>}
              </div>
            )}

            {/* Sort/Result bar */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{filtered.length}</span> خدمة
                {hasFilters && <button onClick={clearFilters} className="mr-2 text-xs text-red-500 hover:underline"><X className="w-3 h-3 inline" /> مسح</button>}
              </p>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">جاري تحميل الخدمات...</p>
              </div>
            )}

            {/* Empty */}
            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Wrench className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <h3 className="font-bold text-lg mb-2">لا توجد خدمات مطابقة</h3>
                <p className="text-muted-foreground text-sm mb-4">جرّب تغيير الفلاتر أو توسيع نطاق البحث</p>
                <Button variant="outline" onClick={clearFilters}>مسح الفلاتر</Button>
              </div>
            )}

            {/* Services Grid */}
            {!isLoading && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RealEstateFooter />
    </div>
  );
}

function ServiceCard({ service }: { service: PublicService }) {
  const imgSrc = service.img
    ? mediaUrl(service.img)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(service.title)}&background=0d9488&color=fff&size=400&bold=true&format=png`;

  const price = service.price ? parseFloat(service.price) : null;

  return (
    <Link href={`/provider/${service.providerId}`}>
      <div className="group bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer h-full flex flex-col">
        {/* Image */}
        <div className="relative h-44 overflow-hidden bg-muted shrink-0">
          <img
            src={imgSrc}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(service.title)}&background=0d9488&color=fff&size=400&bold=true&format=png`;
            }}
          />
          {service.categoryNameAr && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-primary/90 text-primary-foreground text-[11px] font-semibold shadow-sm">
                {service.categoryNameAr}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 gap-2">
          <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {service.title}
          </h3>

          {service.subcategory && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="w-3 h-3 shrink-0" />
              {service.subcategory}
            </div>
          )}

          {service.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {service.description}
            </p>
          )}

          <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
            {/* Provider */}
            <div className="flex items-center gap-2 min-w-0">
              {service.providerAvatar ? (
                <img
                  src={mediaUrl(service.providerAvatar)}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover border border-border/60 shrink-0"
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{service.providerName ?? "مزود خدمة"}</p>
                {service.providerCity && (
                  <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {service.providerCity}
                  </div>
                )}
              </div>
            </div>

            {/* Price */}
            {price !== null && price > 0 ? (
              <div className="text-left shrink-0">
                <span className="text-base font-black text-primary">{price.toLocaleString("ar-EG")}</span>
                <span className="text-[10px] text-muted-foreground mr-0.5">ج.م</span>
              </div>
            ) : (
              <Badge variant="secondary" className="text-[11px]">اتفاقي</Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
