import { useState } from "react";
import { Link } from "wouter";
import {
  Bell, BellOff, Trash2, Loader2, Search, SlidersHorizontal,
  MapPin, Tag, DollarSign, RefreshCw, Plus,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

type SavedSearch = {
  id: number;
  name: string;
  email: string | null;
  filters: string;
  notifyEmail: boolean;
  notifyApp: boolean;
  createdAt: string;
};

function parseFilters(raw: string): Record<string, any> {
  try { return JSON.parse(raw ?? "{}"); } catch { return {}; }
}

const CATEGORY_LABELS: Record<string, string> = {
  residential: "سكني",
  commercial: "تجاري",
  land: "أراضي",
  industrial: "صناعي",
};

const LISTING_TYPE_LABELS: Record<string, string> = {
  sale: "للبيع",
  rent: "للإيجار",
};

function FilterPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded-lg border border-indigo-100">
      <span className="text-indigo-400">{label}:</span> {value}
    </span>
  );
}

function SearchCard({ s, onDelete }: { s: SavedSearch; onDelete: (id: number) => void }) {
  const filters = parseFilters(s.filters);
  const pills: { label: string; value: string }[] = [];

  if (filters.mainCategory) pills.push({ label: "النوع", value: CATEGORY_LABELS[filters.mainCategory] ?? filters.mainCategory });
  if (filters.listingType) pills.push({ label: "الصفقة", value: LISTING_TYPE_LABELS[filters.listingType] ?? filters.listingType });
  if (filters.city) pills.push({ label: "المدينة", value: filters.city });
  if (filters.maxPrice) pills.push({ label: "أقصى سعر", value: `${Number(filters.maxPrice).toLocaleString("ar-EG")} ج.م` });
  if (filters.minArea) pills.push({ label: "أدنى مساحة", value: `${filters.minArea} م²` });

  const hasFilters = pills.length > 0;
  const dateLabel = s.createdAt
    ? new Date(s.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })
    : "";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-sm truncate">{s.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
          </div>
        </div>
        <button
          onClick={() => onDelete(s.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          title="حذف البحث المحفوظ"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap gap-1.5">
          {pills.map((p) => (
            <FilterPill key={p.label} label={p.label} value={p.value} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">جميع العقارات (بدون فلاتر محددة)</p>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.notifyEmail ? "text-green-600" : "text-gray-400"}`}>
            {s.notifyEmail
              ? <><Bell className="w-3 h-3" /> إشعار بريد</>
              : <><BellOff className="w-3 h-3" /> بدون بريد</>
            }
          </span>
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.notifyApp ? "text-green-600" : "text-gray-400"}`}>
            {s.notifyApp
              ? <><Bell className="w-3 h-3" /> إشعار داخلي</>
              : <><BellOff className="w-3 h-3" /> بدون إشعار</>
            }
          </span>
        </div>
        <Link href={buildSearchUrl(filters)}>
          <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
            عرض النتائج ←
          </button>
        </Link>
      </div>

      {s.email && (
        <p className="text-xs text-gray-400 -mt-2">
          الإشعارات تُرسل إلى: <span className="text-gray-600 font-medium">{s.email}</span>
        </p>
      )}
    </div>
  );
}

function buildSearchUrl(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  if (filters.mainCategory) params.set("mainCategory", filters.mainCategory);
  if (filters.listingType) {
    params.set("listingType", filters.listingType);
  }
  if (filters.city) params.set("city", filters.city);
  if (filters.maxPrice) params.set("price", `0-${filters.maxPrice}`);
  const qs = params.toString();
  return qs ? `/properties?${qs}` : "/properties";
}

export default function UserSavedSearches() {
  const queryClient = useQueryClient();

  const { data: searches = [], isLoading } = useQuery<SavedSearch[]>({
    queryKey: ["saved-searches"],
    queryFn: () => api.savedSearches.list(),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.savedSearches.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<SavedSearch[]>(["saved-searches"], (prev) =>
        (prev ?? []).filter((s) => s.id !== id)
      );
      toast.success("تم حذف البحث المحفوظ");
    },
    onError: () => toast.error("فشل الحذف، حاول مرة أخرى"),
  });

  return (
    <UserLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تنبيهات البحث المحفوظة</h1>
            <p className="text-gray-500 mt-1 text-sm">
              سنُعلمك تلقائياً عبر الإيميل والإشعارات عند إضافة عقارات تطابق بحثك
            </p>
          </div>
          {!isLoading && (
            <Badge variant="secondary" className="px-3 py-1.5 text-sm shrink-0">
              {searches.length} {searches.length === 1 ? "تنبيه" : "تنبيهات"}
            </Badge>
          )}
        </div>

        {/* How it works banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-indigo-900 text-sm mb-1">كيف تعمل التنبيهات؟</h3>
            <p className="text-indigo-700/80 text-xs leading-relaxed">
              عند إضافة أي عقار جديد يطابق معايير بحثك المحفوظ، سيصلك إشعار داخلي فوري وبريد إلكتروني (إن كنت قد أضفت بريدك).
              يمكنك إنشاء تنبيه جديد من صفحة <Link href="/properties" className="font-bold underline">العقارات</Link> بالضغط على زر «حفظ البحث».
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : searches.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد تنبيهات بعد</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              احفظ بحثك من صفحة العقارات وسنُعلمك فور إضافة عقارات تطابقه
            </p>
            <Link href="/properties">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                <Search className="w-4 h-4" />
                استعرض العقارات
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searches.map((s) => (
              <SearchCard
                key={s.id}
                s={s}
                onDelete={(id) => deleteMut.mutate(id)}
              />
            ))}
          </div>
        )}

        {searches.length > 0 && (
          <div className="flex justify-center pt-2">
            <Link href="/properties">
              <Button variant="outline" className="rounded-xl gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <Plus className="w-4 h-4" />
                أضف تنبيهاً جديداً
              </Button>
            </Link>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
