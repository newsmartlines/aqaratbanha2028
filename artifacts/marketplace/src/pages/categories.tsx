import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { api, type Category, type Subcategory } from "@/lib/api";
import { 
  ChefHat, Wrench, Palette, BookOpen, Calendar, Sparkles, Grid,
  ChevronDown, ChevronUp, ArrowLeft, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, React.ElementType> = {
  ChefHat, Wrench, Palette, BookOpen, Calendar, Sparkles, Grid,
};

const COLOR_PAIRS = [
  { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", sub: "bg-amber-50/60 hover:bg-amber-100" },
  { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", sub: "bg-blue-50/60 hover:bg-blue-100" },
  { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600", sub: "bg-purple-50/60 hover:bg-purple-100" },
  { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600", sub: "bg-green-50/60 hover:bg-green-100" },
  { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-600", sub: "bg-rose-50/60 hover:bg-rose-100" },
  { bg: "bg-teal-50", border: "border-teal-200", icon: "text-teal-600", sub: "bg-teal-50/60 hover:bg-teal-100" },
];

export default function CategoriesPage() {
  const [, setLocation] = useLocation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.list,
  });

  const { data: allSubs = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: api.subcategories.list,
  });

  const getSubs = (catId: number) => (allSubs as Subcategory[]).filter(s => s.categoryId === catId);

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="container mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-10 text-center">
          <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full">التصنيفات</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">تصفح جميع التصنيفات</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">اختر التصنيف الذي يناسب احتياجاتك وتصفح الفئات الفرعية للعثور على الخدمة المثالية</p>
        </div>

        {catsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {(categories as Category[]).map((cat, i) => {
              const Icon = ICON_MAP[cat.icon ?? "Grid"] ?? Grid;
              const colors = COLOR_PAIRS[i % COLOR_PAIRS.length];
              const subs = getSubs(cat.id);
              const isOpen = expandedId === cat.id;

              return (
                <div key={cat.id} className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                  {/* Category Row — Haraj style */}
                  <div
                    className="w-full flex items-center gap-4 p-4 md:p-5 text-right transition-colors hover:bg-secondary/30 cursor-pointer"
                    onClick={() => toggleExpand(cat.id)}
                  >
                    {/* Icon */}
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center border ${colors.bg} ${colors.border} shrink-0`}>
                      <Icon className={`w-6 h-6 md:w-7 md:h-7 ${colors.icon}`} />
                    </div>

                    {/* Name & sub count */}
                    <div className="flex-1 text-right">
                      <h2 className="text-lg md:text-xl font-bold text-foreground">{cat.nameAr}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {subs.length > 0 ? `${subs.length} تصنيف فرعي` : cat.description ?? cat.nameEn}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/10 rounded-full text-sm font-medium px-4 hidden md:flex"
                        onClick={e => { e.stopPropagation(); setLocation(`/search?category=${cat.id}`); }}
                      >
                        عرض الخدمات
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                      </Button>
                      {subs.length > 0 ? (
                        isOpen
                          ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          : <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : null}
                    </div>
                  </div>

                  {/* Subcategories Panel — expands below like Haraj */}
                  {isOpen && subs.length > 0 && (
                    <div className={`border-t border-border/40 px-4 md:px-5 py-4 ${colors.bg}`}>
                      <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wide">التصنيفات الفرعية</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {subs.map(sub => {
                          const SubIcon = ICON_MAP[sub.icon ?? "Grid"] ?? Grid;
                          return (
                            <button
                              key={sub.id}
                              className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${colors.border} ${colors.sub} transition-all hover:shadow-sm text-center cursor-pointer group`}
                              onClick={() => setLocation(`/search?subcategory=${sub.id}&category=${cat.id}`)}
                            >
                              <SubIcon className={`w-5 h-5 ${colors.icon} group-hover:scale-110 transition-transform`} />
                              <span className="text-xs font-medium text-foreground leading-tight">{sub.nameAr}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex md:hidden">
                        <Button size="sm" variant="outline" className="text-primary border-primary/30 rounded-full" onClick={() => setLocation(`/search?category=${cat.id}`)}>
                          عرض كل خدمات {cat.nameAr}
                        </Button>
                      </div>
                    </div>
                  )}

                  {isOpen && subs.length === 0 && (
                    <div className={`border-t border-border/40 px-5 py-4 ${colors.bg} text-center`}>
                      <Button size="sm" className="bg-primary text-primary-foreground rounded-full" onClick={() => setLocation(`/search?category=${cat.id}`)}>
                        عرض جميع الخدمات
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RealEstateFooter />
    </div>
  );
}
