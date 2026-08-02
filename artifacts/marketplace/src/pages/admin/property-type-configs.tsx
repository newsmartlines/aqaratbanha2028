import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api } from "@/lib/api";
import { ALL_FIELD_DEFS } from "@/lib/property-field-rules";
import {
  Layers, ChevronDown, ChevronUp, Save, RefreshCw, Settings2,
  List, Check, X, Info, Sparkles, RotateCcw, Building2, Briefcase,
  TreePine, Factory, CheckSquare, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Arabic property types as stored in features.applicableTypes (Arabic strings in DB) */
const FEATURE_TYPES = [
  { label: "شقة",         group: "residential" },
  { label: "دوبلكس",      group: "residential" },
  { label: "استوديو",     group: "residential" },
  { label: "روف",         group: "residential" },
  { label: "غرفة",        group: "residential" },
  { label: "فيلا",        group: "residential" },
  { label: "استراحة",     group: "residential" },
  { label: "عمارة",       group: "residential" },
  { label: "مكتب",        group: "commercial" },
  { label: "عيادة",       group: "commercial" },
  { label: "محل تجاري",   group: "commercial" },
  { label: "مجمع تجاري",  group: "commercial" },
  { label: "مطعم",        group: "commercial" },
  { label: "فندق",        group: "commercial" },
  { label: "مستودع",      group: "commercial" },
  { label: "أرض سكنية",   group: "land" },
  { label: "أرض تجارية",  group: "land" },
  { label: "أرض زراعية",  group: "land" },
  { label: "أرض صناعية",  group: "land" },
] as const;

type FeatureTypeGroup = "residential" | "commercial" | "land";

/** English slugs (DB field_configs key) → Arabic display + group */
const FIELD_TYPES: Array<{ slug: string; ar: string; group: string }> = [
  // سكني
  { slug: "apartment",            ar: "شقة",            group: "residential" },
  { slug: "duplex",               ar: "دوبلكس",         group: "residential" },
  { slug: "studio",               ar: "استوديو",        group: "residential" },
  { slug: "standalone",           ar: "فيلا منفصلة",    group: "residential" },
  { slug: "single-room",          ar: "غرفة",           group: "residential" },
  { slug: "chalet",               ar: "شاليه",          group: "residential" },
  { slug: "villa",                ar: "فيلا",           group: "residential" },
  { slug: "full-floor",           ar: "طابق كامل",      group: "residential" },
  // تجاري
  { slug: "office",               ar: "مكتب",           group: "commercial" },
  { slug: "pharmacy",             ar: "صيدلية / عيادة", group: "commercial" },
  { slug: "shop",                 ar: "محل تجاري",      group: "commercial" },
  { slug: "showroom",             ar: "معرض / شوروم",   group: "commercial" },
  { slug: "commercial-building",  ar: "بناية تجارية",   group: "commercial" },
  { slug: "restaurant",           ar: "مطعم / فندق",    group: "commercial" },
  { slug: "warehouse",            ar: "مستودع",         group: "commercial" },
  // أراضي
  { slug: "land-residential",     ar: "أرض سكنية",      group: "land" },
  { slug: "land-commercial",      ar: "أرض تجارية",     group: "land" },
  { slug: "land-agricultural",    ar: "أرض زراعية",     group: "land" },
  { slug: "land-industrial",      ar: "أرض صناعية",     group: "land" },
  { slug: "land-service",         ar: "أرض خدمات",      group: "land" },
  // صناعي
  { slug: "factory",              ar: "مصنع",           group: "industrial" },
  { slug: "industrial-warehouse", ar: "مستودع صناعي",   group: "industrial" },
  { slug: "workshop",             ar: "ورشة",           group: "industrial" },
  { slug: "industrial-facility",  ar: "منشأة صناعية",   group: "industrial" },
];

const GROUP_CONFIG: Record<string, { ar: string; Icon: typeof Building2; bg: string; text: string; border: string; header: string }> = {
  residential: { ar: "سكني",   Icon: Building2,  bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   header: "bg-blue-100/60"  },
  commercial:  { ar: "تجاري",  Icon: Briefcase,  bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  header: "bg-amber-100/60" },
  land:        { ar: "أراضي",  Icon: TreePine,   bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  header: "bg-green-100/60" },
  industrial:  { ar: "صناعي",  Icon: Factory,    bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200",  header: "bg-slate-100/60" },
};

type PageTab = "features" | "fields";

type Feature = {
  id: number;
  type: string;
  name: string;
  icon: string | null;
  status: string;
  sortOrder: number;
  applicableTypes: string | null;
};

type FieldConfigRow = { mainCategory: string; fieldKey: string; isVisible: boolean };

function parseTypes(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── TypeBadge ────────────────────────────────────────────────────────────────

function TypeBadge({ label, group, active, onClick }: {
  label: string; group: string; active: boolean; onClick: () => void;
}) {
  const gc = GROUP_CONFIG[group] ?? GROUP_CONFIG.residential;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all select-none",
        active
          ? `${gc.bg} ${gc.text} ${gc.border}`
          : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
      )}
    >
      {label}
    </button>
  );
}

