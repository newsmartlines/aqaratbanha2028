import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Eye, Send, RefreshCw, Mail, Settings, FileText, ClipboardList, Sparkles, CheckCircle2, XCircle, Clock, AlertCircle, TestTube2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

// ─────────────────────────────── types ───────────────────────────────────────

type EmailTemplate = {
  id: number;
  name: string;
  slug: string;
  subject: string;
  htmlBody: string;
  category: string;
  variables: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type EmailLog = {
  id: number;
  templateId: string | null;
  templateName: string | null;
  toEmail: string;
  toName: string | null;
  subject: string;
  status: string;
  error: string | null;
  sentAt: string;
};

type SmtpConfig = {
  smtpHost: string;
  smtpPort: string;
  smtpSecure: string;
  smtpUser: string;
  smtpFromName: string;
  smtpFromEmail: string;
};

// ─────────────────────────────── constants ────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  welcome:      { label: "ترحيب",        color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  reset:        { label: "إعادة كلمة المرور", color: "bg-amber-100 text-amber-700 border-amber-200" },
  order:        { label: "تأكيد طلب",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  subscription: { label: "اشتراك",       color: "bg-purple-100 text-purple-700 border-purple-200" },
  notification: { label: "إشعار عام",    color: "bg-slate-100 text-slate-700 border-slate-200" },
  custom:       { label: "مخصص",         color: "bg-teal-100 text-teal-700 border-teal-200" },
};

const STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sent:    { label: "تم الإرسال", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  failed:  { label: "فشل",        color: "bg-red-100 text-red-700",         icon: <XCircle className="w-3.5 h-3.5" /> },
  preview: { label: "معاينة فقط", color: "bg-slate-100 text-slate-600",     icon: <Eye className="w-3.5 h-3.5" /> },
  pending: { label: "في الانتظار",color: "bg-amber-100 text-amber-700",      icon: <Clock className="w-3.5 h-3.5" /> },
};

const emptyTemplate = { name: "", slug: "", subject: "", htmlBody: "", category: "custom", variables: "[]", isActive: true };
const emptySmtp: SmtpConfig = { smtpHost: "", smtpPort: "587", smtpSecure: "false", smtpUser: "", smtpFromName: "", smtpFromEmail: "" };

// ─────────────────────────────── component ───────────────────────────────────

export default function AdminEmailTemplates() {
  const qc = useQueryClient();
  const { formatDateTime } = useLanguage();

  // Template modal state
  const [tplModal, setTplModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Partial<EmailTemplate> }>({ open: false, mode: "add", data: emptyTemplate });
  // Preview state
  const [previewModal, setPreviewModal] = useState<{ open: boolean; html: string; subject: string }>({ open: false, html: "", subject: "" });
  // Delete target
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  // Compose form
  const [compose, setCompose] = useState({ templateId: "", toEmail: "", toName: "", customVars: "{}" });
  const [composeSending, setComposeSending] = useState(false);
  const [composePreviewHtml, setComposePreviewHtml] = useState("");
  // SMTP form
  const [smtp, setSmtp] = useState<SmtpConfig>(emptySmtp);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

  // ── queries ────────────────────────────────────────────────────────────────

  const { data: templates = [], isLoading: tplLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates"],
    queryFn: () => api.fetchJson("/admin/email/templates"),
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ["email-logs"],
    queryFn: () => api.fetchJson("/admin/email/logs"),
  });

  const { data: smtpData } = useQuery<SmtpConfig>({
    queryKey: ["email-smtp"],
    queryFn: () => api.fetchJson<SmtpConfig>("/admin/email/smtp"),
  });

  useEffect(() => {
    if (smtpData) setSmtp(smtpData);
  }, [smtpData]);

  // ── mutations ──────────────────────────────────────────────────────────────

  const createTpl = useMutation({
    mutationFn: (d: typeof emptyTemplate) => api.fetchJson("/admin/email/templates", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-templates"] }); toast.success("تمت إضافة القالب"); setTplModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTpl = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<EmailTemplate> }) => api.fetchJson(`/admin/email/templates/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-templates"] }); toast.success("تم تحديث القالب"); setTplModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTpl = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/admin/email/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-templates"] }); toast.success("تم حذف القالب"); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLog = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/admin/email/logs/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-logs"] }),
  });

  // ── handlers ──────────────────────────────────────────────────────────────

  const submitTemplate = () => {
    const d = tplModal.data as typeof emptyTemplate;
    if (!d.name || !d.slug || !d.subject || !d.htmlBody) { toast.error("يرجى تعبئة جميع الحقول المطلوبة"); return; }
    if (tplModal.mode === "add") createTpl.mutate(d);
    else updateTpl.mutate({ id: (tplModal.data as EmailTemplate).id, d });
  };

  const handlePreview = async (tpl: EmailTemplate) => {
    try {
      const res = await api.fetchJson<{ html: string; subject: string }>(`/admin/email/templates/${tpl.id}/preview`, { method: "POST", body: JSON.stringify({
        userName: "أحمد محمد", orderNumber: "1234", serviceName: "تنظيف المنزل",
        providerName: "شركة النظافة", orderDate: new Date().toLocaleDateString("ar"), amount: "150",
        planName: "باقة البرونز", startDate: new Date().toLocaleDateString("ar"),
        endDate: new Date(Date.now()+30*864e5).toLocaleDateString("ar"), price: "99",
        resetLink: "#", notificationTitle: "إشعار تجريبي", notificationBody: "هذا إشعار تجريبي لمعاينة القالب.",
        actionLink: "#", actionText: "عرض التفاصيل",
      }) });
      setPreviewModal({ open: true, html: res.html, subject: res.subject });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleComposeSend = async () => {
    if (!compose.toEmail) { toast.error("أدخل البريد الإلكتروني المستلم"); return; }
    if (!compose.templateId) { toast.error("اختر قالباً"); return; }
    setComposeSending(true);
    try {
      let extraVars = {};
      try { extraVars = JSON.parse(compose.customVars || "{}"); } catch {}
      const result = await api.fetchJson<{ configured: boolean }>("/admin/email/send", { method: "POST", body: JSON.stringify({
        templateId: Number(compose.templateId),
        toEmail: compose.toEmail,
        toName: compose.toName || undefined,
        extraVars,
      }) });
      if (result.configured) toast.success("تم إرسال البريد بنجاح ✅");
      else toast.success("تم حفظ البريد (SMTP غير مُفعّل — معاينة فقط)");
      qc.invalidateQueries({ queryKey: ["email-logs"] });
      setCompose({ templateId: "", toEmail: "", toName: "", customVars: "{}" });
      setComposePreviewHtml("");
    } catch (e: any) { toast.error(e.message); }
    finally { setComposeSending(false); }
  };

  const handleComposePreview = async () => {
    if (!compose.templateId) { toast.error("اختر قالباً أولاً"); return; }
    try {
      let extraVars = {};
      try { extraVars = JSON.parse(compose.customVars || "{}"); } catch {}
      const res = await api.fetchJson<{ html: string }>(`/admin/email/templates/${compose.templateId}/preview`, { method: "POST", body: JSON.stringify(extraVars) });
      setComposePreviewHtml(res.html);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSmtpSave = async () => {
    setSmtpSaving(true);
    try {
      await api.fetchJson("/admin/email/smtp", { method: "PUT", body: JSON.stringify({ ...smtp, ...(smtpPassword ? { smtpPass: smtpPassword } : {}) }) });
      toast.success("تم حفظ إعدادات SMTP");
      qc.invalidateQueries({ queryKey: ["email-smtp"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSmtpSaving(false); }
  };

  const handleSmtpTest = async () => {
    setSmtpTesting(true);
    try {
      const res = await api.fetchJson<{ success: boolean; message?: string; error?: string }>("/admin/email/smtp/test", { method: "POST" });
      if (res.success || res.message) toast.success("✅ الاتصال بـ SMTP ناجح!");
      else toast.error(res.error ?? "فشل الاتصال");
    } catch (e: any) { toast.error(e.message); }
    finally { setSmtpTesting(false); }
  };

  const handleSeedTemplates = async () => {
    setSeedLoading(true);
    try {
      const res = await api.fetchJson<{ added: number }>("/admin/email/seed", { method: "POST" });
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success(`تمت إضافة ${res.added ?? 0} قالب افتراضي`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSeedLoading(false); }
  };

  const selectedTemplate = templates.find(t => String(t.id) === compose.templateId);

  const smtpConfigured = !!(smtp.smtpHost && smtp.smtpUser);

  return (
    <AdminLayout title="نظام البريد الإلكتروني">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">نظام البريد الإلكتروني</h2>
            <p className="text-sm text-slate-500">إدارة القوالب وإرسال الرسائل وعرض سجل الإرسال</p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Badge variant="outline" className={smtpConfigured ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-amber-300 text-amber-700 bg-amber-50"}>
              {smtpConfigured ? <><CheckCircle2 className="w-3 h-3 me-1" /> SMTP مُفعّل</> : <><AlertCircle className="w-3 h-3 me-1" /> SMTP غير مُفعّل</>}
            </Badge>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "إجمالي القوالب", value: templates.length, icon: FileText, color: "text-teal-600", bg: "bg-teal-50" },
            { label: "القوالب المفعّلة", value: templates.filter(t => t.isActive).length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "إجمالي الإرسال", value: logs.length, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "ناجح", value: logs.filter(l => l.status === "sent").length, icon: Mail, color: "text-purple-600", bg: "bg-purple-50" },
          ].map(s => (
            <Card key={s.label} className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="templates">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="templates" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" /> القوالب
            </TabsTrigger>
            <TabsTrigger value="compose" className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> إرسال
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> السجل
            </TabsTrigger>
            <TabsTrigger value="smtp" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" /> SMTP
            </TabsTrigger>
          </TabsList>

          {/* ── Templates tab ────────────────────────────────── */}
          <TabsContent value="templates" className="mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>قوالب البريد</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{templates.length} قالب</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["email-templates"] })}>
                    <RefreshCw className="w-3.5 h-3.5 me-1" /> تحديث
                  </Button>
                  {templates.length === 0 && (
                    <Button variant="outline" size="sm" onClick={handleSeedTemplates} disabled={seedLoading} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                      {seedLoading ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 me-1" />}
                      إضافة القوالب الافتراضية
                    </Button>
                  )}
                  <Button onClick={() => setTplModal({ open: true, mode: "add", data: { ...emptyTemplate } })} className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-4 h-4 me-2" /> قالب جديد
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tplLoading ? (
                  <div className="flex justify-center h-32 items-center"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-16">
                    <Mail className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">لا توجد قوالب بريد بعد</p>
                    <p className="text-sm text-slate-400 mt-1 mb-4">أضف قوالب يدوياً أو استخدم القوالب الجاهزة</p>
                    <Button onClick={handleSeedTemplates} disabled={seedLoading} className="bg-teal-600 hover:bg-teal-700">
                      {seedLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Sparkles className="w-4 h-4 me-2" />}
                      إضافة القوالب الافتراضية
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>اسم القالب</TableHead>
                          <TableHead>التصنيف</TableHead>
                          <TableHead>الموضوع</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="text-end">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map(tpl => {
                          const cat = CATEGORY_LABELS[tpl.category] ?? CATEGORY_LABELS.custom;
                          return (
                            <TableRow key={tpl.id} className="hover:bg-slate-50/60">
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-slate-800 text-sm">{tpl.name}</p>
                                  <p className="text-xs text-slate-400 font-mono">{tpl.slug}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cat.color}`}>
                                  {cat.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600 max-w-xs truncate">{tpl.subject}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={tpl.isActive}
                                    onCheckedChange={(v) => updateTpl.mutate({ id: tpl.id, d: { isActive: v } })}
                                    className="scale-75"
                                  />
                                  <span className={`text-xs ${tpl.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                                    {tpl.isActive ? "مفعّل" : "معطّل"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-end">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handlePreview(tpl)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0" title="معاينة">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setTplModal({ open: true, mode: "edit", data: { ...tpl } })} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-8 w-8 p-0" title="تعديل">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: tpl.id, name: tpl.name })} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0" title="حذف">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Compose tab ──────────────────────────────────── */}
          <TabsContent value="compose" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">إرسال بريد إلكتروني</CardTitle>
                  {!smtpConfigured && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                      ⚠️ SMTP غير مُفعّل — سيتم حفظ البريد كمعاينة فقط. اضبط SMTP من تبويب الإعدادات.
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>القالب <span className="text-red-500">*</span></Label>
                    <select
                      className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background"
                      value={compose.templateId}
                      onChange={e => { setCompose(c => ({ ...c, templateId: e.target.value })); setComposePreviewHtml(""); }}
                    >
                      <option value="">-- اختر قالباً --</option>
                      {templates.filter(t => t.isActive).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>البريد المستلم <span className="text-red-500">*</span></Label>
                      <Input dir="ltr" type="email" placeholder="example@email.com" value={compose.toEmail} onChange={e => setCompose(c => ({ ...c, toEmail: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>اسم المستلم</Label>
                      <Input placeholder="الاسم (اختياري)" value={compose.toName} onChange={e => setCompose(c => ({ ...c, toName: e.target.value }))} />
                    </div>
                  </div>
                  {selectedTemplate && (
                    <div className="space-y-1.5">
                      <Label>المتغيرات (JSON)</Label>
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 mb-2">
                        <p className="text-xs text-slate-500 mb-1">المتغيرات المتاحة في هذا القالب:</p>
                        <div className="flex flex-wrap gap-1">
                          {(JSON.parse(selectedTemplate.variables || "[]") as string[]).map(v => (
                            <code key={v} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded">{`{{${v}}}`}</code>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        dir="ltr"
                        rows={4}
                        className="font-mono text-xs"
                        placeholder='{"userName": "أحمد", "orderNumber": "1234"}'
                        value={compose.customVars}
                        onChange={e => setCompose(c => ({ ...c, customVars: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={handleComposePreview} disabled={!compose.templateId} className="flex-1">
                      <Eye className="w-4 h-4 me-2" /> معاينة
                    </Button>
                    <Button onClick={handleComposeSend} disabled={composeSending} className="flex-1 bg-teal-600 hover:bg-teal-700">
                      {composeSending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Send className="w-4 h-4 me-2" />}
                      إرسال
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Preview panel */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-slate-100">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" /> معاينة البريد
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {composePreviewHtml ? (
                    <iframe
                      srcDoc={composePreviewHtml}
                      className="w-full border-0"
                      style={{ height: "480px" }}
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <Mail className="w-10 h-10 mb-2 opacity-30" />
                      <p className="text-sm">اختر قالباً واضغط "معاينة" لعرضه هنا</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Logs tab ─────────────────────────────────────── */}
          <TabsContent value="logs" className="mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>سجل الإرسال</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{logs.length} رسالة</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["email-logs"] })}>
                  <RefreshCw className="w-3.5 h-3.5 me-1" /> تحديث
                </Button>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center h-32 items-center"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد رسائل مُرسلة بعد</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>المستلم</TableHead>
                          <TableHead>الموضوع</TableHead>
                          <TableHead>القالب</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map(log => {
                          const st = STATUS_STYLES[log.status] ?? STATUS_STYLES.pending;
                          return (
                            <TableRow key={log.id} className="hover:bg-slate-50/60">
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium text-slate-800 dir-ltr" dir="ltr">{log.toEmail}</p>
                                  {log.toName && <p className="text-xs text-slate-400">{log.toName}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600 max-w-xs truncate">{log.subject}</TableCell>
                              <TableCell>
                                {log.templateName ? (
                                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{log.templateName}</span>
                                ) : <span className="text-slate-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                                  {st.icon} {st.label}
                                </span>
                                {log.error && <p className="text-xs text-red-400 mt-0.5 max-w-xs truncate" title={log.error}>{log.error}</p>}
                              </TableCell>
                              <TableCell className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(log.sentAt)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => deleteLog.mutate(log.id)} className="text-slate-400 hover:text-red-500 h-7 w-7 p-0">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SMTP tab ─────────────────────────────────────── */}
          <TabsContent value="smtp" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4 text-teal-600" /> إعدادات SMTP
                  </CardTitle>
                  <p className="text-sm text-slate-500">اضبط بيانات خادم البريد لإرسال الرسائل فعلياً</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>خادم SMTP (Host)</Label>
                      <Input dir="ltr" placeholder="smtp.gmail.com" value={smtp.smtpHost} onChange={e => setSmtp(s => ({ ...s, smtpHost: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>المنفذ (Port)</Label>
                      <Input dir="ltr" type="number" placeholder="587" value={smtp.smtpPort} onChange={e => setSmtp(s => ({ ...s, smtpPort: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Switch
                      checked={smtp.smtpSecure === "true"}
                      onCheckedChange={v => setSmtp(s => ({ ...s, smtpSecure: v ? "true" : "false" }))}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">اتصال آمن (SSL/TLS)</p>
                      <p className="text-xs text-slate-400">فعّل للمنفذ 465، أبقِ معطّلاً للمنفذ 587</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>اسم المستخدم / البريد</Label>
                    <Input dir="ltr" type="email" placeholder="noreply@yoursite.com" value={smtp.smtpUser} onChange={e => setSmtp(s => ({ ...s, smtpUser: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>كلمة المرور</Label>
                    <Input dir="ltr" type="password" placeholder="••••••••" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} />
                    <p className="text-xs text-slate-400">اتركه فارغاً للإبقاء على كلمة المرور الحالية</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>اسم المُرسِل</Label>
                      <Input placeholder="دليل بلس" value={smtp.smtpFromName} onChange={e => setSmtp(s => ({ ...s, smtpFromName: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>بريد المُرسِل</Label>
                      <Input dir="ltr" type="email" placeholder="noreply@example.com" value={smtp.smtpFromEmail} onChange={e => setSmtp(s => ({ ...s, smtpFromEmail: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={handleSmtpTest} disabled={smtpTesting} className="flex-1">
                      {smtpTesting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <TestTube2 className="w-4 h-4 me-2" />}
                      اختبار الاتصال
                    </Button>
                    <Button onClick={handleSmtpSave} disabled={smtpSaving} className="flex-1 bg-teal-600 hover:bg-teal-700">
                      {smtpSaving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                      حفظ الإعدادات
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* SMTP guide */}
              <Card className="border-slate-200 shadow-sm bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-700">📋 دليل سريع لإعداد SMTP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-800 mb-2">Gmail</p>
                    <div className="bg-white rounded-lg border p-3 font-mono text-xs space-y-1">
                      <p>Host: smtp.gmail.com</p>
                      <p>Port: 587 (TLS) / 465 (SSL)</p>
                      <p>User: your@gmail.com</p>
                      <p className="text-slate-400">* استخدم App Password من إعدادات جوجل</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-2">Outlook / Hotmail</p>
                    <div className="bg-white rounded-lg border p-3 font-mono text-xs space-y-1">
                      <p>Host: smtp.office365.com</p>
                      <p>Port: 587</p>
                      <p>User: your@outlook.com</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-2">Brevo / SendGrid</p>
                    <div className="bg-white rounded-lg border p-3 font-mono text-xs space-y-1">
                      <p>Host: smtp-relay.brevo.com</p>
                      <p>Port: 587</p>
                      <p className="text-slate-400">* استخدم API Key ككلمة مرور</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Template Editor Modal ──────────────────────────── */}
      <Dialog open={tplModal.open} onOpenChange={o => setTplModal(m => ({ ...m, open: o }))}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{tplModal.mode === "add" ? "إضافة قالب بريد" : "تعديل القالب"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>اسم القالب <span className="text-red-500">*</span></Label>
                <Input placeholder="مثال: رسالة ترحيب" value={tplModal.data.name ?? ""} onChange={e => setTplModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label>المعرّف (Slug) <span className="text-red-500">*</span></Label>
                <Input dir="ltr" placeholder="welcome-email" value={tplModal.data.slug ?? ""} onChange={e => setTplModal(m => ({ ...m, data: { ...m.data, slug: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>موضوع الرسالة <span className="text-red-500">*</span></Label>
                <Input placeholder="مرحباً بك في {{siteName}}" value={tplModal.data.subject ?? ""} onChange={e => setTplModal(m => ({ ...m, data: { ...m.data, subject: e.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label>التصنيف</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={tplModal.data.category ?? "custom"} onChange={e => setTplModal(m => ({ ...m, data: { ...m.data, category: e.target.value } }))}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>المتغيرات (أسماء مفصولة بفاصلة)</Label>
              <Input
                dir="ltr"
                placeholder="siteName,userName,resetLink"
                value={(JSON.parse(tplModal.data.variables ?? "[]") as string[]).join(",")}
                onChange={e => {
                  const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                  setTplModal(m => ({ ...m, data: { ...m.data, variables: JSON.stringify(arr) } }));
                }}
              />
              <p className="text-xs text-slate-400">استخدم <code className="bg-slate-100 px-1 rounded">{"{{variableName}}"}</code> في محتوى الرسالة للإشارة إلى المتغيرات</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>محتوى الرسالة (HTML) <span className="text-red-500">*</span></Label>
                <span className="text-xs text-slate-400">{(tplModal.data.htmlBody ?? "").length} حرف</span>
              </div>
              <Textarea
                dir="ltr"
                rows={16}
                className="font-mono text-xs leading-relaxed"
                placeholder="<!DOCTYPE html>..."
                value={tplModal.data.htmlBody ?? ""}
                onChange={e => setTplModal(m => ({ ...m, data: { ...m.data, htmlBody: e.target.value } }))}
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <Switch
                checked={tplModal.data.isActive !== false}
                onCheckedChange={v => setTplModal(m => ({ ...m, data: { ...m.data, isActive: v } }))}
              />
              <Label className="cursor-pointer">تفعيل القالب</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTplModal(m => ({ ...m, open: false }))}>إلغاء</Button>
            <Button onClick={submitTemplate} disabled={createTpl.isPending || updateTpl.isPending} className="bg-teal-600 hover:bg-teal-700">
              {(createTpl.isPending || updateTpl.isPending) && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {tplModal.mode === "add" ? "إضافة القالب" : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Modal ─────────────────────────────────── */}
      <Dialog open={previewModal.open} onOpenChange={o => setPreviewModal(m => ({ ...m, open: o }))}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
            <div>
              <p className="font-semibold text-slate-800 text-sm">معاينة القالب</p>
              <p className="text-xs text-slate-500 mt-0.5">{previewModal.subject}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreviewModal(m => ({ ...m, open: false }))} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <iframe
            srcDoc={previewModal.html}
            className="w-full border-0"
            style={{ height: "600px" }}
            title="Email Template Preview"
            sandbox="allow-same-origin"
          />
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف قالب <strong>"{deleteTarget?.name}"</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteTarget && deleteTpl.mutate(deleteTarget.id)}>
              {deleteTpl.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
