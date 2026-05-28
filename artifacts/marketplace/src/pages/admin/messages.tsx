import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Plus, Search, RefreshCw, Eye, Copy, Trash2, Pencil, RotateCcw, Download, Upload, Sparkles,
  Mail, MessageSquare, Phone, Bell, Zap, Layers, Send, Code2, Monitor, Smartphone,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight, X, Save, Files, Loader2,
  Info, ToggleLeft, Hash, Shield, ShoppingCart, CreditCard, Package, Settings, Globe, Home
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// ─────────────────── Types ────────────────────────────────────────────────

type Template = {
  id: number;
  name: string;
  slug: string;
  subject: string;
  htmlBody: string;
  plainBody: string;
  category: string;
  channels: string;
  variables: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type EditData = {
  name: string;
  slug: string;
  subject: string;
  htmlBody: string;
  plainBody: string;
  category: string;
  channels: string[];
  variables: string;
  isActive: boolean;
};

// ─────────────────── Constants ────────────────────────────────────────────

const CATEGORIES: { key: string; label: string; icon: React.ElementType; color: string }[] = [
  { key: "all",          label: "جميع القوالب",        icon: Layers,       color: "text-slate-600" },
  { key: "auth",         label: "التحقق والدخول",      icon: Shield,       color: "text-blue-600"  },
  { key: "welcome",      label: "رسائل الترحيب",       icon: Sparkles,     color: "text-emerald-600"},
  { key: "reset",        label: "إعادة كلمة المرور",   icon: RefreshCw,    color: "text-amber-600" },
  { key: "listing",      label: "الخدمات والإعلانات",  icon: Globe,        color: "text-teal-600"  },
  { key: "order",        label: "الطلبات",              icon: ShoppingCart, color: "text-indigo-600"},
  { key: "subscription", label: "الاشتراكات",           icon: Package,      color: "text-purple-600"},
  { key: "payment",      label: "المدفوعات",            icon: CreditCard,   color: "text-rose-600"  },
  { key: "admin",        label: "إشعارات الأدمن",      icon: Bell,         color: "text-orange-600"},
  { key: "system",       label: "تنبيهات النظام",       icon: Settings,     color: "text-slate-600" },
  { key: "sms",          label: "رسائل SMS",            icon: Phone,        color: "text-cyan-600"  },
  { key: "whatsapp",     label: "واتساب",               icon: MessageSquare,color: "text-green-600" },
  { key: "notification", label: "إشعارات عامة",         icon: Zap,          color: "text-yellow-600"},
  { key: "custom",       label: "قوالب مخصصة",         icon: Hash,         color: "text-slate-600" },
];

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label]));

const CHANNEL_CONFIG = [
  { key: "email",    label: "بريد إلكتروني", icon: Mail,         color: "bg-blue-100 text-blue-700 border-blue-200"   },
  { key: "sms",      label: "SMS",           icon: Phone,        color: "bg-cyan-100 text-cyan-700 border-cyan-200"   },
  { key: "whatsapp", label: "واتساب",        icon: MessageSquare,color: "bg-green-100 text-green-700 border-green-200"},
  { key: "push",     label: "Push",          icon: Bell,         color: "bg-purple-100 text-purple-700 border-purple-200"},
  { key: "in_app",   label: "داخل التطبيق", icon: Zap,          color: "bg-amber-100 text-amber-700 border-amber-200" },
];