// ─── FeaturesTab ──────────────────────────────────────────────────────────────

function FeaturesTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [localTypes, setLocalTypes] = useState<Record<number, string[]>>({});
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [applyingDefaults, setApplyingDefaults] = useState(false);

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

  const handleToggleType = (featureId: number, typeName: string) => {
    setLocalTypes((prev) => {
      const current = prev[featureId] ?? [];
      const next = current.includes(typeName)
        ? current.filter((t) => t !== typeName)
        : [...current, typeName];
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
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving((prev) => ({ ...prev, [featureId]: false }));
    }
  };

  const hasChanges = (feature: Feature) => {
    const original = parseTypes(feature.applicableTypes);
    const current = localTypes[feature.id] ?? [];
    return JSON.stringify([...original].sort()) !== JSON.stringify([...current].sort());
  };

  const handleApplyDefaults = async () => {
    setApplyingDefaults(true);
    try {
      await api.propertyFeatures.applyDefaults();
      await qc.invalidateQueries({ queryKey: ["admin-property-features-all"] });
      toast.success("تم تطبيق الإعدادات الافتراضية الذكية على جميع المميزات");
    } catch {
      toast.error("فشل تطبيق الإعدادات");
    } finally {
      setApplyingDefaults(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="text-sm">جارٍ التحميل...</span>
      </div>
    );
  }

  const featureRows = (features as Feature[]).filter((f) => f.type === "feature");
  const serviceRows = (features as Feature[]).filter((f) => f.type === "service");

  // Build "view by type" data using Arabic names (matching DB applicableTypes)
  const featuresByType: Record<string, Feature[]> = {};
  FEATURE_TYPES.forEach(({ label }) => {
    featuresByType[label] = featureRows.filter((f) => {
      const types = localTypes[f.id] ?? parseTypes(f.applicableTypes);
      return types.length === 0 || types.includes(label);
    });
  });

  const grouped = (
    Object.entries(
      FEATURE_TYPES.reduce((acc, t) => {
        if (!acc[t.group]) acc[t.group] = [];
        acc[t.group]!.push(t.label);
        return acc;
      }, {} as Record<string, string[]>)
    ) as [FeatureTypeGroup, string[]][]
  );

  return (
    <div className="space-y-6">
      {/* Info + Apply Defaults */}
      <div className="flex items-start gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-3 flex-1">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>كيف يعمل؟</strong> عندما يختار المعلن نوع العقار يرى فقط المميزات والخدمات
            المناسبة لذلك النوع. إذا تركت الاختيار فارغاً تظهر الميزة لجميع الأنواع.
          </div>
        </div>
        <button
          type="button"
          disabled={applyingDefaults}
          onClick={handleApplyDefaults}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors shadow-sm shrink-0"
        >
          {applyingDefaults
            ? <RefreshCw className="w-4 h-4 animate-spin" />
            : <Sparkles className="w-4 h-4" />}
          تطبيق الإعدادات الذكية
        </button>
      </div>

      {/* View by Property Type */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-700">عرض المميزات حسب نوع العقار</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {grouped.map(([groupId, typeLabels]) => {
            const gc = GROUP_CONFIG[groupId];
            return (
              <div key={groupId}>
                <div className={cn("px-4 py-2 flex items-center gap-2", gc.header)}>
                  <gc.Icon className={cn("w-3.5 h-3.5", gc.text)} />
                  <span className={cn("text-xs font-bold uppercase tracking-wide", gc.text)}>{gc.ar}</span>
                </div>
                {typeLabels.map((typeName) => {
                  const activeFeatures = featuresByType[typeName] ?? [];
                  const isOpen = expandedType === typeName;
                  return (
                    <div key={typeName} className="border-t border-slate-100 first:border-0">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedType(isOpen ? null : typeName)}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-slate-800">{typeName}</span>
                          <span className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                            activeFeatures.length > 0
                              ? `${gc.bg} ${gc.text} ${gc.border}`
                              : "bg-slate-100 text-slate-400 border-slate-200"
                          )}>
                            {activeFeatures.length} ميزة
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-slate-400" />
                          : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-3">
                          {activeFeatures.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">لا توجد مميزات مخصصة لهذا النوع</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {activeFeatures.map((f) => (
                                <div
                                  key={f.id}
                                  className={cn(
                                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border",
                                    gc.bg, gc.text, gc.border
                                  )}
                                >
                                  <span>{f.icon ?? "📌"}</span>
                                  {f.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manage Features */}
      <FeatureSection
        title="إدارة المميزات"
        subtitle="المميزات الداخلية للعقار (مسبح، مصعد، حديقة...)"
        rows={featureRows}
        localTypes={localTypes}
        saving={saving}
        hasChanges={hasChanges}
        onToggleType={handleToggleType}
        onSelectAll={handleSelectAll}
        onSave={handleSave}
      />

      {/* Services */}
      <FeatureSection
        title="الخدمات الطرفية القريبة"
        subtitle="الخدمات المحيطة بالعقار (مسجد، مدرسة، مستشفى...)"
        rows={serviceRows}
        localTypes={localTypes}
        saving={saving}
        hasChanges={hasChanges}
        onToggleType={handleToggleType}
        onSelectAll={handleSelectAll}
        onSave={handleSave}
      />
    </div>
  );
}

function FeatureSection({
  title, subtitle, rows, localTypes, saving, hasChanges, onToggleType, onSelectAll, onSave,
}: {
  title: string;
  subtitle: string;
  rows: Feature[];
  localTypes: Record<number, string[]>;
  saving: Record<number, boolean>;
  hasChanges: (f: Feature) => boolean;
  onToggleType: (id: number, t: string) => void;
  onSelectAll: (id: number) => void;
  onSave: (id: number) => void;
}) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((feature) => {
          const current = localTypes[feature.id] ?? parseTypes(feature.applicableTypes);
          const isAllTypes = current.length === 0;
          const changed = hasChanges(feature);
          return (
            <div
              key={feature.id}
              className={cn(
                "p-4 transition-colors",
                changed ? "bg-amber-50/60" : "bg-white"
              )}
            >
              {/* Row header */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{feature.icon ?? "📌"}</span>
                  <div>
                    <span className="font-bold text-sm text-slate-800">{feature.name}</span>
                    <span className={cn(
                      "mr-2 text-[11px] px-1.5 py-0.5 rounded-md border",
                      feature.status === "active"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    )}>
                      {feature.status === "active" ? "نشط" : "معطل"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectAll(feature.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                      isAllTypes
                        ? "bg-teal-600 text-white border-teal-600"
                        : "border-slate-200 text-slate-500 hover:border-teal-300"
                    )}
                  >
                    {isAllTypes
                      ? <CheckSquare className="w-3 h-3" />
                      : <Square className="w-3 h-3" />}
                    جميع الأنواع
                  </button>
                  {changed && (
                    <button
                      type="button"
                      disabled={saving[feature.id]}
                      onClick={() => onSave(feature.id)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                      {saving[feature.id]
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Save className="w-3 h-3" />}
                      حفظ
                    </button>
                  )}
                </div>
              </div>

              {/* Type badges — grouped by category */}
              {isAllTypes ? (
                <p className="text-[11px] text-slate-400 mt-1">
                  تظهر لجميع أنواع العقارات ← اضغط على نوع معين لتقييد ظهورها
                </p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {(["residential", "commercial", "land"] as FeatureTypeGroup[]).map((groupId) => {
                    const gc = GROUP_CONFIG[groupId];
                    const groupTypes = FEATURE_TYPES.filter((t) => t.group === groupId);
                    return (
                      <div key={groupId} className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-bold shrink-0 w-10 text-right", gc.text)}>
                          {gc.ar}
                        </span>
                        {groupTypes.map((t) => (
                          <TypeBadge
                            key={t.label}
                            label={t.label}
                            group={groupId}
                            active={current.includes(t.label)}
                            onClick={() => onToggleType(feature.id, t.label)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FieldConfigsTab ──────────────────────────────────────────────────────────

function FieldConfigsTab() {
  const qc = useQueryClient();
  const [localMap, setLocalMap] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      toast.success("تم حفظ إعدادات الحقول");
      setHasChanges(false);
    },
    onError: () => toast.error("فشل الحفظ"),
  });

  const toggle = (slug: string, fieldKey: string) => {
    const current = localMap[slug]?.[fieldKey] ?? true;
    setLocalMap((prev) => ({
      ...prev,
      [slug]: { ...(prev[slug] ?? {}), [fieldKey]: !current },
    }));
    setHasChanges(true);
  };

  const getVisible = (slug: string, fieldKey: string) => {
    if (localMap[slug] !== undefined && localMap[slug][fieldKey] !== undefined) {
      return localMap[slug][fieldKey];
    }
    const fromDB = (fieldConfigs as FieldConfigRow[]).find(
      (r) => r.mainCategory === slug && r.fieldKey === fieldKey
    );
    return fromDB ? fromDB.isVisible : true;
  };

  const setAllForType = (slug: string, visible: boolean) => {
    const fields: Record<string, boolean> = {};
    for (const f of ALL_FIELD_DEFS) fields[f.key] = visible;
    setLocalMap((prev) => ({ ...prev, [slug]: fields }));
    setHasChanges(true);
  };

  const setAllForField = (fieldKey: string, visible: boolean) => {
    setLocalMap((prev) => {
      const next = { ...prev };
      for (const { slug } of FIELD_TYPES) {
        next[slug] = { ...(next[slug] ?? {}), [fieldKey]: visible };
      }
      return next;
    });
    setHasChanges(true);
  };

  const handleReset = async () => {
    if (!confirm("سيتم حذف جميع الإعدادات الحالية وإعادة ضبطها للافتراضي. هل أنت متأكد؟")) return;
    setResetting(true);
    try {
      await api.propertyFieldConfigs.reset();
      await qc.invalidateQueries({ queryKey: ["admin-field-configs"] });
      await qc.invalidateQueries({ queryKey: ["property-field-configs"] });
      toast.success("تمت إعادة الضبط بنجاح");
    } catch {
      toast.error("فشلت إعادة الضبط");
    } finally {
      setResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="text-sm">جارٍ التحميل...</span>
      </div>
    );
  }

  const groups = ["residential", "commercial", "land", "industrial"] as const;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Info + Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3 flex-1">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>إعداد حقول العقار لكل نوع:</strong> حدد أي الحقول (غرف، حمامات، طابق...)
            تظهر في فلاتر البحث ونموذج الإضافة لكل نوع عقار.
            <span className="inline-flex items-center gap-1 mr-1">
              <Check className="w-3 h-3 text-teal-600" /> = ظاهر،
              <X className="w-3 h-3 text-slate-400" /> = مخفي
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={resetting}
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            {resetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            إعادة الضبط
          </button>
          {hasChanges && (
            <button
              type="button"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
              className="flex items-center gap-2 px-4 h-10 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 font-semibold text-sm transition-colors shadow-sm"
            >
              {saveMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التغييرات
            </button>
          )}
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm border-collapse" dir="rtl">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky right-0 bg-slate-50 z-10 px-4 py-3 text-right font-bold text-slate-700 border-l border-slate-200 min-w-[140px]">
                نوع العقار
              </th>
              {ALL_FIELD_DEFS.map((f) => (
                <th key={f.key} className="px-2 py-2 text-center">
                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="text-[11px] font-semibold text-slate-600 leading-tight">{f.label}</span>
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
                        <X className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 min-w-[70px]">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((groupId) => {
              const gc = GROUP_CONFIG[groupId];
              const groupTypes = FIELD_TYPES.filter((t) => t.group === groupId);
              if (groupTypes.length === 0) return null;
              return [
                // Group header row
                <tr key={`header-${groupId}`}>
                  <td
                    colSpan={ALL_FIELD_DEFS.length + 2}
                    className={cn("px-4 py-2 border-t border-b", gc.header, gc.border)}
                  >
                    <div className="flex items-center gap-2">
                      <gc.Icon className={cn("w-3.5 h-3.5", gc.text)} />
                      <span className={cn("text-xs font-bold", gc.text)}>{gc.ar}</span>
                    </div>
                  </td>
                </tr>,
                // Type rows
                ...groupTypes.map(({ slug, ar }, idx) => {
                  const visibleCount = ALL_FIELD_DEFS.filter((f) => getVisible(slug, f.key)).length;
                  return (
                    <tr
                      key={slug}
                      className={cn(
                        "border-b border-slate-100 transition-colors hover:bg-teal-50/20",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      )}
                    >
                      <td className={cn(
                        "sticky right-0 px-4 py-2.5 bg-inherit border-l border-slate-100 z-10",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      )}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-slate-800">{ar}</span>
                          <span className="text-[10px] text-slate-400">
                            {visibleCount}/{ALL_FIELD_DEFS.length}
                          </span>
                        </div>
                      </td>
                      {ALL_FIELD_DEFS.map((f) => {
                        const visible = getVisible(slug, f.key);
                        return (
                          <td key={f.key} className="px-1.5 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(slug, f.key)}
                              className={cn(
                                "w-7 h-7 rounded-lg mx-auto flex items-center justify-center border transition-all",
                                visible
                                  ? "bg-teal-100 border-teal-300 hover:bg-teal-200 shadow-sm"
                                  : "bg-slate-100 border-slate-200 hover:bg-slate-200 opacity-40"
                              )}
                              title={visible ? "ظاهر — اضغط للإخفاء" : "مخفي — اضغط للإظهار"}
                            >
                              {visible
                                ? <Check className="w-3.5 h-3.5 text-teal-700" />
                                : <X className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => setAllForType(slug, true)}
                            className="text-[10px] px-1.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                          >الكل</button>
                          <button
                            type="button"
                            onClick={() => setAllForType(slug, false)}
                            className="text-[10px] px-1.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-colors"
                          >لا شيء</button>
                        </div>
                      </td>
                    </tr>
                  );
                }),
              ];
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
            حفظ التغييرات
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
              تحكم في المميزات والحقول التي تظهر لكل نوع عقار في نموذج الإضافة وفلاتر البحث
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([
            { id: "features" as PageTab, label: "المميزات والخدمات", icon: List },
            { id: "fields"   as PageTab, label: "حقول العقار",        icon: Settings2 },
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

        {pageTab === "features" ? <FeaturesTab /> : <FieldConfigsTab />}
      </div>
    </AdminLayout>
  );
}
