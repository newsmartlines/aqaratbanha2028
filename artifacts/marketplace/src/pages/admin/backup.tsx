import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Download, Upload, Database, RefreshCw, FileJson, FileText, HardDrive,
  CheckCircle2, AlertCircle, Loader2, FolderOpen, Clock, RotateCcw,
  Shield, Info, ChevronDown, ChevronUp, Layers, GitBranch,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type TableInfo = {
  key: string;
  dbName: string;
  label: string;
  group: string;
  count: number;
};

type SeedFile = {
  name: string;
  size: number;
  exportedAt: string | null;
};

type BackupStatus = {
  tables: TableInfo[];
  seedFiles: SeedFile[];
  manifest: { exportedAt: string; totalRows: number; files: string[] } | null;
  seedsDir: string;
};

type RestoreResult = Record<string, { inserted: number; skipped: number; error?: string }>;

// ─── API calls ────────────────────────────────────────────────────────────────

const API = "/api";

async function fetchStatus(): Promise<BackupStatus> {
  const res = await fetch(`${API}/admin/backup/status`, { credentials: "include" });
  const j = await res.json();
  if (!j.success) throw new Error(j.error);
  return j.data;
}

async function exportBackup(tableKeys: string[], format: "json" | "sql") {
  const res = await fetch(`${API}/admin/backup/export`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableKeys, format }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as any).error ?? "Export failed");
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `backup.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveSeeds(tableKeys: string[]): Promise<{ message: string; files: string[]; stats: Record<string, number> }> {
  const res = await fetch(`${API}/admin/backup/save-seeds`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableKeys }),
  });
  const j = await res.json();
  if (!j.success) throw new Error(j.error);
  return j;
}

async function restoreFromSeeds(tables: string[], truncate: boolean): Promise<RestoreResult> {
  const res = await fetch(`${API}/admin/backup/restore-seeds`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tables, truncate }),
  });
  const j = await res.json();
  if (!j.success) throw new Error(j.error);
  return j.result;
}

async function restoreFromFile(data: object, tables: string[], truncate: boolean): Promise<RestoreResult> {
  const res = await fetch(`${API}/admin/backup/restore-upload`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, tables, truncate }),
  });
  const j = await res.json();
  if (!j.success) throw new Error(j.error);
  return j.result;
}

// ─── Result Display ───────────────────────────────────────────────────────────

function RestoreResultCard({ result }: { result: RestoreResult }) {
  const [open, setOpen] = useState(false);
  const total = Object.values(result).reduce((a, r) => a + r.inserted, 0);
  const skipped = Object.values(result).reduce((a, r) => a + r.skipped, 0);
  const errors = Object.values(result).filter(r => r.error).length;
  return (
    <div className="mt-4 border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700"
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          تمت الاستعادة — {total} صف مُدرج، {skipped} متخطى
          {errors > 0 && <Badge variant="destructive" className="text-xs">{errors} خطأ</Badge>}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="divide-y">
          {Object.entries(result).map(([table, r]) => (
            <div key={table} className="px-4 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-mono">{table}</span>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{r.inserted} مُدرج</Badge>
                {r.skipped > 0 && <Badge variant="outline">{r.skipped} متخطى</Badge>}
                {r.error && <Badge variant="destructive" className="text-[10px]">{r.error.slice(0, 40)}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Group Label ──────────────────────────────────────────────────────────────

const GROUP_META: Record<string, { label: string; color: string }> = {
  locations: { label: "المواقع الجغرافية", color: "bg-teal-100 text-teal-700" },
  categories: { label: "التصنيفات", color: "bg-indigo-100 text-indigo-700" },
  properties: { label: "العقارات", color: "bg-blue-100 text-blue-700" },
  email: { label: "البريد الإلكتروني", color: "bg-purple-100 text-purple-700" },
  settings: { label: "إعدادات الموقع", color: "bg-amber-100 text-amber-700" },
  billing: { label: "الفواتير والاشتراكات", color: "bg-emerald-100 text-emerald-700" },
  admin: { label: "الإدارة والمستخدمون", color: "bg-rose-100 text-rose-700" },
};

// ─── Table Selection Component ────────────────────────────────────────────────

function TableSelector({
  tables,
  selected,
  onChange,
}: {
  tables: TableInfo[];
  selected: Set<string>;
  onChange: (sel: Set<string>) => void;
}) {
  const groups = tables.reduce<Record<string, TableInfo[]>>((acc, t) => {
    (acc[t.group] = acc[t.group] ?? []).push(t);
    return acc;
  }, {});

  const toggleAll = () => {
    if (selected.size === tables.length) onChange(new Set());
    else onChange(new Set(tables.map(t => t.key)));
  };

  const toggleGroup = (group: string, groupTables: TableInfo[]) => {
    const allIn = groupTables.every(t => selected.has(t.key));
    const next = new Set(selected);
    if (allIn) groupTables.forEach(t => next.delete(t.key));
    else groupTables.forEach(t => next.add(t.key));
    onChange(next);
  };

  const toggle = (key: string) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">اختر الجداول</span>
        <button
          onClick={toggleAll}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          {selected.size === tables.length ? "إلغاء الكل" : "تحديد الكل"}
        </button>
      </div>
      {Object.entries(groups).map(([group, groupTables]) => {
        const meta = GROUP_META[group] ?? { label: group, color: "bg-slate-100 text-slate-700" };
        const allIn = groupTables.every(t => selected.has(t.key));
        const someIn = groupTables.some(t => selected.has(t.key));
        return (
          <div key={group} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup(group, groupTables)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-right"
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${allIn ? "bg-teal-500 border-teal-500" : someIn ? "bg-teal-200 border-teal-400" : "border-slate-300"}`}>
                {(allIn || someIn) && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
              </div>
              <Badge className={`text-xs ${meta.color}`}>{meta.label}</Badge>
              <span className="text-xs text-slate-400 mr-auto">{groupTables.length} جدول</span>
            </button>
            <div className="divide-y">
              {groupTables.map(t => (
                <label key={t.key} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={selected.has(t.key)}
                    onCheckedChange={() => toggle(t.key)}
                  />
                  <span className="text-sm text-slate-700 flex-1">{t.label}</span>
                  <Badge variant="outline" className="text-xs font-mono">{t.count}</Badge>
                  <span className="text-xs text-slate-400 font-mono hidden sm:block">{t.dbName}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBackup() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["backup-status"],
    queryFn: fetchStatus,
  });

  // Export state
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<"json" | "sql">("json");
  const [isExporting, setIsExporting] = useState(false);

  // Seeds state
  const [seedsSelected, setSeedsSelected] = useState<Set<string>>(new Set());
  const [isSavingSeeds, setIsSavingSeeds] = useState(false);

  // Restore state
  const [restoreSelected, setRestoreSelected] = useState<Set<string>>(new Set());
  const [truncateMode, setTruncateMode] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [uploadedData, setUploadedData] = useState<object | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>("");

  const tables = status?.tables ?? [];

  const handleExport = async () => {
    if (exportSelected.size === 0) { toast.error("اختر جدولاً واحداً على الأقل"); return; }
    setIsExporting(true);
    try {
      await exportBackup(Array.from(exportSelected), exportFormat);
      toast.success(`تم تصدير ${exportSelected.size} جداول بتنسيق ${exportFormat.toUpperCase()}`);
    } catch (err: any) { toast.error(err?.message ?? "فشل التصدير"); }
    finally { setIsExporting(false); }
  };

  const handleSaveSeeds = async () => {
    if (seedsSelected.size === 0) { toast.error("اختر جدولاً واحداً على الأقل"); return; }
    setIsSavingSeeds(true);
    try {
      const r = await saveSeeds(Array.from(seedsSelected));
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["backup-status"] });
    } catch (err: any) { toast.error(err?.message ?? "فشل حفظ Seeds"); }
    finally { setIsSavingSeeds(false); }
  };

  const handleRestoreSeeds = async () => {
    setIsRestoring(true);
    setRestoreResult(null);
    try {
      const result = await restoreFromSeeds(Array.from(restoreSelected), truncateMode);
      setRestoreResult(result);
      toast.success("تمت الاستعادة من ملفات Seeds");
      qc.invalidateQueries({ queryKey: ["backup-status"] });
    } catch (err: any) { toast.error(err?.message ?? "فشل الاستعادة"); }
    finally { setIsRestoring(false); }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setUploadedData(parsed);
        toast.success(`تم تحميل الملف: ${file.name}`);
      } catch { toast.error("ملف JSON غير صالح"); }
    };
    reader.readAsText(file);
  }, []);

  const handleRestoreUpload = async () => {
    if (!uploadedData) { toast.error("ارفع ملف النسخة الاحتياطية أولاً"); return; }
    setIsRestoring(true);
    setRestoreResult(null);
    try {
      const result = await restoreFromFile(uploadedData, Array.from(restoreSelected), truncateMode);
      setRestoreResult(result);
      toast.success("تمت الاستعادة من الملف المرفوع");
      qc.invalidateQueries({ queryKey: ["backup-status"] });
    } catch (err: any) { toast.error(err?.message ?? "فشل الاستعادة"); }
    finally { setIsRestoring(false); }
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-7 h-7 text-teal-600" />
                النسخ الاحتياطي وإدارة البيانات
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                تصدير وحفظ واستعادة بيانات المنصة — يعمل عبر GitHub، cPanel، VPS
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="border-teal-200 bg-teal-50">
              <CardContent className="p-3 flex items-center gap-3">
                <Layers className="w-8 h-8 text-teal-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-teal-700">{tables.length}</p>
                  <p className="text-xs text-teal-600">جدول قابل للتصدير</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3 flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-blue-700">
                    {tables.reduce((a, t) => a + t.count, 0).toLocaleString("ar")}
                  </p>
                  <p className="text-xs text-blue-600">إجمالي الصفوف</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-3 flex items-center gap-3">
                <HardDrive className="w-8 h-8 text-purple-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-purple-700">{status.seedFiles.length}</p>
                  <p className="text-xs text-purple-600">ملف Seed محفوظ</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`${status.manifest ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <GitBranch className={`w-8 h-8 shrink-0 ${status.manifest ? "text-emerald-600" : "text-amber-600"}`} />
                <div>
                  <p className={`text-xs font-bold ${status.manifest ? "text-emerald-700" : "text-amber-700"}`}>
                    {status.manifest ? "Seeds محفوظة" : "لا توجد Seeds"}
                  </p>
                  <p className={`text-[11px] ${status.manifest ? "text-emerald-600" : "text-amber-600"}`}>
                    {status.manifest ? fmtDate(status.manifest.exportedAt) : "لم يتم التصدير بعد"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="export" dir="rtl">
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" /> تصدير
            </TabsTrigger>
            <TabsTrigger value="seeds" className="gap-2">
              <GitBranch className="w-4 h-4" /> Seeds / GitHub
            </TabsTrigger>
            <TabsTrigger value="restore" className="gap-2">
              <RotateCcw className="w-4 h-4" /> استعادة
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FolderOpen className="w-4 h-4" /> ملفات Seed
            </TabsTrigger>
          </TabsList>

          {/* ── Export Tab ── */}
          <TabsContent value="export">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">اختر الجداول للتصدير</CardTitle>
                    <CardDescription>اختر البيانات التي تريد تصديرها</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <TableSelector
                        tables={tables}
                        selected={exportSelected}
                        onChange={setExportSelected}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">خيارات التصدير</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">تنسيق الملف</Label>
                      <div className="space-y-2">
                        {(["json", "sql"] as const).map(fmt => (
                          <label key={fmt} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${exportFormat === fmt ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}>
                            <input
                              type="radio"
                              name="format"
                              value={fmt}
                              checked={exportFormat === fmt}
                              onChange={() => setExportFormat(fmt)}
                              className="accent-teal-600"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                {fmt === "json" ? <FileJson className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-orange-500" />}
                                <span className="text-sm font-medium uppercase">{fmt}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {fmt === "json" ? "للاستعادة الآلية والـ seeds" : "لـ DBA والنسخ المباشر في psql"}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                      <p className="font-medium mb-1 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        بيانات آمنة
                      </p>
                      <ul className="text-xs text-slate-500 space-y-0.5 list-disc list-inside">
                        <li>كلمات المرور مستثناة</li>
                        <li>بيانات SMTP مستثناة</li>
                        <li>مفاتيح API مستثناة</li>
                      </ul>
                    </div>

                    <Button
                      className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
                      onClick={handleExport}
                      disabled={isExporting || exportSelected.size === 0}
                    >
                      {isExporting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التصدير...</>
                      ) : (
                        <><Download className="w-4 h-4" /> تحميل ({exportSelected.size} جدول)</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Seeds / GitHub Tab ── */}
          <TabsContent value="seeds">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">حفظ Seeds في lib/db/seeds/</CardTitle>
                    <CardDescription>
                      الملفات تُحفظ على الخادم وتُدرج في Git — تُعيد تأسيس البيانات تلقائياً عند كل نشر جديد
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <TableSelector
                        tables={tables}
                        selected={seedsSelected}
                        onChange={setSeedsSelected}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-emerald-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
                      <GitBranch className="w-4 h-4" />
                      كيف يعمل؟
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-600">
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                      <p>اختر الجداول واضغط «حفظ Seeds»</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                      <p>الملفات تُكتب في <code className="bg-slate-100 px-1 rounded text-xs">lib/db/seeds/</code></p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                      <p>ادفع للـ GitHub: <code className="bg-slate-100 px-1 rounded text-xs">git push</code></p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                      <p>في أي خادم جديد، البيانات تُحمَّل تلقائياً عند بدء التشغيل</p>
                    </div>
                  </CardContent>
                </Card>

                {status?.manifest && (
                  <Card className="border-slate-200">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-slate-600 mb-2">آخر تصدير Seed</p>
                      <p className="text-xs text-slate-500">{fmtDate(status.manifest.exportedAt)}</p>
                      <p className="text-xs text-slate-500 mt-1">{status.manifest.files.length} ملف · {status.manifest.totalRows?.toLocaleString("ar")} صف</p>
                    </CardContent>
                  </Card>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                  onClick={handleSaveSeeds}
                  disabled={isSavingSeeds || seedsSelected.size === 0}
                >
                  {isSavingSeeds ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</>
                  ) : (
                    <><HardDrive className="w-4 h-4" /> حفظ Seeds ({seedsSelected.size} جدول)</>
                  )}
                </Button>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    تأكد من دفع الملفات لـ GitHub بعد الحفظ حتى تُستعاد تلقائياً عند النشر
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Restore Tab ── */}
          <TabsContent value="restore">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Restore from Seeds */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    استعادة من ملفات Seed
                  </CardTitle>
                  <CardDescription>
                    استعد البيانات من ملفات <code className="bg-slate-100 px-1 rounded text-xs">lib/db/seeds/</code> المحفوظة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {status?.manifest ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">ملفات Seed متوفرة</span>
                      </div>
                      <p className="text-xs text-emerald-600">
                        آخر تصدير: {fmtDate(status.manifest.exportedAt)} · {status.manifest.files.length} ملف
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700">لا توجد ملفات Seed</span>
                      </div>
                      <p className="text-xs text-amber-600">اذهب لتبويب Seeds واحفظ البيانات أولاً</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      id="truncate-seeds"
                      checked={truncateMode}
                      onCheckedChange={setTruncateMode}
                    />
                    <div>
                      <Label htmlFor="truncate-seeds" className="text-sm font-medium cursor-pointer">
                        حذف البيانات الموجودة أولاً
                      </Label>
                      <p className="text-xs text-slate-500">DELETE ثم INSERT بدلاً من UPSERT</p>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                    onClick={handleRestoreSeeds}
                    disabled={isRestoring || !status?.manifest}
                  >
                    {isRestoring ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الاستعادة...</>
                    ) : (
                      <><RotateCcw className="w-4 h-4" /> استعادة من Seeds</>
                    )}
                  </Button>

                  {restoreResult && <RestoreResultCard result={restoreResult} />}
                </CardContent>
              </Card>

              {/* Restore from Upload */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    استعادة من ملف مرفوع
                  </CardTitle>
                  <CardDescription>
                    ارفع ملف JSON تم تصديره سابقاً لاستعادة البيانات
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${uploadedData ? "border-teal-300 bg-teal-50" : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"}`}
                  >
                    {uploadedData ? (
                      <>
                        <CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-teal-700">{uploadFileName}</p>
                        <p className="text-xs text-teal-500 mt-1">انقر لتغيير الملف</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-600">انقر لاختيار ملف JSON</p>
                        <p className="text-xs text-slate-400 mt-1">ملفات النسخة الاحتياطية المصدَّرة فقط</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      id="truncate-upload"
                      checked={truncateMode}
                      onCheckedChange={setTruncateMode}
                    />
                    <div>
                      <Label htmlFor="truncate-upload" className="text-sm font-medium cursor-pointer">
                        حذف البيانات الموجودة أولاً
                      </Label>
                      <p className="text-xs text-slate-500">DELETE ثم INSERT بدلاً من UPSERT</p>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                    onClick={handleRestoreUpload}
                    disabled={isRestoring || !uploadedData}
                  >
                    {isRestoring ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الاستعادة...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> استعادة من الملف</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Seed Files Tab ── */}
          <TabsContent value="files">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-amber-600" />
                      ملفات Seed المحفوظة
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">
                      {status?.seedsDir ?? "lib/db/seeds/"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!status?.seedFiles.length ? (
                  <div className="text-center py-12 text-slate-400">
                    <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">لا توجد ملفات seed بعد</p>
                    <p className="text-xs mt-1">اذهب لتبويب «Seeds / GitHub» واحفظ البيانات</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {status.seedFiles.map(f => (
                      <div key={f.name} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50">
                        <FileJson className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 font-mono">{f.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {fmtDate(f.exportedAt)}
                            <span className="text-slate-400">·</span>
                            {fmtSize(f.size)}
                          </p>
                        </div>
                        <a
                          href={`/api/admin/backup/seed-file/${f.name}`}
                          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 border border-teal-200 rounded-lg px-2.5 py-1.5 hover:bg-teal-50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          تحميل
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deployment Guide */}
            <Card className="mt-4 border-blue-200 bg-blue-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                  <Info className="w-4 h-4" />
                  دليل النشر (GitHub → cPanel / VPS / Replit)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-blue-900">
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      {
                        step: "1",
                        title: "ادفع Seeds لـ GitHub",
                        code: "git add lib/db/seeds/\ngit commit -m 'seed: export platform data'\ngit push",
                        color: "bg-blue-100 border-blue-300",
                      },
                      {
                        step: "2",
                        title: "في الخادم الجديد",
                        code: "git clone <repo>\npnpm install\npnpm --filter @workspace/db run push",
                        color: "bg-purple-100 border-purple-300",
                      },
                      {
                        step: "3",
                        title: "تشغيل التطبيق",
                        code: "pnpm run dev\n# أو في production:\npnpm run start:deploy",
                        color: "bg-emerald-100 border-emerald-300",
                      },
                    ].map(({ step, title, code, color }) => (
                      <div key={step} className={`border rounded-lg p-3 ${color}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-blue-700 border border-blue-300">{step}</div>
                          <span className="text-xs font-semibold text-blue-800">{title}</span>
                        </div>
                        <pre className="text-[11px] font-mono text-blue-900 whitespace-pre-wrap leading-relaxed">{code}</pre>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 flex items-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    عند بدء التشغيل، يكتشف النظام قاعدة البيانات الفارغة ويُحمِّل Seeds تلقائياً
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