const DEMO_VARS: Record<string, string> = {
  userName: "أحمد محمد",
  userEmail: "ahmed@example.com",
  siteName: "عقارات بنها",
  siteUrl: "https://example.com",
  contactEmail: "info@example.com",
  year: new Date().getFullYear().toString(),
  orderNumber: "1234",
  serviceName: "تنظيف المنزل",
  providerName: "شركة النظافة الذهبية",
  orderDate: new Date().toLocaleDateString("ar"),
  amount: "150",
  planName: "باقة البرونز",
  startDate: new Date().toLocaleDateString("ar"),
  endDate: new Date(Date.now() + 30 * 864e5).toLocaleDateString("ar"),
  price: "99",
  daysLeft: "7",
  renewUrl: "https://example.com/dashboard/subscription",
  resetLink: "#reset-link",
  verificationLink: "#verify-link",
  retryUrl: "#retry-link",
  serviceUrl: "#service-url",
  adminUrl: "#admin-url",
  notificationTitle: "إشعار تجريبي",
  notificationBody: "هذا إشعار تجريبي لمعاينة القالب.",
  actionLink: "#",
  actionText: "عرض التفاصيل",
  loginTime: new Date().toLocaleString("ar"),
  loginDevice: "Chrome / macOS",
  loginLocation: "القاهرة، جمهورية مصر العربية",
  changeTime: new Date().toLocaleString("ar"),
  rejectReason: "الرجاء إضافة تفاصيل أكثر عن الخدمة.",
  reviewTime: "24 ساعة",
  providerEmail: "provider@example.com",
  providerPhone: "0501234567",
  providerCategory: "تنظيف المنزل",
  registrationDate: new Date().toLocaleDateString("ar"),
  otpCode: "123456",
  expiryMinutes: "5",
  maintenanceStart: "السبت 01:00 ص",
  maintenanceEnd: "السبت 03:00 ص",
  maintenanceReason: "تحديث النظام وتحسين الأداء",
  failReason: "رصيد غير كافٍ",
  transactionId: "TXN-987654",
  paymentDate: new Date().toLocaleDateString("ar"),
  subject: "موضوع الرسالة",
};

function extractVars(text: string): string[] {
  const matches = [...(text ?? "").matchAll(/\{\{(\w+)\}\}/g)];
  return [...new Set(matches.map(m => m[1]))];
}

function parseChannels(raw: string | null): string[] {
  try { return JSON.parse(raw ?? '["email"]'); } catch { return ["email"]; }
}

const emptyEdit: EditData = {
  name: "", slug: "", subject: "", htmlBody: "", plainBody: "",
  category: "custom", channels: ["email"], variables: "[]", isActive: true,
};

// ─────────────────── Sub-components ───────────────────────────────────────

