import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api } from "@/lib/api";
import { ALL_PROPERTY_TYPES } from "@/components/property-form/property-type-config";
import { ALL_FIELD_DEFS } from "@/lib/property-field-rules";
import {
  Layers, ChevronDown, ChevronUp, CheckSquare, Square, Save, RefreshCw,
  Settings2, List, Check, X, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Shared types ─────────────────────────────────────────────────────────────

type Feature = {
  id: number;
  type: string;
  name: string;
  icon: string | null;
  status: string;
  sortOrder: number;
  applicableTypes: string | null;
};

type FieldConfigRow = {
  mainCategory: string;
  fieldKey: string;
  isVisible: boolean;
};

type PageTab = "features" | "fields";

function parseTypes(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function TypeBadge({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded-lg border text-xs font-medium transition-all select-none",
        active
          ? "border-teal-600 bg-teal-50 text-teal-700"
          : "border-border text-muted-foreground hover:border-teal-300 hover:bg-secondary/50"
      )}
    >
      {label}
    </button>
  );
}

// ─── Features Tab ─────────────────────────────────────────────────────────────

function FeaturesTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [localTypes, setLocalTypes] = useState<Record<number, string[]>>({});
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const { data: features = [], isLoading } = useQuery<Feature[]>({
    queryKey: ["admin-property-features-all"],
    queryFn: () => api.propertyFeatures.adminListAll(),
  });

  useEffect(() => {
    if (features.length === 0) return;
    const init: Record<number, string[]> = {};
    features.forEach((f: Feature) => { init[f.id] = parseTypes(f.applicableTypes); });
    setLocalTypes(init);
  }, [features]);

  const updateMutation = useMutation({
    mutationFn: ({ id, types }: { id: number; types: string[] }) =>
      api.propertyFeatures.update(id, {
        applicableTypes: types.length === 0 ? null : JSON.stringify(types),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-property-features-all"] }),
  });

  const handleToggleType = (featureId: number, propType: string) => {
    setLocalTypes((prev) => {
      const current = prev[featureId] ?? [];
      const next = current.includes(propType)
        ? current.filter((t) => t !== propType)
        : [...current, propType];
      return { ...prev, [featureId]: next };
    });
  };

  const handleSelectAll = (featureId: number) => {
    setLocalTypes((prev) => ({ ...prev, [featureId]: [] }));
  };

  const handleSave = async (featureId: number) => {
    setSaving((prev) => ({ ...prev, [featureId]: true }));
    try {
      await updateMutation.mutateAsync({ id: featureId, types: localTypes[featureId] ?? [] });
      toast.success("تم الحفظ");
    } finally {
      setSaving((prev) => ({ ...prev, [featureId]: false }));
    }
  };

  const hasChanges = (feature: Feature) => {
    const original = parseTypes(feature.applicableTypes);
    const current = localTypes[feature.id] ?? [];
    return JSON.stringify([...original].sort()) !== JSON.stringify([...current].sort());
  };

  const featureRows = (features as Feature[]).filter((f: Feature) => f.type === "feature");
  const serviceRows = (features as Feature[]).filter((f: Feature) => f.type === "service");

  const featuresByType: Record<string, Feature[]> = {};
  ALL_PROPERTY_TYPES.forEach((t) => {
    featuresByType[t] = featureRows.filter((f: Feature) => {
      const types = localTypes[f.id] ?? parseTypes(f.applicableTypes);
      return types.length === 0 || types.includes(t);
    });
  });

  if (isLoading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Info Banner ───────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>كيف يعمل هذا؟</strong> عندما يختار المعلن نوع العقار (مثل: شقة، أرض، مستودع...)
          يرى فقط المميزات والخدمات المناسبة لذلك النوع.
          إذا تركت الاختيار على "جميع الأنواع" تظهر الميزة لجميع الأنواع.
        </div>
      </div>

      {/* ─── View by Property Type ─────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold mb-3 border-b pb-2">عرض حسب نوع العقار</h2>
        <div className="space-y-2">
          {ALL_PROPERTY_TYPES.map((propType) => {
            const activeFeatures = featuresByType[propType] ?? [];
            const isOpen = expandedType === propType;
            return (
              <div key={propType} className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/60 transition-colors"
                  onClick={() => setExpandedType(isOpen ? null : propType)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">{propType}</span>
                    <span className="text-xs text-muted-foreground bg-white border rounded-full px-2 py-0.5">
                      {activeFeatures.length} ميزة
                    </span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeFeatures.length === 0 ? (
                      <p className="text-sm text-muted-foreground col-span-full">لا توجد مميزات لهذا النوع</p>
                    ) : (
                      activeFeatures.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-sm">
                          <span className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center text-xs">{f.icon ?? "📌"}</span>
                          {f.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Manage Feature → Types ────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold mb-3 border-b pb-2">إدارة المميزات</h2>
        <div className="space-y-3">
          {featureRows.map((feature) => {
            const current = localTypes[feature.id] ?? parseTypes(feature.applicableTypes);
            const isAllTypes = current.length === 0;
            const changed = hasChanges(feature);
            return (
              <div key={feature.id} className={cn("border rounded-xl p-4 transition-colors", changed ? "border-amber-300 bg-amber-50/50" : "border-border bg-white")}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{feature.icon ?? "📌"}</span>
                    <div>
                      <span className="font-bold text-sm">{feature.name}</span>
                      <span className={cn("mr-2 text-xs px-2 py-0.5 rounded-full border", feature.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200")}>
                        {feature.status === "active" ? "نشط" : "معطل"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(feature.id)}
                      className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors", isAllTypes ? "bg-teal-600 text-white border-teal-600" : "border-border text-muted-foreground hover:border-teal-300")}
                    >
                      {isAllTypes ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                      جميع الأنواع
                    </button>
                    {changed && (
                      <button
                        type="button"
                        disabled={saving[feature.id]}
                        onClick={() => handleSave(feature.id)}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        {saving[feature.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        حفظ
                      </button>
                    )}
                  </div>
                </div>
                {!isAllTypes && (
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_PROPERTY_TYPES.map((pt) => (
                      <TypeBadge key={pt} label={pt} active={current.includes(pt)} onClick={() => handleToggleType(feature.id, pt)} />
                    ))}
                  </div>
                )}
                {isAllTypes && (
                  <p className="text-xs text-muted-foreground">← هذه الميزة تظهر لجميع أنواع العقارات. اضغط على أحد أنواع العقار لتقييدها.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Services ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold mb-3 border-b pb-2">إدارة الخدمات الطرفية</h2>
        <div className="space-y-3">
          {serviceRows.map((feature) => {
            const current = localTypes[feature.id] ?? parseTypes(feature.applicableTypes);
            const isAllTypes = current.length === 0;
            const changed = hasChanges(feature);
            return (
              <div key={feature.id} className={cn("border rounded-xl p-4 transition-colors", changed ? "border-amber-300 bg-amber-50/50" : "border-border bg-white")}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{feature.icon ?? "📌"}</span>
                    <span className="font-bold text-sm">{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(feature.id)}
                      className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors", isAllTypes ? "bg-teal-600 text-white border-teal-600" : "border-border text-muted-foreground hover:border-teal-300")}
                    >
                      {isAllTypes ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                      جميع الأنواع
                    </button>
                    {changed && (
                      <button
                        type="button"
                        disabled={saving[feature.id]}
                        onClick={() => handleSave(feature.id)}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        {saving[feature.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        حفظ
                      </button>
                    )}
                  </div>
                </div>
                {!isAllTypes && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ALL_PROPERTY_TYPES.map((pt) => (
                      <TypeBadge key={pt} label={pt} active={current.includes(pt)} onClick={() => handleToggleType(feature.id, pt)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Field Configs Tab ────────────────────────────────────────────────────────

function FieldConfigsTab() {
  const qc = useQueryClient();
  const [localMap, setLocalMap] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: fieldConfigs = [], isLoading } = useQuery<FieldConfigRow[]>({
    queryKey: ["admin-field-configs"],
    queryFn: () => api.propertyFieldConfigs.adminList(),
  });

  useEffect(() => {
    if (fieldConfigs.length === 0) return;
    const map: Record<string, Record<string, boolean>> = {};
    for (const row of fieldConfigs as FieldConfigRow[]) {
      if (!map[row.mainCategory]) map[row.mainCategory] = {};
      map[row.mainCategory][row.fieldKey] = row.isVisible;
    }
    setLocalMap(map);
    setHasChanges(false);
  }, [fieldConfigs]);

  const saveMut = useMutation({
    mutationFn: () => {
      const rows: FieldConfigRow[] = [];
      for (const [mainCategory, fields] of Object.entries(localMap)) {
        for (const [fieldKey, isVisible] of Object.entries(fields)) {
          rows.push({ mainCategory, fieldKey, isVisible });
        }
      }
      return api.propertyFieldConfigs.bulkUpdate(rows);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-field-configs"] });
      qc.invalidateQueries({ queryKey: ["property-field-configs"] });
      toast.success("تم حفظ إعدادات الحقول بنجاح");
      setHasChanges(false);
    },
    onError: () => toast.error("حدث خطأ أثناء الحفظ"),
  });

  const toggle = (mainCategory: string, fieldKey: string) => {
    const current = localMap[mainCategory]?.[fieldKey] ?? true;
    setLocalMap((prev) => ({
      ...prev,
      [mainCategory]: { ...(prev[mainCategory] ?? {}), [fieldKey]: !current },
    }));
    setHasChanges(true);
  };

  const getVisible = (mainCategory: string, fieldKey: string) => {
    if (localMap[mainCategory] !== undefined && localMap[mainCategory][fieldKey] !== undefined) {
      return localMap[mainCategory][fieldKey];
    }
    const fromDB = (fieldConfigs as FieldConfigRow[]).find((r: FieldConfigRow) => r.mainCategory === mainCategory && r.fieldKey === fieldKey);
    return fromDB ? fromDB.isVisible : true;
  };

  const setAllForType = (mainCategory: string, visible: boolean) => {
    const fields: Record<string, boolean> = {};
    for (const f of ALL_FIELD_DEFS) {
      fields[f.key] = visible;
    }
    setLocalMap((prev) => ({ ...prev, [mainCategory]: fields }));
    setHasChanges(true);
  };

  const setAllForField = (fieldKey: string, visible: boolean) => {
    setLocalMap((prev) => {
      const next = { ...prev };
      for (const type of ALL_PROPERTY_TYPES) {
        next[type] = { ...(next[type] ?? {}), [fieldKey]: visible };
      }
      return next;
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Info + Save */}
      <div className="flex items-start justify-between gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3 flex-1">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>إعداد حقول العقار لكل نوع:</strong> حدد أي الحقول (غرف، حمامات، طابق...) تظهر في
            فلاتر البحث ونموذج الإضافة لكل نوع عقار. ✓ = ظاهر، ✗ = مخفي.
          </div>
        </div>
        {hasChanges && (
          <button
            type="button"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
            className="flex items-center gap-2 px-5 h-11 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 font-semibold text-sm shrink-0 transition-colors shadow-sm"
          >
            {saveMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات
          </button>
        )}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm border-collapse" dir="rtl">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-right px-4 py-3 font-bold text-slate-700 text-sm sticky right-0 bg-slate-50 border-l border-slate-200 z-10 min-w-[130px]">
                نوع العقار
              </th>
              {ALL_FIELD_DEFS.map((f) => (
                <th key={f.key} className="px-2 py-2 font-medium text-slate-500 text-center">
                  <div className="flex flex-col items-center gap-1 min-w-[62px]">
                    <span className="text-[10px] leading-tight font-semibold text-slate-600">{f.label}</span>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => setAllForField(f.key, true)}
                        title="تفعيل للكل"
                        className="w-4 h-4 rounded bg-teal-100 hover:bg-teal-200 flex items-center justify-center transition-colors"
                      >
                        <Check className="w-2.5 h-2.5 text-teal-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllForField(f.key, false)}
                        title="إخفاء للكل"
                        className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 min-w-[80px]">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {ALL_PROPERTY_TYPES.map((type, idx) => {
              const visibleCount = ALL_FIELD_DEFS.filter((f) => getVisible(type, f.key)).length;
              return (
                <tr
                  key={type}
                  className={cn(
                    "border-b border-slate-100 transition-colors hover:bg-teal-50/30",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  )}
                >
                  <td className="px-4 py-2.5 font-semibold text-slate-800 text-sm sticky right-0 bg-inherit border-l border-slate-100 z-10">
                    <div className="flex items-center gap-2">
                      <span>{type}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {visibleCount}/{ALL_FIELD_DEFS.length}
                      </span>
                    </div>
                  </td>
                  {ALL_FIELD_DEFS.map((f) => {
                    const visible = getVisible(type, f.key);
                    return (
                      <td key={f.key} className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(type, f.key)}
                          className={cn(
                            "w-7 h-7 rounded-lg transition-all flex items-center justify-center mx-auto border",
                            visible
                              ? "bg-teal-100 border-teal-300 hover:bg-teal-200 shadow-sm"
                              : "bg-slate-100 border-slate-200 hover:bg-slate-200 opacity-40"
                          )}
                          title={visible ? "ظاهر — اضغط للإخفاء" : "مخفي — اضغط للإظهار"}
                        >
                          {visible ? (
                            <Check className="w-3.5 h-3.5 text-teal-700" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        type="button"
                        onClick={() => setAllForType(type, true)}
                        title="تفعيل الكل"
                        className="text-[10px] px-1.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                      >
                        الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllForType(type, false)}
                        title="إخفاء الكل"
                        className="text-[10px] px-1.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-colors"
                      >
                        لا شيء
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
            className="flex items-center gap-2 px-6 h-11 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 font-semibold text-sm transition-colors shadow-sm"
          >
            {saveMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات ({ALL_PROPERTY_TYPES.length * ALL_FIELD_DEFS.length} خلية)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPropertyTypeConfigs() {
  const [pageTab, setPageTab] = useState<PageTab>("features");

  return (
    <AdminLayout>
      <div className="space-y-6 p-1" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إعداد أنواع العقار</h1>
            <p className="text-sm text-muted-foreground">
              تحكم في أي المميزات والحقول تظهر لكل نوع عقار في نموذج الإضافة وفلاتر البحث
            </p>
          </div>
        </div>

        {/* Page Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          {([
            { id: "features" as PageTab, label: "مميزات وخدمات", icon: List,     desc: "تحكم في أي المميزات تظهر لكل نوع" },
            { id: "fields"   as PageTab, label: "حقول العقار",   icon: Settings2, desc: "تحكم في أي الحقول تظهر (غرف، طابق، تشطيب...)" },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPageTab(id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
                pageTab === id
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {pageTab === "features" ? <FeaturesTab /> : <FieldConfigsTab />}
      </div>
    </AdminLayout>
  );
}
