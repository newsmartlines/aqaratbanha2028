import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Download, Upload, RefreshCw, Shield, Package, HardDrive,
  CheckCircle, XCircle, Loader2, Clock, Trash2, RotateCcw,
  AlertTriangle, Info, Zap, Database, FileArchive,
} from "lucide-react";
import toast from "react-hot-toast";

// ── API helpers ───────────────────────────────────────────────────────────────

const BASE = "/api";

async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  return res.json();
}

const updatesApi = {
  info: () => apiFetch("/admin/updates/info"),
  backups: () => apiFetch("/admin/updates/backups"),
  packages: () => apiFetch("/admin/updates/packages"),
  createBackup: (label: string) => apiFetch("/admin/updates/backup", { method: "POST", body: JSON.stringify({ label }) }),
  createPackage: (body: object) => apiFetch("/admin/updates/create-package", { method: "POST", body: JSON.stringify(body) }),
  rollback: (filename: string) => apiFetch("/admin/updates/rollback", { method: "POST", body: JSON.stringify({ filename }) }),
  job: (id: string) => apiFetch(`/admin/updates/job/${id}`),
  deleteBackup: (name: string) => apiFetch(`/admin/updates/backup/${encodeURIComponent(name)}`, { method: "DELETE" }),
  deletePackage: (name: string) => apiFetch(`/admin/updates/package/${encodeURIComponent(name)}`, { method: "DELETE" }),
  downloadUrl: (type: "backup" | "package", name: string) =>
    `${BASE}/admin/updates/download/${type}/${encodeURIComponent(name)}`,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobData {
  id: string;
  type: string;
  status: "running" | "success" | "failed";
  progress: number;
  logs: string[];
  result?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface BackupEntry {
  name: string;
  size: number;
  createdAt: string;
}

// ── Job Progress Panel ─────────────────────────────────────────────────────────

function JobPanel({ jobId, onDone }: { jobId: string; onDone?: (job: JobData) => void }) {
  const [job, setJob] = useState<JobData | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const res = await updatesApi.job(jobId);
        if (res?.data) {
          setJob(res.data);
          if (res.data.status !== "running") {
            if (intervalRef.current) clearInterval(intervalRef.current);
            onDone?.(res.data);
          }
        }
      } catch {}
    };
    poll();
    intervalRef.current = setInterval(poll, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [job?.logs]);

  if (!job) return (
    <div className="flex items-center gap-2 text-slate-500 py-4">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>جارٍ التهيئة...</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {job.status === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
          {job.status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
          <span className="text-sm font-medium">
            {job.status === "running" ? "جارٍ التنفيذ..." : job.status === "success" ? "اكتمل بنجاح" : "فشل"}
          </span>
        </div>
        <span className="text-xs text-slate-400">{job.progress}%</span>
      </div>
      <Progress value={job.progress} className="h-2" />
      <div
        ref={logsRef}
        className="bg-slate-950 text-slate-200 text-xs font-mono rounded-lg p-3 h-48 overflow-y-auto leading-relaxed"
      >
        {job.logs.map((line, i) => (
          <div key={i} className={`${line.startsWith("❌") ? "text-red-400" : line.startsWith("✅") ? "text-green-400" : line.startsWith("⚠️") ? "text-yellow-400" : "text-slate-300"}`}>
            {line}
          </div>
        ))}
        {job.status === "running" && (
          <div className="text-slate-500 animate-pulse">▌</div>
        )}
      </div>
      {job.status === "failed" && job.error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{job.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Backup Row ─────────────────────────────────────────────────────────────────

function BackupRow({
  entry, type, onRollback, onDelete,
}: {
  entry: BackupEntry;
  type: "backup" | "package";
  onRollback?: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg bg-white">
      <div className="flex items-center gap-3 p-3">
        <FileArchive className="w-5 h-5 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{entry.name}</p>
          <p className="text-xs text-slate-400">{fmtDate(entry.createdAt)} — {fmtBytes(entry.size)}</p>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={updatesApi.downloadUrl(type, entry.name)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
            title="تنزيل"
          >
            <Download className="w-4 h-4" />
          </a>
          {onRollback && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded hover:bg-blue-50 text-blue-500"
              title="التراجع"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(entry.name)}
            className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {expanded && onRollback && (
        <div className="border-t p-3 bg-amber-50">
          <Alert className="mb-3 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              سيتم استعادة قاعدة البيانات وملفات الرفع من هذه النسخة الاحتياطية. العملية لا يمكن التراجع عنها.
            </AlertDescription>
          </Alert>
          <Button size="sm" variant="destructive" onClick={() => { onRollback(entry.name); setExpanded(false); }}>
            <RotateCcw className="w-3.5 h-3.5 me-1" />
            تأكيد التراجع
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminUpdates() {
  const qc = useQueryClient();
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // ── Changelog + options for create-package
  const [changelog, setChangelog] = useState("");
  const [bumpType, setBumpType] = useState<"patch" | "minor" | "major">("patch");
  const [includeDb, setIncludeDb] = useState(false);

  // ── Install tab
  const [installFile, setInstallFile] = useState<File | null>(null);
  const [installing, setInstalling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: infoRes, isLoading: infoLoading } = useQuery({
    queryKey: ["updates-info"],
    queryFn: updatesApi.info,
    refetchInterval: activeJob ? 5000 : 30_000,
  });

  const { data: backupsRes, refetch: refetchBackups } = useQuery({
    queryKey: ["updates-backups"],
    queryFn: updatesApi.backups,
  });

  const { data: pkgsRes, refetch: refetchPkgs } = useQuery({
    queryKey: ["updates-packages"],
    queryFn: updatesApi.packages,
  });

  const info = infoRes?.data;
  const backups: BackupEntry[] = backupsRes?.data ?? [];
  const packages: BackupEntry[] = pkgsRes?.data ?? [];

  const handleJobDone = (job: JobData) => {
    setActiveJob(null);
    if (job.status === "success") {
      toast.success("اكتملت العملية بنجاح");
      qc.invalidateQueries({ queryKey: ["updates-info"] });
      refetchBackups();
      refetchPkgs();
    } else {
      toast.error(`فشلت العملية: ${job.error ?? "خطأ غير معروف"}`);
    }
  };

  const startBackup = async (label = "manual") => {
    try {
      const res = await updatesApi.createBackup(label);
      if (res?.jobId) { setActiveJob(res.jobId); setActiveTab("backup"); }
    } catch { toast.error("تعذر بدء النسخ الاحتياطي"); }
  };

  const startCreatePackage = async () => {
    if (!changelog.trim()) { toast.error("أدخل ملاحظات التغييرات (Changelog)"); return; }
    try {
      const res = await updatesApi.createPackage({ bumpType, changelog, includeDb });
      if (res?.jobId) { setActiveJob(res.jobId); setActiveTab("package"); }
    } catch { toast.error("تعذر إنشاء حزمة التحديث"); }
  };

  const startRollback = async (filename: string) => {
    try {
      const res = await updatesApi.rollback(filename);
      if (res?.jobId) { setActiveJob(res.jobId); setActiveTab("backup"); }
    } catch { toast.error("تعذر بدء عملية التراجع"); }
  };

  const deleteBackup = async (name: string) => {
    if (!confirm(`حذف النسخة الاحتياطية "${name}"؟`)) return;
    const res = await updatesApi.deleteBackup(name);
    if (res?.success) { toast.success("تم الحذف"); refetchBackups(); }
    else toast.error(res?.error ?? "فشل الحذف");
  };

  const deletePkg = async (name: string) => {
    if (!confirm(`حذف حزمة التحديث "${name}"؟`)) return;
    const res = await updatesApi.deletePackage(name);
    if (res?.success) { toast.success("تم الحذف"); refetchPkgs(); }
    else toast.error(res?.error ?? "فشل الحذف");
  };

  const handleInstall = async () => {
    if (!installFile) { toast.error("اختر ملف ZIP للتثبيت"); return; }
    setInstalling(true);
    try {
      const formData = new FormData();
      formData.append("package", installFile);
      const res = await fetch("/api-server/api/admin/updates/install", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = await res.json();
      if (json?.jobId) {
        setActiveJob(json.jobId);
        setActiveTab("install");
        setInstallFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(json?.error ?? "فشل التثبيت");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "فشل التثبيت");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-6 h-6 text-teal-600" />
              التحديثات والنسخ الاحتياطي
            </h1>
            <p className="text-sm text-slate-500 mt-1">إدارة إصدارات النظام والنسخ الاحتياطية بنقرة واحدة</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { qc.invalidateQueries({ queryKey: ["updates-info"] }); refetchBackups(); refetchPkgs(); }}>
            <RefreshCw className="w-3.5 h-3.5 me-1" /> تحديث
          </Button>
        </div>

        {/* Version Banner */}
        {info && (
          <Card className="border-teal-200 bg-gradient-to-l from-teal-50 to-white">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">الإصدار الحالي</p>
                    <p className="text-2xl font-bold text-teal-700">v{info.version?.version ?? "1.0.0"}</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-wrap gap-6 text-sm text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-xs">النسخ الاحتياطية</span>
                    <span className="font-semibold">{info.backups?.count ?? 0} ملف</span>
                    <span className="text-slate-400 text-xs ms-2">({fmtBytes(info.backups?.diskBytes ?? 0)})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">حزم التحديث</span>
                    <span className="font-semibold">{info.packages?.count ?? 0} ملف</span>
                    <span className="text-slate-400 text-xs ms-2">({fmtBytes(info.packages?.diskBytes ?? 0)})</span>
                  </div>
                  {info.backups?.latestAt && (
                    <div>
                      <span className="text-slate-400 block text-xs">آخر نسخة احتياطية</span>
                      <span className="font-semibold">{fmtDate(info.backups.latestAt)}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => startBackup("quick")}>
                  <HardDrive className="w-3.5 h-3.5 me-1" />
                  نسخ احتياطي سريع
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Job */}
        {activeJob && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                جارٍ تنفيذ العملية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JobPanel jobId={activeJob} onDone={handleJobDone} />
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="backup">
              النسخ الاحتياطي
              {backups.length > 0 && <Badge variant="secondary" className="ms-1.5 text-[10px] h-4">{backups.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="package">
              إنشاء حزمة
              {packages.length > 0 && <Badge variant="secondary" className="ms-1.5 text-[10px] h-4">{packages.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="install">تثبيت تحديث</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:border-teal-300 transition-colors" onClick={() => setActiveTab("backup")}>
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">النسخ الاحتياطي</p>
                    <p className="text-xs text-slate-500 mt-0.5">احتياطي كامل لقاعدة البيانات والملفات</p>
                    <p className="text-xs text-teal-600 mt-1 font-medium">{backups.length} نسخة محفوظة</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-teal-300 transition-colors" onClick={() => setActiveTab("package")}>
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">إنشاء حزمة تحديث</p>
                    <p className="text-xs text-slate-500 mt-0.5">تصدير الكود كحزمة ZIP موقعة رقمياً</p>
                    <p className="text-xs text-teal-600 mt-1 font-medium">{packages.length} حزمة متاحة</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-teal-300 transition-colors" onClick={() => setActiveTab("install")}>
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">تثبيت تحديث</p>
                    <p className="text-xs text-slate-500 mt-0.5">رفع حزمة ZIP وتثبيتها تلقائياً</p>
                    <p className="text-xs text-teal-600 mt-1 font-medium">مع التحقق والنسخ الاحتياطي التلقائي</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 text-sm">
                <strong>كيفية الاستخدام:</strong> أنشئ نسخة احتياطية قبل أي تغيير ← أنشئ حزمة التحديث ← نزّلها وارفعها على السيرفر الآخر ← ثبّتها من "تثبيت تحديث".
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Shield, title: "توقيع رقمي", desc: "HMAC-SHA256 — كل حزمة موقعة لضمان عدم التلاعب" },
                { icon: RotateCcw, title: "تراجع تلقائي", desc: "في حال فشل التثبيت، يُعاد التراجع للنسخة السابقة فوراً" },
                { icon: Database, title: "نسخة شاملة", desc: "تشمل قاعدة البيانات + الكود + ملفات الرفع" },
                { icon: Zap, title: "بدون توقف", desc: "Vite HMR وتحديث tsx التلقائي — لا حاجة لإعادة التشغيل يدوياً" },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border">
                  <f.icon className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{f.title}</p>
                    <p className="text-xs text-slate-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Backup ── */}
          <TabsContent value="backup" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">إنشاء نسخة احتياطية</CardTitle>
                <CardDescription>نسخ شامل لقاعدة البيانات + ملفات الرفع (uploads)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {["يدوي", "قبل تحديث", "أسبوعي"].map((label, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      disabled={!!activeJob}
                      onClick={() => startBackup(["manual", "pre-update", "weekly"][i])}
                    >
                      <HardDrive className="w-3.5 h-3.5 me-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Job (if any) shown via activeJob above */}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                النسخ الاحتياطية المحفوظة ({backups.length})
              </h3>
              {backups.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border rounded-lg">
                  <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">لا توجد نسخ احتياطية بعد</p>
                </div>
              ) : backups.map(b => (
                <BackupRow
                  key={b.name}
                  entry={b}
                  type="backup"
                  onRollback={startRollback}
                  onDelete={deleteBackup}
                />
              ))}
            </div>
          </TabsContent>

          {/* ── Create Package ── */}
          <TabsContent value="package" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">إنشاء حزمة تحديث</CardTitle>
                <CardDescription>
                  يُصدَّر الكود المصدري بالكامل في ملف ZIP موقع رقمياً — جاهز للتثبيت على أي سيرفر
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>نوع التحديث</Label>
                  <RadioGroup value={bumpType} onValueChange={v => setBumpType(v as any)} className="flex gap-4">
                    {[
                      { val: "patch", label: "Patch (إصلاح أخطاء)", badge: "1.0.x" },
                      { val: "minor", label: "Minor (ميزات جديدة)", badge: "1.x.0" },
                      { val: "major", label: "Major (تغييرات جوهرية)", badge: "x.0.0" },
                    ].map(opt => (
                      <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value={opt.val} />
                        <span className="text-sm">{opt.label}</span>
                        <Badge variant="outline" className="text-xs">{opt.badge}</Badge>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات التغييرات (Changelog) *</Label>
                  <Textarea
                    value={changelog}
                    onChange={e => setChangelog(e.target.value)}
                    placeholder="مثال:&#10;- إصلاح مشكلة تسجيل الدخول&#10;- تحسين أداء الخريطة&#10;- إضافة ميزة المفضلة"
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch id="include-db" checked={includeDb} onCheckedChange={setIncludeDb} />
                  <Label htmlFor="include-db" className="cursor-pointer">
                    تضمين بيانات قاعدة البيانات (للنشر الكامل على سيرفر جديد)
                  </Label>
                </div>

                {info && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 border">
                    <strong>الإصدار الحالي:</strong> v{info.version?.version} →{" "}
                    <strong className="text-teal-700">
                      v{bumpType === "major"
                        ? (() => { const [maj] = info.version?.version?.split(".").map(Number) ?? [1]; return `${maj + 1}.0.0`; })()
                        : bumpType === "minor"
                        ? (() => { const [maj, min] = info.version?.version?.split(".").map(Number) ?? [1, 0]; return `${maj}.${min + 1}.0`; })()
                        : (() => { const [maj, min, patch] = info.version?.version?.split(".").map(Number) ?? [1, 0, 0]; return `${maj}.${min}.${patch + 1}`; })()
                      }
                    </strong>
                  </div>
                )}

                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!!activeJob || !changelog.trim()}
                  onClick={startCreatePackage}
                >
                  <Package className="w-4 h-4 me-2" />
                  إنشاء حزمة التحديث
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Package className="w-4 h-4" />
                حزم التحديث المتاحة ({packages.length})
              </h3>
              {packages.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border rounded-lg">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">لا توجد حزم تحديث بعد</p>
                </div>
              ) : packages.map(p => (
                <BackupRow
                  key={p.name}
                  entry={p}
                  type="package"
                  onDelete={deletePkg}
                />
              ))}
            </div>
          </TabsContent>

          {/* ── Install ── */}
          <TabsContent value="install" className="space-y-4 mt-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                <strong>قبل التثبيت:</strong> سيتم تلقائياً إنشاء نسخة احتياطية كاملة. في حال فشل أي خطوة، يمكنك التراجع من تبويب "النسخ الاحتياطي".
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">رفع وتثبيت حزمة تحديث</CardTitle>
                <CardDescription>ارفع ملف ZIP صادراً من هذا النظام لتثبيته تلقائياً</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${installFile ? "border-teal-400 bg-teal-50" : "border-slate-300 hover:border-slate-400"}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={e => setInstallFile(e.target.files?.[0] ?? null)}
                  />
                  {installFile ? (
                    <div>
                      <CheckCircle className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                      <p className="font-medium text-teal-700">{installFile.name}</p>
                      <p className="text-xs text-teal-600 mt-1">{fmtBytes(installFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium">اسحب ملف ZIP هنا أو انقر للاختيار</p>
                      <p className="text-xs text-slate-400 mt-1">حجم أقصى: 500 MB</p>
                    </div>
                  )}
                </div>

                {/* Steps */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { step: "1", label: "فك الضغط والتحقق" },
                    { step: "2", label: "نسخ احتياطي تلقائي" },
                    { step: "3", label: "تطبيق الكود" },
                    { step: "4", label: "تحديث الإصدار" },
                  ].map(s => (
                    <div key={s.step} className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2 border">
                      <span className="w-5 h-5 bg-teal-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shrink-0">
                        {s.step}
                      </span>
                      {s.label}
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!installFile || !!activeJob || installing}
                  onClick={handleInstall}
                >
                  {installing ? (
                    <><Loader2 className="w-4 h-4 me-2 animate-spin" /> جارٍ الرفع...</>
                  ) : (
                    <><Zap className="w-4 h-4 me-2" /> تثبيت التحديث الآن</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