function ChannelBadge({ ch, small }: { ch: string; small?: boolean }) {
  const cfg = CHANNEL_CONFIG.find(c => c.key === ch);
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${small ? "text-[10px]" : "text-xs"} ${cfg.color}`}>
      <Icon className={small ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {cfg.label}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${active ? "text-emerald-600" : "text-slate-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
      {active ? "مفعّل" : "معطّل"}
    </span>
  );
}

// ─────────────────── Main Component ───────────────────────────────────────

export default function AdminMessages() {
  const qc = useQueryClient();

  // ── core state ────────────────────────────────────────────
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch]           = useState("");
  const [activeTab, setActiveTab]     = useState("editor");
  const [editData, setEditData]       = useState<EditData>(emptyEdit);
  const [isDirty, setIsDirty]         = useState(false);

  // ── modals ────────────────────────────────────────────────
  const [newModal, setNewModal]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [importOpen, setImportOpen]   = useState(false);
  const [importJson, setImportJson]   = useState("");

  // ── preview ───────────────────────────────────────────────
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewPlain, setPreviewPlain] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── AI assistant ──────────────────────────────────────────
  const [aiPrompt, setAiPrompt]       = useState("");
  const [aiType, setAiType]           = useState("body");
  const [aiResult, setAiResult]       = useState("");
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiDemo, setAiDemo]           = useState(false);

  // ── saving ────────────────────────────────────────────────
  const [saving, setSaving]           = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

  // ── queries ───────────────────────────────────────────────
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["msg-templates"],
    queryFn: () => api.fetchJson("/admin/email/templates"),
  });

  // ── derived ───────────────────────────────────────────────
  const filtered = templates.filter(t => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.includes(q) || t.slug.includes(q) || t.subject.includes(q);
    }
    return true;
  });

  const selectedTpl = templates.find(t => t.id === selectedId) ?? null;

  const categoryCounts: Record<string, number> = {};
  templates.forEach(t => { categoryCounts[t.category] = (categoryCounts[t.category] ?? 0) + 1; });

  // ── select template ───────────────────────────────────────
  const selectTemplate = useCallback((tpl: Template) => {
    setSelectedId(tpl.id);
    setEditData({
      name: tpl.name, slug: tpl.slug, subject: tpl.subject,
      htmlBody: tpl.htmlBody, plainBody: tpl.plainBody ?? "",
      category: tpl.category, channels: parseChannels(tpl.channels),
      variables: tpl.variables ?? "[]", isActive: tpl.isActive,
    });
    setIsDirty(false);
    setActiveTab("editor");
    setPreviewHtml("");
    setAiResult("");
  }, []);

  // ── auto-select first template ────────────────────────────
  useEffect(() => {
    if (templates.length > 0 && !selectedId) selectTemplate(templates[0]);
  }, [templates.length]);

  // ── update edit data ──────────────────────────────────────
  function updateField<K extends keyof EditData>(key: K, val: EditData[K]) {
    setEditData(d => ({ ...d, [key]: val }));
    setIsDirty(true);
  }

  function toggleChannel(ch: string) {
    setEditData(d => {
      const chs = d.channels.includes(ch) ? d.channels.filter(c => c !== ch) : [...d.channels, ch];
      return { ...d, channels: chs };
    });
    setIsDirty(true);
  }

  // ── save ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.fetchJson(`/admin/email/templates/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ ...editData, channels: JSON.stringify(editData.channels) }),
      });
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      setIsDirty(false);
      toast.success("تم حفظ القالب بنجاح");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ── toggle active ─────────────────────────────────────────
  const handleToggleActive = async (id: number, val: boolean) => {
    try {
      await api.fetchJson(`/admin/email/templates/${id}`, { method: "PUT", body: JSON.stringify({ isActive: val }) });
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      if (id === selectedId) setEditData(d => ({ ...d, isActive: val }));
      toast.success(val ? "تم تفعيل القالب" : "تم تعطيل القالب");
    } catch (e: any) { toast.error(e.message); }
  };

  // ── duplicate ─────────────────────────────────────────────
  const handleDuplicate = async () => {
    if (!selectedId) return;
    setDuplicating(true);
    try {
      const res = await api.fetchJson<{ id: number }>(`/admin/email/templates/${selectedId}/duplicate`, { method: "POST" });
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      toast.success("تم نسخ القالب");
      setTimeout(() => {
        const newTpl = qc.getQueryData<Template[]>(["msg-templates"])?.find(t => t.id === (res as any).id);
        if (newTpl) selectTemplate(newTpl);
      }, 500);
    } catch (e: any) { toast.error(e.message); }
    finally { setDuplicating(false); }
  };

  // ── restore default ───────────────────────────────────────
  const handleRestore = async () => {
    if (!selectedId) return;
    setRestoreLoading(true);
    try {
      const res = await api.fetchJson<Template>(`/admin/email/templates/${selectedId}/restore-default`, { method: "POST" });
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      selectTemplate(res as any);
      toast.success("تم استعادة القالب الافتراضي");
    } catch (e: any) { toast.error(e.message || "لا يوجد قالب افتراضي لهذا النوع"); }
    finally { setRestoreLoading(false); }
  };

  // ── delete ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.fetchJson(`/admin/email/templates/${deleteTarget.id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      if (selectedId === deleteTarget.id) { setSelectedId(null); setEditData(emptyEdit); }
      setDeleteTarget(null);
      toast.success("تم حذف القالب");
    } catch (e: any) { toast.error(e.message); }
  };

  // ── preview ───────────────────────────────────────────────
  const loadPreview = async () => {
    if (!selectedId) return;
    setPreviewLoading(true);
    try {
      // Save current edits first silently, then preview
      await api.fetchJson(`/admin/email/templates/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ ...editData, channels: JSON.stringify(editData.channels) }),
      });
      const res = await api.fetchJson<{ html: string; subject: string; plain: string }>(
        `/admin/email/templates/${selectedId}/preview`,
        { method: "POST", body: JSON.stringify(DEMO_VARS) }
      );
      setPreviewHtml(res.html);
      setPreviewPlain(res.plain ?? "");
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      setIsDirty(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setPreviewLoading(false); }
  };

  useEffect(() => {
    if (activeTab === "preview" || activeTab === "mobile") loadPreview();
  }, [activeTab]);

  // ── export ────────────────────────────────────────────────
  const handleExport = () => {
    window.open(`/api-server/admin/email/export`, "_blank");
  };

  // ── import ────────────────────────────────────────────────
  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      const tpls = parsed.templates ?? parsed;
      const res = await api.fetchJson<{ added: number; updated: number; errors: string[] }>("/admin/email/import", {
        method: "POST",
        body: JSON.stringify({ templates: Array.isArray(tpls) ? tpls : [tpls] }),
      });
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      toast.success(`تم الاستيراد: ${res.added} مضاف، ${res.updated} محدّث`);
      setImportOpen(false);
      setImportJson("");
    } catch (e: any) { toast.error("JSON غير صحيح: " + e.message); }
  };

  // ── seed ──────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeedLoading(true);
    try {
      const res = await api.fetchJson<{ added: number }>("/admin/email/seed", { method: "POST" });
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      toast.success(`تمت إضافة ${res.added} قالب افتراضي`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSeedLoading(false); }
  };

  // ── new template ──────────────────────────────────────────
  const [newData, setNewData] = useState({ name: "", slug: "", subject: "", category: "custom", channels: ["email"] });
  const handleCreateNew = async () => {
    if (!newData.name || !newData.slug) { toast.error("الاسم والـ Slug مطلوبان"); return; }
    try {
      const res = await api.fetchJson<Template>("/admin/email/templates", {
        method: "POST",
        body: JSON.stringify({
          ...newData,
          channels: JSON.stringify(newData.channels),
          htmlBody: "",
          plainBody: "",
          isActive: false,
        }),
      });
      qc.invalidateQueries({ queryKey: ["msg-templates"] });
      setNewModal(false);
      setNewData({ name: "", slug: "", subject: "", category: "custom", channels: ["email"] });
      setTimeout(() => selectTemplate(res as any), 300);
      toast.success("تم إنشاء القالب");
    } catch (e: any) { toast.error(e.message); }
  };

  // ── AI assist ─────────────────────────────────────────────
  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) { toast.error("أدخل وصفاً للمحتوى المطلوب"); return; }
    setAiLoading(true);
    setAiResult("");
    try {
      const res = await api.fetchJson<{ result: string; demo?: boolean }>("/admin/email/ai-assist", {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt, type: aiType, context: { siteName: "عقارات بنها" } }),
      });
      setAiResult(res.result);
      setAiDemo(!!res.demo);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(false); }
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    if (aiType === "subject") updateField("subject", aiResult);
    else updateField(editData.channels.includes("email") ? "htmlBody" : "plainBody", aiResult);
    toast.success("تم تطبيق المقترح");
    setAiResult("");
    setAiPrompt("");
  };

  // ── variables ─────────────────────────────────────────────
  const detectedVars = extractVars(editData.htmlBody + " " + editData.plainBody + " " + editData.subject);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(`{{${text}}}`).then(() => toast.success(`تم نسخ {{${text}}}`));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // ── Render ──────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────────

  const TABS = [
    { key: "editor",    label: "المحرر",      icon: Code2    },
    { key: "variables", label: "المتغيرات",   icon: Hash     },
    { key: "preview",   label: "معاينة",      icon: Eye      },
    { key: "mobile",    label: "موبايل",      icon: Smartphone},
    { key: "channels",  label: "القنوات",     icon: ToggleLeft},
    { key: "ai",        label: "مساعد AI",    icon: Sparkles },
  ];

  return (
    <AdminLayout title="إدارة الرسائل والقوالب">
      <div className="flex flex-col gap-0 -mx-4 lg:-mx-8 -mt-4 lg:-mt-8">

        {/* ── Global Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">إدارة الرسائل والقوالب</h1>
              <p className="text-xs text-slate-400">
                {templates.length} قالب · {templates.filter(t => t.isActive).length} مفعّل
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {templates.length === 0 ? (
              <Button size="sm" onClick={handleSeed} disabled={seedLoading} className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                {seedLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                تحميل القوالب الجاهزة
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleSeed} disabled={seedLoading} className="gap-1.5 text-xs">
                {seedLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                تحميل الجديدة
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5 text-xs">
              <Upload className="w-3 h-3" /> استيراد
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
              <Download className="w-3 h-3" /> تصدير
            </Button>
            <Button size="sm" onClick={() => setNewModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" /> قالب جديد
            </Button>
          </div>
        </div>

        {/* ── Main Split Layout ── */}
        <div className="flex">

          {/* ── LEFT SIDEBAR ── */}
          <div className="w-72 shrink-0 flex flex-col border-l border-slate-200 bg-slate-50/80 sticky top-0 self-start h-screen overflow-y-auto">

            {/* search */}
            <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute top-2.5 right-3 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث في القوالب..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                />
              </div>
            </div>

            {/* category filter */}
            <div className="flex-1">
              <div className="p-2">
                <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">التصنيفات</p>
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const count = cat.key === "all" ? templates.length : (categoryCounts[cat.key] ?? 0);
                  if (cat.key !== "all" && count === 0) return null;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                        activeCategory === cat.key
                          ? "bg-teal-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${activeCategory === cat.key ? "text-white" : cat.color}`} />
                      <span className="flex-1 truncate text-start">{cat.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeCategory === cat.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* template list */}
              <div className="px-2 pb-2">
                <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  القوالب {filtered.length > 0 ? `(${filtered.length})` : ""}
                </p>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">لا توجد قوالب</div>
                ) : (
                  filtered.map(tpl => {
                    const chs = parseChannels(tpl.channels);
                    const isSelected = selectedId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => selectTemplate(tpl)}
                        className={`w-full text-start px-3 py-2.5 rounded-xl mb-1 transition-all border ${
                          isSelected
                            ? "bg-white border-teal-200 shadow-sm shadow-teal-100"
                            : "border-transparent hover:bg-white hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${tpl.isActive ? "bg-emerald-400" : "bg-slate-300"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isSelected ? "text-teal-700" : "text-slate-700"}`}>{tpl.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{tpl.slug}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {chs.slice(0, 2).map(ch => <ChannelBadge key={ch} ch={ch} small />)}
                              {chs.length > 2 && <span className="text-[9px] text-slate-400">+{chs.length - 2}</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Back to site link ── */}
            <div className="p-3 border-t border-slate-200 bg-white shrink-0">
              <a
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-teal-700 hover:bg-teal-50 transition-colors group"
              >
                <Home className="w-3.5 h-3.5 shrink-0 text-teal-500 group-hover:text-teal-700" />
                <span>العودة إلى عقارات بنها</span>
              </a>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          {!selectedTpl ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white text-center p-12 min-h-screen">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mb-6 shadow-inner">
                <MessageSquare className="w-10 h-10 text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">إدارة الرسائل والقوالب</h2>
              <p className="text-slate-500 text-sm max-w-md leading-relaxed">
                اختر قالباً من القائمة لتعديله، أو أنشئ قالباً جديداً. يمكنك التحكم الكامل في جميع الرسائل التي يستقبلها المستخدمون.
              </p>
              {templates.length === 0 && (
                <Button onClick={handleSeed} disabled={seedLoading} className="mt-6 bg-teal-600 hover:bg-teal-700 gap-2">
                  {seedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  تحميل القوالب الجاهزة (20+ قالب)
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-white">

              {/* ── Template Header ── */}
              <div className="px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 truncate">{editData.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">{editData.slug}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                        {CAT_LABEL[editData.category] ?? editData.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusDot active={editData.isActive} />
                      <div className="flex gap-1 flex-wrap">
                        {editData.channels.map(ch => <ChannelBadge key={ch} ch={ch} />)}
                      </div>
                      {isDirty && (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ● تغييرات غير محفوظة
                        </span>
                      )}
                    </div>
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-1">
                      <Switch
                        checked={editData.isActive}
                        onCheckedChange={v => { updateField("isActive", v); handleToggleActive(selectedId!, v); }}
                        className="scale-75"
                      />
                      <span className="text-xs text-slate-600">{editData.isActive ? "مفعّل" : "معطّل"}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={duplicating} className="gap-1 text-xs h-8">
                      {duplicating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Files className="w-3 h-3" />} نسخ
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRestore} disabled={restoreLoading} className="gap-1 text-xs h-8">
                      {restoreLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} استعادة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteTarget({ id: selectedTpl.id, name: selectedTpl.name })} className="gap-1 text-xs h-8 text-red-500 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-3 h-3" /> حذف
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || !isDirty} className="bg-teal-600 hover:bg-teal-700 gap-1 text-xs h-8">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} حفظ
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── Tabs Nav ── */}
              <div className="flex items-center gap-0 border-b border-slate-200 bg-slate-50/60 px-4 shrink-0 overflow-x-auto">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? "border-teal-600 text-teal-700 bg-white"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/60"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── Tab Content ── */}
              <div className="flex-1">

                {/* EDITOR TAB */}
                {activeTab === "editor" && (
                  <div className="p-6 space-y-5 max-w-4xl">
                    {/* Name + Slug + Category */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">اسم القالب <span className="text-red-500">*</span></Label>
                        <Input value={editData.name} onChange={e => updateField("name", e.target.value)} placeholder="اسم وصفي..." className="text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">المعرّف (Slug) <span className="text-red-500">*</span></Label>
                        <Input dir="ltr" value={editData.slug} onChange={e => updateField("slug", e.target.value)} placeholder="template-slug" className="text-sm font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">التصنيف</Label>
                        <select
                          value={editData.category}
                          onChange={e => updateField("category", e.target.value)}
                          className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background"
                        >
                          {CATEGORIES.filter(c => c.key !== "all").map(c => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">موضوع البريد / عنوان الرسالة</Label>
                      <Input value={editData.subject} onChange={e => updateField("subject", e.target.value)} placeholder="مثال: مرحباً بك في {{siteName}} 🎉" className="text-sm" />
                      <p className="text-[10px] text-slate-400">يُستخدم كسطر موضوع للبريد الإلكتروني وعنوان لباقي القنوات</p>
                    </div>

                    {/* HTML Body */}
                    {(editData.channels.includes("email") || editData.htmlBody) && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700">محتوى البريد الإلكتروني (HTML)</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{editData.htmlBody.length.toLocaleString()} حرف</span>
                            <button
                              onClick={() => { setActiveTab("ai"); setAiType("body"); }}
                              className="text-[10px] text-teal-600 hover:text-teal-700 flex items-center gap-1 border border-teal-200 rounded px-2 py-0.5 hover:bg-teal-50"
                            >
                              <Sparkles className="w-2.5 h-2.5" /> مساعد AI
                            </button>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-700">
                            <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500/70" />
                              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                              <div className="w-3 h-3 rounded-full bg-green-500/70" />
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono flex-1 text-center">HTML Editor</span>
                            <span className="text-[10px] text-slate-500">استخدم {"{{variable}}"} للمتغيرات</span>
                          </div>
                          <textarea
                            value={editData.htmlBody}
                            onChange={e => updateField("htmlBody", e.target.value)}
                            rows={18}
                            dir="ltr"
                            className="w-full p-4 font-mono text-xs text-slate-200 bg-slate-900 focus:outline-none resize-none leading-relaxed"
                            placeholder="<!-- HTML content here... -->"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    )}

                    {/* Plain Body */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        النص العادي
                        {" "}<span className="font-normal text-slate-400">(SMS / واتساب / إشعارات)</span>
                      </Label>
                      <textarea
                        value={editData.plainBody}
                        onChange={e => updateField("plainBody", e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none leading-relaxed"
                        placeholder="مرحباً {{userName}}، نص الرسالة هنا..."
                      />
                      <p className="text-[10px] text-slate-400">هذا النص يُستخدم لقنوات SMS وواتساب والإشعارات الفورية. استخدم {"{{variable}}"} للمتغيرات.</p>
                    </div>
                  </div>
                )}

                {/* VARIABLES TAB */}
                {activeTab === "variables" && (
                  <div className="p-6 max-w-3xl">
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-800 mb-1">المتغيرات الديناميكية</h3>
                      <p className="text-sm text-slate-500">انقر على أي متغير لنسخه. سيتم استبدال المتغيرات تلقائياً عند إرسال الرسالة.</p>
                    </div>

                    {detectedVars.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          المتغيرات المستخدمة في هذا القالب ({detectedVars.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {detectedVars.map(v => (
                            <button
                              key={v}
                              onClick={() => copyToClipboard(v)}
                              className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors"
                            >
                              <span className="text-sm font-mono text-teal-700 font-semibold">{`{{${v}}}`}</span>
                              <Copy className="w-3 h-3 text-teal-400 group-hover:text-teal-600" />
                              {DEMO_VARS[v] && (
                                <span className="text-xs text-slate-400 hidden group-hover:inline">→ {DEMO_VARS[v]}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-blue-500" />
                        جميع المتغيرات المتاحة
                      </p>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-xs">
                            <tr>
                              <th className="text-right px-4 py-2.5 font-semibold text-slate-600">المتغير</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-slate-600">القيمة التجريبية</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-slate-600">الوصف</th>
                              <th className="px-4 py-2.5" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(DEMO_VARS).map(([k, v]) => (
                              <tr key={k} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-teal-700 text-xs font-semibold">{`{{${k}}}`}</td>
                                <td className="px-4 py-2.5 text-slate-500 text-xs truncate max-w-xs">{v}</td>
                                <td className="px-4 py-2.5 text-slate-400 text-xs">
                                  {k === "userName" ? "اسم المستخدم" : k === "siteName" ? "اسم الموقع" : k === "resetLink" ? "رابط إعادة تعيين كلمة المرور" : k === "orderNumber" ? "رقم الطلب" : ""}
                                </td>
                                <td className="px-4 py-2.5">
                                  <button onClick={() => copyToClipboard(k)} className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* PREVIEW TAB */}
                {activeTab === "preview" && (
                  <div className="flex-1 flex flex-col">
                    {previewLoading ? (
                      <div className="flex-1 flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                      </div>
                    ) : previewHtml ? (
                      <div className="flex-1 flex flex-col">
                        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-500">
                          <Monitor className="w-3.5 h-3.5" />
                          معاينة Desktop — البيانات التجريبية مُطبَّقة
                        </div>
                        <iframe
                          srcDoc={previewHtml}
                          className="flex-1 w-full border-0"
                          style={{ minHeight: "600px" }}
                          title="email preview"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-20 text-slate-400">
                        <Eye className="w-8 h-8 mr-3" />
                        <span>جارٍ تحميل المعاينة...</span>
                      </div>
                    )}
                    {editData.plainBody && (
                      <div className="p-4 border-t border-slate-200 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> معاينة النص العادي (SMS / واتساب):</p>
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                          {previewPlain || editData.plainBody}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MOBILE TAB */}
                {activeTab === "mobile" && (
                  <div className="flex-1 flex flex-col items-center py-8 bg-slate-100">
                    {previewLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Phone frame */}
                        <div className="w-80 bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800">
                          <div className="bg-white rounded-[32px] overflow-hidden" style={{ height: 600 }}>
                            <div className="bg-slate-800 flex items-center justify-center py-2">
                              <div className="w-20 h-1.5 bg-slate-600 rounded-full" />
                            </div>
                            {previewHtml ? (
                              <iframe
                                srcDoc={previewHtml}
                                className="w-full border-0"
                                style={{ height: 560 }}
                                title="mobile preview"
                                sandbox="allow-same-origin"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                <Loader2 className="w-5 h-5 animate-spin" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-center mt-4 text-sm text-slate-500">معاينة الموبايل (375px)</p>
                      </div>
                    )}
                  </div>
                )}

                {/* CHANNELS TAB */}
                {activeTab === "channels" && (
                  <div className="p-6 max-w-2xl">
                    <h3 className="font-semibold text-slate-800 mb-1">قنوات الإرسال</h3>
                    <p className="text-sm text-slate-500 mb-6">حدد القنوات التي يُرسل عبرها هذا القالب. تعمل كل قناة باستقلالية.</p>
                    <div className="space-y-3">
                      {CHANNEL_CONFIG.map(ch => {
                        const Icon = ch.icon;
                        const enabled = editData.channels.includes(ch.key);
                        return (
                          <div
                            key={ch.key}
                            onClick={() => toggleChannel(ch.key)}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              enabled
                                ? "border-teal-400 bg-teal-50/60 shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-teal-100" : "bg-slate-100"}`}>
                              <Icon className={`w-5 h-5 ${enabled ? "text-teal-600" : "text-slate-400"}`} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-semibold text-sm ${enabled ? "text-teal-800" : "text-slate-700"}`}>{ch.label}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {ch.key === "email"    && "إرسال رسالة HTML كاملة عبر البريد الإلكتروني"}
                                {ch.key === "sms"      && "إرسال النص العادي عبر رسائل SMS"}
                                {ch.key === "whatsapp" && "إرسال النص العادي عبر واتساب"}
                                {ch.key === "push"     && "إرسال إشعار فوري للمتصفح أو التطبيق"}
                                {ch.key === "in_app"   && "إشعار داخلي يظهر في لوحة الإشعارات"}
                              </p>
                            </div>
                            <Switch checked={enabled} onCheckedChange={() => toggleChannel(ch.key)} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-700 font-medium flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        ملاحظة: تفعيل القناة هنا لا يعني أنها جاهزة للإرسال. تأكد من إعداد SMTP وخدمات SMS وواتساب من إعدادات النظام.
                      </p>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="mt-4 bg-teal-600 hover:bg-teal-700 gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ إعدادات القنوات
                    </Button>
                  </div>
                )}

                {/* AI ASSISTANT TAB */}
                {activeTab === "ai" && (
                  <div className="p-6 max-w-2xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">مساعد AI للكتابة</h3>
                        <p className="text-xs text-slate-500">يولّد نصوصاً احترافية ويحسن رسائلك الحالية</p>
                      </div>
                    </div>

                    {/* Type selector */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {[
                        { key: "subject", label: "سطر الموضوع" },
                        { key: "body",    label: "نص الرسالة"   },
                        { key: "cta",     label: "نص الزر CTA"  },
                        { key: "improve", label: "تحسين النص"   },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setAiType(opt.key)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            aiType === opt.key
                              ? "bg-violet-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Prompt */}
                    <div className="space-y-2 mb-4">
                      <Label className="text-xs font-semibold text-slate-700">اوصف ما تريد كتابته</Label>
                      <textarea
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none"
                        placeholder={
                          aiType === "subject"  ? "مثال: سطر موضوع جذاب لبريد ترحيب بعملاء جدد..."
                        : aiType === "cta"      ? "مثال: نص زر يدعو لإتمام عملية الاشتراك..."
                        : aiType === "improve"  ? "الصق النص الذي تريد تحسينه هنا..."
                        : "مثال: رسالة ترحيب دافئة لعميل جديد تشرح مميزات المنصة..."
                        }
                      />
                    </div>

                    <Button onClick={handleAiAssist} disabled={aiLoading} className="bg-violet-600 hover:bg-violet-700 gap-2 w-full">
                      {aiLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التوليد...</>
                        : <><Sparkles className="w-4 h-4" /> توليد المحتوى</>
                      }
                    </Button>

                    {/* Result */}
                    {aiResult && (
                      <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200 bg-violet-100/60">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                            <span className="text-sm font-semibold text-violet-800">المقترح</span>
                            {aiDemo && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                وضع تجريبي
                              </span>
                            )}
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(aiResult); toast.success("تم النسخ"); }} className="p-1.5 rounded-lg hover:bg-violet-200 text-violet-600 transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{aiResult}</div>
                        <div className="px-4 py-3 border-t border-violet-200 bg-white flex gap-2">
                          <Button size="sm" onClick={applyAiResult} className="bg-violet-600 hover:bg-violet-700 gap-1.5 flex-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> تطبيق على القالب
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAiResult("")}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {aiDemo && (
                          <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
                            <p className="text-xs text-amber-700">
                              💡 لتفعيل AI الكامل، أضف OPENAI_API_KEY في الإعدادات. الآن يعمل بمقترحات تجريبية.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Template Dialog ── */}
      <Dialog open={newModal} onOpenChange={setNewModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" /> إنشاء قالب جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">اسم القالب <span className="text-red-500">*</span></Label>
              <Input value={newData.name} onChange={e => setNewData(d => ({ ...d, name: e.target.value }))} placeholder="مثال: بريد ترحيب الوسطاء العقاريين" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">المعرّف (Slug) <span className="text-red-500">*</span></Label>
              <Input dir="ltr" value={newData.slug} onChange={e => setNewData(d => ({ ...d, slug: e.target.value }))} placeholder="provider-welcome" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">موضوع الرسالة</Label>
              <Input value={newData.subject} onChange={e => setNewData(d => ({ ...d, subject: e.target.value }))} placeholder="مرحباً بك في {{siteName}}" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">التصنيف</Label>
              <select value={newData.category} onChange={e => setNewData(d => ({ ...d, category: e.target.value }))} className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background">
                {CATEGORIES.filter(c => c.key !== "all").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">القنوات</Label>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_CONFIG.map(ch => {
                  const Icon = ch.icon;
                  const on = newData.channels.includes(ch.key);
                  return (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => setNewData(d => ({ ...d, channels: on ? d.channels.filter(c => c !== ch.key) : [...d.channels, ch.key] }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${on ? "bg-teal-600 text-white border-teal-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                    >
                      <Icon className="w-3 h-3" /> {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setNewModal(false)}>إلغاء</Button>
            <Button onClick={handleCreateNew} className="bg-teal-600 hover:bg-teal-700">إنشاء القالب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-600" /> استيراد القوالب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">الصق محتوى ملف JSON المُصدَّر من هذا النظام. سيتم تحديث القوالب الموجودة وإضافة الجديدة.</p>
            <textarea
              dir="ltr"
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              rows={12}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none bg-slate-50"
              placeholder='{"templates": [...]} or [{"name": "...", ...}]'
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportJson(""); }}>إلغاء</Button>
            <Button onClick={handleImport} disabled={!importJson.trim()} className="bg-teal-600 hover:bg-teal-700">استيراد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف قالب "<strong>{deleteTarget?.name}</strong>"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">حذف نهائياً</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AdminLayout>
  );
}
