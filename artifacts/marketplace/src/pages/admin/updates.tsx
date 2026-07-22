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
import {
  Download, Upload, RefreshCw, Shield, Package, HardDrive,
  CheckCircle, XCircle, Loader2, Clock, Trash2, RotateCcw,
  AlertTriangle, Info, Zap, Database, FileArchive, GitCompare,
  FilePlus, FilePen, FileX, ChevronDown, ChevronUp,
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
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    try { return JSON.parse(text); } catch { throw new Error(text || `HTTP ${res.status}`); }
  }
  return res.json();
}

const updatesApi = {
  info:          () => apiFetch("/admin/updates/info"),
  diff:          () => apiFetch("/admin/updates/diff"),
  backups:       () => apiFetch("/admin/updates/backups"),
  packages:      () => apiFetch("/admin/updates/packages"),
  createBackup:  (label: string) => apiFetch("/admin/updates/backup", { method: "POST", body: JSON.stringify({ label }) }),
  createPackage: (body: object)  => apiFetch("/admin/updates/create-package", { method: "POST", body: JSON.stringify(body) }),
  rollback:      (filename: string) => apiFetch("/admin/updates/rollback", { method: "POST", body: JSON.stringify({ filename }) }),
  job:           (id: string) => apiFetch(`/admin/updates/job/${id}`),
  deleteBackup:  (name: string) => apiFetch(`/admin/updates/backup/${encodeURIComponent(name)}`, { method: "DELETE" }),
  deletePackage: (name: string) => apiFetch(`/admin/updates/package/${encodeURIComponent(name)}`, { method: "DELETE" }),
  downloadUrl:   (type: "backup" | "package", name: string) =>
    `${BASE}/admin/updates/download/${type}/${encodeURIComponent(name)}`,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobData {
  id: string; type: string;
  status: "running" | "success" | "failed";
  progress: number; logs: string[];
  result?: any; error?: string;
  startedAt: string; completedAt?: string;
}

interface FileEntry {
  name: string; size: number; createdAt: string;
  type?: string; fromVersion?: string; toVersion?: string; changelog?: string;
}

interface DiffData {
  baseVersion: string | null;
  currentVersion: string;
  hasSnapshot: boolean;
  diff: { added: number; modified: number; deleted: number; total: number };
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  pendingMigrations: string[];
  hasChanges: boolean;
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
    intervalRef.current = setInterval(poll, 1200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [job?.logs]);

  if (!job) return (
    <div className="flex items-center gap-2 text-slate-500 py-4">
      <Loader2 className="w-4 h-4 animate-spin" /><span>جارٍ التهيئة...</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {job.status === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
          {job.status === "failed"  && <XCircle className="w-4 h-4 text-red-500" />}
          <span className="text-sm font-medium">
            {job.status === "running" ? "جارٍ التنفيذ..." : job.status === "success" ? "اكتمل بنجاح" : "فشل"}
          </span>
        </div>
        <span className="text-xs text-slate-400">{job.progress}%</span>
      </div>
      <Progress value={job.progress} className="h-2" />
      <div
        ref={logsRef}
        className="bg-slate-950 text-slate-200 text-xs font-mono rounded-lg p-3 h-52 overflow-y-auto leading-relaxed"
      >
        {job.logs.map((line, i) => (
          <div key={i} className={
            line.includes("❌") ? "text-red-400" :
            line.includes("✅") ? "text-green-400" :
            line.includes("⚠️") ? "text-yellow-400" :
            line.includes("✓")  ? "text-teal-400"  : "text-slate-300"
          }>{line}</div>
        ))}
        {job.status === "running" && <div className="text-slate-500 animate-pulse">▌</div>}
      </div>
      {job.status === "failed" && job.error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{job.error}</AlertDescription>
        </Alert>
      )}
      {job.status === "success" && job.result && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 text-sm">
            {job.result.filename
              ? <>تم إنشاء الحزمة: <strong>{job.result.filename}</strong> ({fmtBytes(job.result.size ?? 0)}) — نزّلها من تبويب «حزم التحديث»</>
              : job.result.version
              ? <>تم التثبيت بنجاح — الإصدار الحالي: <strong>v{job.result.version}</strong></>
              : "اكتملت العملية بنجاح"
            }
          </AlertDescription>
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

// ── Diff Preview Card ─────────────────────────────────────────────────────────

function DiffPreview({ diff, expanded, onToggle }: { diff: DiffData; expanded: boolean; onToggle: () => void }) {
  const { diff: d } = diff;
  const total = d.added + d.modified + d.deleted + diff.pendingMigrations.length;

  return (
    <div className="border rounded-xl bg-slate-50 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors text-right"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <GitCompare className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-700">
              معاينة التغييرات منذ{" "}
              {diff.baseVersion ? <>v{diff.baseVersion}</> : "الإصدار الأول"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {diff.hasChanges ? `${total} تغيير متراكم` : "لا توجد تغييرات — الكود مطابق للقطة الأخيرة"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {d.added > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
              <FilePlus className="w-3 h-3" />{d.added}
            </span>
          )}
          {d.modified > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
              <FilePen className="w-3 h-3" />{d.modified}
            </span>
          )}
          {d.deleted > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
              <FileX className="w-3 h-3" />{d.deleted}
            </span>
          )}
          {diff.pendingMigrations.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
              <Database className="w-3 h-3" />{diff.pendingMigrations.length}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t divide-y divide-slate-100">
          {diff.pendingMigrations.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                ترحيلات قاعدة البيانات الجديدة ({diff.pendingMigrations.length})
              </p>
              <div className="space-y-1">
                {diff.pendingMigrations.map(m => (
                  <p key={m} className="text-xs font-mono text-amber-800 bg-amber-50 px-2 py-1 rounded">{m}</p>
                ))}
              </div>
            </div>
          )}
          {d.added > 0 && (
            <FileList title="ملفات جديدة" files={diff.addedFiles} color="green" icon={<FilePlus className="w-3 h-3" />} />
          )}
          {d.modified > 0 && (
            <FileList title="ملفات معدَّلة" files={diff.modifiedFiles} color="blue" icon={<FilePen className="w-3 h-3" />} />
          )}
          {d.deleted > 0 && (
            <FileList title="ملفات محذوفة" files={diff.deletedFiles} color="red" icon={<FileX className="w-3 h-3" />} />
          )}
          {!diff.hasChanges && (
            <div className="p-4 text-center text-sm text-slate-400">
              لا توجد تغييرات في الكود أو قاعدة البيانات منذ الإصدار الأخير
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileList({ title, files, color, icon }: { title: string; files: string[]; color: string; icon: React.ReactNode }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? files : files.slice(0, 8);
  const colorMap: Record<string, string> = {
    green: "text-green-700 bg-green-50",
    blue:  "text-blue-700 bg-blue-50",
    red:   "text-red-700 bg-red-50",
  };

  return (
    <div className="p-4">
      <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${colorMap[color]?.split(" ")[0] ?? "text-slate-700"}`}>
        {icon}{title} ({files.length})
      </p>
      <div className="space-y-0.5">
        {visible.map(f => (
          <p key={f} className={`text-xs font-mono px-2 py-0.5 rounded ${colorMap[color] ?? ""}`}>
            {f}
          </p>
        ))}
        {files.length > 8 && !showAll && (
          <button
            className="text-xs text-slate-400 hover:text-slate-600 mt-1"
            onClick={() => setShowAll(true)}
          >
            + {files.length - 8} ملف آخر...
          </button>
        )}
      </div>
    </div>
  );
}

// ── Backup Row ─────────────────────────────────────────────────────────────────

function BackupRow({ entry, type, onRollback, onDelete }: {
  entry: FileEntry; type: "backup" | "package";
  onRollback?: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg bg-white">
      <div className="flex items-center gap-3 p-3">
        <FileArchive className="w-5 h-5 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-700 truncate">{entry.name}</p>
            {entry.type === "incremental" && (
              <Badge className="text-[10px] h-4 bg-purple-100 text-purple-700 border-purple-200">تدريجية</Badge>
            )}
            {entry.type === "full" && (
              <Badge variant="outline" className="text-[10px] h-4">كاملة</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-slate-400">{fmtDate(entry.createdAt)} — {fmtBytes(entry.size)}</p>
            {entry.fromVersion && entry.toVersion && (
              <p className="text-xs text-teal-600 font-medium">v{entry.fromVersion} → v{entry.toVersion}</p>
            )}
          </div>
          {entry.changelog && (
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{entry.changelog}</p>
          )}
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
              سيتم استعادة قاعدة البيانات وملفات الرفع من هذه النسخة. العملية لا يمكن التراجع عنها.
            </AlertDescription>
          </Alert>
          <Button size="sm" variant="destructive" onClick={() => { onRollback(entry.name); setExpanded(false); }}>
            <RotateCcw className="w-3.5 h-3.5 me-1" />تأكيد التراجع
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
  const [changelog, setChangelog] = useState("");
  const [bumpType, setBumpType] = useState<"patch" | "minor" | "major">("patch");
  const [installFile, setInstallFile] = useState<File | null>(null);
  const [installing, setInstalling] = useState(false);
  const [diffExpanded, setDiffExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: infoRes, isLoading: infoLoading } = useQuery({
    queryKey: ["updates-info"],
    queryFn: updatesApi.info,
    refetchInterval: activeJob ? 5000 : 30_000,
  });

  const { data: diffRes, refetch: refetchDiff, isFetching: diffLoading } = useQuery({
    queryKey: ["updates-diff"],
    queryFn: updatesApi.diff,
    staleTime: 60_000,
    enabled: activeTab === "package",
  });

  const { data: backupsRes, refetch: refetchBackups } = useQuery({
    queryKey: ["updates-backups"],
    queryFn: updatesApi.backups,
  });

  const { data: pkgsRes, refetch: refetchPkgs } = useQuery({
    queryKey: ["updates-packages"],
    queryFn: updatesApi.packages,
  });

  const info: any     = infoRes?.data;
  const diff: DiffData | null = diffRes?.data ?? null;
  const backups: FileEntry[]  = backupsRes?.data ?? [];
  const packages: FileEntry[] = pkgsRes?.data ?? [];

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["updates-info"] });
    refetchBackups(); refetchPkgs(); refetchDiff();
  };

  const handleJobDone = (job: JobData) => {
    setActiveJob(null);
    if (job.status === "success") {
      toast.success("اكتملت العملية بنجاح");
      refreshAll();
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
      const res = await updatesApi.createPackage({ bumpType, changelog });
      if (res?.jobId) { setActiveJob(res.jobId); setActiveTab("package"); }
      else toast.error(res?.error ?? "فشل إنشاء الحزمة");
    } catch { toast.error("تعذر إنشاء حزمة التحديث"); }
  };

  const startRollback = async (filename: string) => {
    try {
      const res = await updatesApi.rollback(filename);
      if (res?.jobId) { setActiveJob(res.jobId); setActiveTab("backup"); }
    } catch { toast.error("تعذر بدء عملية التراجع"); }
  };

  const handleInstall = async () => {
    if (!installFile) { toast.error("اختر ملف ZIP للتثبيت"); return; }
    setInstalling(true);
    try {
      const formData = new FormData();
      formData.append("package", installFile);
      const res = await fetch("/api/admin/updates/install", {
        method: "POST", body: formData, credentials: "include",
      });
      const json = await res.json();
      if (json?.jobId) {
        setActiveJob(json.jobId); setActiveTab("install");
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

  // compute next version string for display
  const currentVer: string = info?.version?.version ?? "1.0.0";
  const nextVer = (() => {
    const [maj, min, pat] = currentVer.split(".").map(Number);
    if (bumpType === "major") return `${maj + 1}.0.0`;
    if (bumpType === "minor") return `${maj}.${min + 1}.0`;
    return `${maj}.${min}.${pat + 1}`;
  })();

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
            <p className="text-sm text-slate-500 mt-1">
              نظام تحديثات تدريجي — حزم صغيرة تحتوي فقط على التغييرات الجديدة
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={!!activeJob}>
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
                    <p className="text-2xl font-bold text-teal-700">v{currentVer}</p>
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
                    <span className="font-semibold">{info.packages?.count ?? 0} حزمة</span>
                    <span className="text-slate-400 text-xs ms-2">({fmtBytes(info.packages?.diskBytes ?? 0)})</span>
                  </div>
                  {info.snapshot && (
                    <div>
                      <span className="text-slate-400 block text-xs">آخر لقطة مرجعية</span>
                      <span className="font-semibold">v{info.snapshot.version}</span>
                      <span className="text-slate-400 text-xs ms-2">({info.snapshot.fileCount?.toLocaleString()} ملف)</span>
                    </div>
                  )}
                  {!info.snapshot && (
                    <div className="flex items-center gap-1.5 text-amber-600 text-xs bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      لا توجد لقطة مرجعية — أنشئ أول حزمة لتسجيل الخط الأساسي
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
              {[
                {
                  icon: HardDrive, color: "blue", title: "النسخ الاحتياطي",
                  desc: "نسخ شامل لقاعدة البيانات + الملفات المرفوعة",
                  sub: `${backups.length} نسخة محفوظة`,
                  tab: "backup",
                },
                {
                  icon: GitCompare, color: "purple", title: "حزمة تدريجية",
                  desc: "فقط الملفات المتغيرة + ترحيلات DB الجديدة",
                  sub: `${packages.length} حزمة متاحة`,
                  tab: "package",
                },
                {
                  icon: Upload, color: "green", title: "تثبيت تحديث",
                  desc: "رفع حزمة ZIP — يكتشف الإصدار تلقائياً",
                  sub: "مع نسخ احتياطي تلقائي قبل التثبيت",
                  tab: "install",
                },
              ].map(f => (
                <Card
                  key={f.tab}
                  className="cursor-pointer hover:border-teal-300 transition-colors"
                  onClick={() => setActiveTab(f.tab)}
                >
                  <CardContent className="p-5 flex items-start gap-3">
                    <div className={`w-10 h-10 bg-${f.color}-100 rounded-lg flex items-center justify-center shrink-0`}>
                      <f.icon className={`w-5 h-5 text-${f.color}-600`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">{f.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                      <p className="text-xs text-teal-600 mt-1 font-medium">{f.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                <strong>كيف يعمل النظام التدريجي:</strong> عند إنشاء أول حزمة يُحفظ بصمة الكود الحالي. في كل إصدار لاحق تُقارَن الملفات ببصمة آخر إصدار — وتُضمَّن فقط الملفات المتغيرة + ترحيلات DB الجديدة. الحزمة بحجم كيلوبايتات بدلاً من ميغابايتات.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: GitCompare, title: "تدريجي بالكامل",     desc: "فقط الملفات المتغيرة — حجم الحزمة يصل لكيلوبايتات" },
                { icon: Database,   title: "ترحيلات DB تلقائية", desc: "ملفات SQL الجديدة تُطبَّق بترتيبها تلقائياً" },
                { icon: Shield,     title: "توقيع رقمي HMAC",    desc: "كل حزمة موقعة — أي تلاعب يُكتشف فوراً" },
                { icon: RotateCcw,  title: "تراجع فوري",         desc: "نسخة احتياطية تلقائية قبل أي تثبيت — تراجع بنقرة" },
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
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "يدوي",        key: "manual" },
                    { label: "قبل تحديث",   key: "pre-update" },
                    { label: "أسبوعي",      key: "weekly" },
                  ].map(b => (
                    <Button
                      key={b.key}
                      variant="outline" size="sm"
                      disabled={!!activeJob}
                      onClick={() => startBackup(b.key)}
                    >
                      <HardDrive className="w-3.5 h-3.5 me-1" />{b.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

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
                <BackupRow key={b.name} entry={b} type="backup" onRollback={startRollback} onDelete={async (name) => {
                  if (!confirm(`حذف النسخة "${name}"؟`)) return;
                  const r = await updatesApi.deleteBackup(name);
                  r?.success ? (toast.success("تم الحذف"), refetchBackups()) : toast.error(r?.error ?? "فشل الحذف");
                }} />
              ))}
            </div>
          </TabsContent>

          {/* ── Create Package ── */}
          <TabsContent value="package" className="space-y-4 mt-4">
            {/* Diff preview */}
            <div>
              {diffLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> جارٍ فحص التغييرات...
                </div>
              ) : diff ? (
                <DiffPreview diff={diff} expanded={diffExpanded} onToggle={() => setDiffExpanded(v => !v)} />
              ) : null}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-purple-600" />
                  إنشاء حزمة تدريجية
                </CardTitle>
                <CardDescription>
                  تُضمَّن فقط الملفات المتغيرة منذ الإصدار الأخير — لا رفع للمشروع بالكامل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>نوع الإصدار</Label>
                  <RadioGroup value={bumpType} onValueChange={v => setBumpType(v as any)} className="flex gap-4 flex-wrap">
                    {[
                      { val: "patch", label: "Patch — إصلاح أخطاء",     badge: "1.0.x" },
                      { val: "minor", label: "Minor — ميزات جديدة",      badge: "1.x.0" },
                      { val: "major", label: "Major — تغييرات جوهرية",   badge: "x.0.0" },
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
                    placeholder={"مثال:\n- إصلاح مشكلة تسجيل الدخول\n- تحسين أداء البحث\n- إضافة ميزة المفضلة"}
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Version preview + diff summary */}
                <div className="bg-slate-50 rounded-xl p-4 border space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">الإصدار:</span>
                    <span className="font-mono text-sm font-bold text-slate-700">v{currentVer}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-mono text-sm font-bold text-teal-700">v{nextVer}</span>
                  </div>
                  {diff && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        +{diff.diff.added} جديد
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        ~{diff.diff.modified} معدَّل
                      </span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        -{diff.diff.deleted} محذوف
                      </span>
                      {diff.pendingMigrations.length > 0 && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                          {diff.pendingMigrations.length} ترحيل DB
                        </span>
                      )}
                      {!diff.hasChanges && (
                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                          لا توجد تغييرات
                        </span>
                      )}
                    </div>
                  )}
                  {!diff?.hasSnapshot && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      لا توجد لقطة سابقة — ستُبنى لقطة أولية وتُنشَأ حزمة كاملة كخط أساسي
                    </p>
                  )}
                </div>

                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!!activeJob || !changelog.trim()}
                  onClick={startCreatePackage}
                >
                  <Package className="w-4 h-4 me-2" />
                  إنشاء حزمة التحديث التدريجية
                </Button>
              </CardContent>
            </Card>

            {/* Packages list */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Package className="w-4 h-4" />
                حزم التحديث المتاحة ({packages.length})
              </h3>
              {packages.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border rounded-lg">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">لا توجد حزم بعد</p>
                </div>
              ) : packages.map(p => (
                <BackupRow key={p.name} entry={p} type="package" onDelete={async (name) => {
                  if (!confirm(`حذف الحزمة "${name}"؟`)) return;
                  const r = await updatesApi.deletePackage(name);
                  r?.success ? (toast.success("تم الحذف"), refetchPkgs()) : toast.error(r?.error ?? "فشل الحذف");
                }} />
              ))}
            </div>
          </TabsContent>

          {/* ── Install ── */}
          <TabsContent value="install" className="space-y-4 mt-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                <strong>قبل التثبيت:</strong> يُنشأ نسخ احتياطي تلقائي. النظام يكتشف نوع الحزمة (تدريجية/كاملة) ويطبّق التغييرات المناسبة فقط.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">رفع وتثبيت حزمة تحديث</CardTitle>
                <CardDescription>
                  يدعم الحزم التدريجية الجديدة والحزم الكاملة القديمة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${installFile ? "border-teal-400 bg-teal-50" : "border-slate-300 hover:border-slate-400"}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".zip")) setInstallFile(f); }}
                >
                  <input
                    ref={fileInputRef} type="file" accept=".zip" className="hidden"
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { n: "1", label: "فك الضغط" },
                    { n: "2", label: "التحقق الرقمي" },
                    { n: "3", label: "نسخ احتياطي" },
                    { n: "4", label: "تطبيق التغييرات" },
                    { n: "5", label: "تشغيل الترحيلات" },
                  ].map(s => (
                    <div key={s.n} className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2 border">
                      <span className="w-5 h-5 bg-teal-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shrink-0">{s.n}</span>
                      {s.label}
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!installFile || !!activeJob || installing}
                  onClick={handleInstall}
                >
                  {installing
                    ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> جارٍ الرفع...</>
                    : <><Zap className="w-4 h-4 me-2" /> تثبيت التحديث الآن</>
                  }
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
