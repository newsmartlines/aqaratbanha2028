import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api } from "@/lib/api";
import { ALL_PROPERTY_TYPES } from "@/components/property-form/property-type-config";
import {
  Layers, ChevronDown, ChevronUp, CheckSquare, Square, Save, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Feature = {
  id: number;
  type: string;
  name: string;
  icon: string | null;
  status: string;
  sortOrder: number;
  applicableTypes: string | null;
};

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

export default function AdminPropertyTypeConfigs() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [localTypes, setLocalTypes] = useState<Record<number, string[]>>({});
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const { data: features = [], isLoading } = useQuery<Feature[]>({
    queryKey: ["admin-property-features-all"],
    queryFn:  () => api.propertyFeatures.adminListAll(),
    onSuccess: (data) => {
      const init: Record<number, string[]> = {};
      data.forEach((f) => { init[f.id] = parseTypes(f.applicableTypes); });
      setLocalTypes(init);
    },
  });

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
    setLocalTypes((prev) => ({ ...prev, [featureId]: [] })); // empty = all types
  };

  const handleSave = async (featureId: number) => {
    setSaving((prev) => ({ ...prev, [featureId]: true }));
    try {
      await updateMutation.mutateAsync({ id: featureId, types: localTypes[featureId] ?? [] });
    } finally {
      setSaving((prev) => ({ ...prev, [featureId]: false }));
    }
  };

  const hasChanges = (feature: Feature) => {
    const original = parseTypes(feature.applicableTypes);
    const current  = localTypes[feature.id] ?? [];
    const origStr  = JSON.stringify([...original].sort());
    const currStr  = JSON.stringify([...current].sort());
    return origStr !== currStr;
  };

  const featureRows = features.filter((f) => f.type === "feature");
  const serviceRows = features.filter((f) => f.type === "service");

  const featuresByType: Record<string, Feature[]> = {};
  ALL_PROPERTY_TYPES.forEach((t) => {
    featuresByType[t] = featureRows.filter((f) => {
      const types = localTypes[f.id] ?? parseTypes(f.applicableTypes);
      return types.length === 0 || types.includes(t);
    });
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Layers className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إعداد حقول أنواع العقار</h1>
            <p className="text-sm text-muted-foreground">
              حدد أي المميزات والخدمات تظهر لكل نوع عقار في نموذج الإضافة
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <strong>كيف يعمل هذا؟</strong> عندما يختار المعلن نوع العقار (مثل: شقة، أرض، مستودع...)
          يرى فقط المميزات والخدمات المناسبة لذلك النوع.
          إذا تركت الاختيار على "جميع الأنواع" تظهر الميزة لجميع الأنواع.
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            جارٍ التحميل...
          </div>
        ) : (
          <div className="space-y-8">
            {/* ─── View by Property Type (collapsed list) ─────────────── */}
            <div>
              <h2 className="text-lg font-bold mb-4 border-b pb-2">عرض حسب نوع العقار</h2>
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
                          <span className="font-bold text-base">{propType}</span>
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

            {/* ─── Manage Feature → Types ───────────────────────────── */}
            <div>
              <h2 className="text-lg font-bold mb-4 border-b pb-2">إدارة المميزات</h2>
              <div className="space-y-3">
                {featureRows.map((feature) => {
                  const current   = localTypes[feature.id] ?? parseTypes(feature.applicableTypes);
                  const isAllTypes = current.length === 0;
                  const changed    = hasChanges(feature);

                  return (
                    <div
                      key={feature.id}
                      className={cn(
                        "border rounded-xl p-4 transition-colors",
                        changed ? "border-amber-300 bg-amber-50/50" : "border-border bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{feature.icon ?? "📌"}</span>
                          <div>
                            <span className="font-bold text-base">{feature.name}</span>
                            <span className={cn(
                              "mr-2 text-xs px-2 py-0.5 rounded-full border",
                              feature.status === "active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                            )}>
                              {feature.status === "active" ? "نشط" : "معطل"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectAll(feature.id)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors",
                              isAllTypes
                                ? "bg-teal-600 text-white border-teal-600"
                                : "border-border text-muted-foreground hover:border-teal-300"
                            )}
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
                              {saving[feature.id]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <Save className="w-3 h-3" />}
                              حفظ
                            </button>
                          )}
                        </div>
                      </div>
                      {!isAllTypes && (
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_PROPERTY_TYPES.map((pt) => (
                            <TypeBadge
                              key={pt}
                              label={pt}
                              active={current.includes(pt)}
                              onClick={() => handleToggleType(feature.id, pt)}
                            />
                          ))}
                        </div>
                      )}
                      {isAllTypes && (
                        <p className="text-xs text-muted-foreground">
                          ← هذه الميزة تظهر لجميع أنواع العقارات. اضغط على أحد أنواع العقار لتقييدها.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Services (طرفية — usually all types) ─────────────── */}
            <div>
              <h2 className="text-lg font-bold mb-4 border-b pb-2">إدارة الخدمات الطرفية</h2>
              <div className="space-y-3">
                {serviceRows.map((feature) => {
                  const current   = localTypes[feature.id] ?? parseTypes(feature.applicableTypes);
                  const isAllTypes = current.length === 0;
                  const changed    = hasChanges(feature);

                  return (
                    <div
                      key={feature.id}
                      className={cn(
                        "border rounded-xl p-4 transition-colors",
                        changed ? "border-amber-300 bg-amber-50/50" : "border-border bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{feature.icon ?? "📌"}</span>
                          <span className="font-bold text-base">{feature.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectAll(feature.id)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors",
                              isAllTypes
                                ? "bg-teal-600 text-white border-teal-600"
                                : "border-border text-muted-foreground hover:border-teal-300"
                            )}
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
                              {saving[feature.id]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <Save className="w-3 h-3" />}
                              حفظ
                            </button>
                          )}
                        </div>
                      </div>
                      {!isAllTypes && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {ALL_PROPERTY_TYPES.map((pt) => (
                            <TypeBadge
                              key={pt}
                              label={pt}
                              active={current.includes(pt)}
                              onClick={() => handleToggleType(feature.id, pt)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
