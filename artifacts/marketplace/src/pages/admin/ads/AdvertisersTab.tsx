/**
 * AdvertisersTab — Advertiser accounts with campaigns, invoices, approval workflow
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, Loader2, Building2,
  Mail, Phone, Globe, DollarSign, FileText, BarChart2
} from "lucide-react";
import toast from "react-hot-toast";

interface Advertiser {
  id: number; name: string; email: string; phone?: string | null;
  company?: string | null; website?: string | null; status: string;
  balance: string; notes?: string | null; createdAt: string;
}

interface Campaign {
  id: number; advertiserId: number; name: string; description?: string | null;
  budget: string; spent: string; status: string;
  startDate?: string | null; endDate?: string | null; createdAt: string;
}

interface Invoice {
  id: number; advertiserId: number; campaignId?: number | null;
  invoiceNo: string; amount: string; currency: string;
  status: string; dueDate?: string | null; paidAt?: string | null;
  notes?: string | null; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
  rejected: "bg-slate-100 text-slate-500",
  draft: "bg-slate-100 text-slate-500",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "في الانتظار", active: "نشط", suspended: "موقوف", rejected: "مرفوض",
  draft: "مسودة", paused: "متوقف", completed: "مكتمل", cancelled: "ملغى",
  paid: "مدفوع", overdue: "متأخر",
};

const EMPTY_ADV: Partial<Advertiser> = {
  name: "", email: "", phone: "", company: "", website: "", status: "pending", notes: "",
};
const EMPTY_CAMP: Partial<Campaign> = {
  name: "", description: "", budget: "0", status: "draft",
  startDate: "", endDate: "",
};
const EMPTY_INV: Partial<Invoice> = {
  amount: "", currency: "EGP", dueDate: "", notes: "",
};

export function AdvertisersTab() {
  const qc = useQueryClient();
  const [selectedAdv, setSelectedAdv] = useState<Advertiser | null>(null);
  const [editAdv, setEditAdv] = useState<Partial<Advertiser> | null>(null);
  const [isNewAdv, setIsNewAdv] = useState(false);
  const [editCamp, setEditCamp] = useState<Partial<Campaign> | null>(null);
  const [isNewCamp, setIsNewCamp] = useState(false);
  const [editInv, setEditInv] = useState<Partial<Invoice> | null>(null);
  const [isNewInv, setIsNewInv] = useState(false);
  const [tab, setTab] = useState<"ads" | "campaigns" | "invoices">("ads");

  /* ── Queries ── */
  const { data: advertisers = [], isFetching: loadingAdvs } = useQuery<Advertiser[]>({
    queryKey: ["admin-advertisers"],
    queryFn: async () => (await fetch("/api/admin/advertisers", { credentials: "include" })).json().then(r => r.data ?? []),
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["admin-campaigns", selectedAdv?.id],
    queryFn: async () => (await fetch(`/api/admin/campaigns${selectedAdv ? `?advertiserId=${selectedAdv.id}` : ""}`, { credentials: "include" })).json().then(r => r.data ?? []),
    enabled: !!selectedAdv,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["admin-invoices"],
    queryFn: async () => (await fetch("/api/admin/invoices", { credentials: "include" })).json().then(r => r.data ?? []),
    enabled: !!selectedAdv,
  });

  /* ── Mutations ── */
  const saveAdv = useMutation({
    mutationFn: async (body: Partial<Advertiser>) => {
      const url = isNewAdv ? "/api/admin/advertisers" : `/api/admin/advertisers/${body.id}`;
      const r = await fetch(url, { method: isNewAdv ? "POST" : "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-advertisers"] }); setEditAdv(null); toast.success(isNewAdv ? "تم إنشاء المعلن" : "تم الحفظ"); },
    onError: () => toast.error("فشل الحفظ"),
  });

  const approveAdv = useMutation({
    mutationFn: async (id: number) => (await fetch(`/api/admin/advertisers/${id}/approve`, { method: "PATCH", credentials: "include" })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-advertisers"] }); toast.success("تم قبول المعلن"); },
  });

  const suspendAdv = useMutation({
    mutationFn: async (id: number) => (await fetch(`/api/admin/advertisers/${id}/suspend`, { method: "PATCH", credentials: "include" })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-advertisers"] }); toast.success("تم تعليق المعلن"); },
  });

  const deleteAdv = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/admin/advertisers/${id}`, { method: "DELETE", credentials: "include" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-advertisers"] }); setSelectedAdv(null); toast.success("تم الحذف"); },
  });

  const saveCamp = useMutation({
    mutationFn: async (body: Partial<Campaign>) => {
      const url = isNewCamp ? "/api/admin/campaigns" : `/api/admin/campaigns/${body.id}`;
      const r = await fetch(url, { method: isNewCamp ? "POST" : "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, advertiserId: selectedAdv?.id }) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-campaigns", selectedAdv?.id] }); setEditCamp(null); toast.success("تم الحفظ"); },
  });

  const deleteCamp = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE", credentials: "include" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-campaigns", selectedAdv?.id] }),
  });

  const saveInv = useMutation({
    mutationFn: async (body: Partial<Invoice>) => {
      const r = await fetch("/api/admin/invoices", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, advertiserId: selectedAdv?.id }) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-invoices"] }); setEditInv(null); toast.success("تم إنشاء الفاتورة"); },
  });

  const payInv = useMutation({
    mutationFn: async (id: number) => (await fetch(`/api/admin/invoices/${id}/pay`, { method: "PATCH", credentials: "include" })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-invoices"] }); qc.invalidateQueries({ queryKey: ["admin-advertisers"] }); toast.success("تم تسجيل الدفع"); },
  });

  const advInvoices = invoices.filter(i => i.advertiserId === selectedAdv?.id);
  const advCampaigns = campaigns;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Advertiser List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">المعلنون ({advertisers.length})</h3>
          <Button size="sm" onClick={() => { setIsNewAdv(true); setEditAdv({ ...EMPTY_ADV }); }} className="gap-1 rounded-xl">
            <Plus className="w-3.5 h-3.5" /> جديد
          </Button>
        </div>

        {loadingAdvs ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : advertisers.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">لا يوجد معلنون بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {advertisers.map(adv => (
              <div key={adv.id}
                onClick={() => { setSelectedAdv(adv); setTab("campaigns"); }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedAdv?.id === adv.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{adv.name}</p>
                    <p className="text-xs text-slate-500 truncate">{adv.company || adv.email}</p>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[adv.status] || "bg-slate-100"}`}>
                    {STATUS_LABELS[adv.status] || adv.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {adv.status === "pending" && (
                    <button onClick={e => { e.stopPropagation(); approveAdv.mutate(adv.id); }}
                      className="text-xs text-emerald-600 font-medium hover:underline">
                      ✓ قبول
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setIsNewAdv(false); setEditAdv({ ...adv }); }}
                    className="text-xs text-primary font-medium hover:underline">تعديل</button>
                  <button onClick={e => { e.stopPropagation(); if (confirm("حذف المعلن؟")) deleteAdv.mutate(adv.id); }}
                    className="text-xs text-red-500 font-medium hover:underline">حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Detail Panel */}
      <div className="lg:col-span-2">
        {!selectedAdv ? (
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-2xl">
            <div className="text-center">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">اختر معلناً من القائمة</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Advertiser header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-xl text-slate-900">{selectedAdv.name}</h3>
                  {selectedAdv.company && <p className="text-slate-500 text-sm">{selectedAdv.company}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                    {selectedAdv.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedAdv.email}</span>}
                    {selectedAdv.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedAdv.phone}</span>}
                    {selectedAdv.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{selectedAdv.website}</span>}
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-xs text-slate-400">الرصيد</p>
                  <p className="text-2xl font-black text-emerald-600">{parseFloat(selectedAdv.balance || "0").toLocaleString("ar-EG")} ج.م</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={STATUS_COLORS[selectedAdv.status] || "bg-slate-100"}>
                  {STATUS_LABELS[selectedAdv.status] || selectedAdv.status}
                </Badge>
                {selectedAdv.status === "pending" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs rounded-full gap-1 border-emerald-200 text-emerald-600"
                    onClick={() => approveAdv.mutate(selectedAdv.id)}>
                    <CheckCircle2 className="w-3 h-3" /> قبول
                  </Button>
                )}
                {selectedAdv.status === "active" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs rounded-full gap-1 border-red-200 text-red-500"
                    onClick={() => suspendAdv.mutate(selectedAdv.id)}>
                    <XCircle className="w-3 h-3" /> تعليق
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { key: "campaigns", label: "الحملات", count: advCampaigns.length },
                { key: "invoices",  label: "الفواتير", count: advInvoices.length },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                    tab === t.key ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-slate-200"}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Campaigns */}
            {tab === "campaigns" && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => { setIsNewCamp(true); setEditCamp({ ...EMPTY_CAMP }); }} className="gap-1 rounded-xl">
                    <Plus className="w-3.5 h-3.5" /> حملة جديدة
                  </Button>
                </div>
                {advCampaigns.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-2xl text-sm">لا توجد حملات بعد</p>
                ) : (
                  advCampaigns.map(c => (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">{c.name}</p>
                          {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                          <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            <span>الميزانية: <strong>{parseFloat(c.budget).toLocaleString("ar-EG")} ج.م</strong></span>
                            <span>المنفق: <strong>{parseFloat(c.spent).toLocaleString("ar-EG")} ج.م</strong></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] ${STATUS_COLORS[c.status] || "bg-slate-100"}`}>
                            {STATUS_LABELS[c.status] || c.status}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => { setIsNewCamp(false); setEditCamp({ ...c }); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400"
                            onClick={() => { if (confirm("حذف الحملة؟")) deleteCamp.mutate(c.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Invoices */}
            {tab === "invoices" && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => { setIsNewInv(true); setEditInv({ ...EMPTY_INV }); }} className="gap-1 rounded-xl">
                    <Plus className="w-3.5 h-3.5" /> فاتورة جديدة
                  </Button>
                </div>
                {advInvoices.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-2xl text-sm">لا توجد فواتير بعد</p>
                ) : (
                  advInvoices.map(inv => (
                    <div key={inv.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800 font-mono">{inv.invoiceNo}</p>
                          <p className="text-lg font-black text-slate-900 mt-1">
                            {parseFloat(inv.amount).toLocaleString("ar-EG")} {inv.currency}
                          </p>
                          {inv.dueDate && (
                            <p className="text-xs text-slate-500 mt-1">
                              الاستحقاق: {new Date(inv.dueDate).toLocaleDateString("ar-EG")}
                            </p>
                          )}
                          {inv.notes && <p className="text-xs text-slate-400 mt-1">{inv.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge className={`text-[10px] ${STATUS_COLORS[inv.status] || "bg-slate-100"}`}>
                            {STATUS_LABELS[inv.status] || inv.status}
                          </Badge>
                          {inv.status === "pending" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs rounded-xl gap-1 border-emerald-200 text-emerald-600"
                              onClick={() => payInv.mutate(inv.id)} disabled={payInv.isPending}>
                              <DollarSign className="w-3 h-3" /> تسجيل دفع
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advertiser Edit Dialog */}
      <Dialog open={!!editAdv} onOpenChange={v => !v && setEditAdv(null)}>
        <DialogContent className="max-w-lg bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>{isNewAdv ? "إضافة معلن جديد" : "تعديل بيانات المعلن"}</DialogTitle>
          </DialogHeader>
          {editAdv && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>الاسم *</Label>
                  <Input value={editAdv.name || ""} onChange={e => setEditAdv(p => ({ ...p!, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>البريد الإلكتروني *</Label>
                  <Input type="email" value={editAdv.email || ""} onChange={e => setEditAdv(p => ({ ...p!, email: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الهاتف</Label>
                  <Input value={editAdv.phone || ""} onChange={e => setEditAdv(p => ({ ...p!, phone: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>الشركة</Label>
                  <Input value={editAdv.company || ""} onChange={e => setEditAdv(p => ({ ...p!, company: e.target.value }))} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input value={editAdv.website || ""} onChange={e => setEditAdv(p => ({ ...p!, website: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>الحالة</Label>
                  <Select value={editAdv.status || "pending"} onValueChange={v => setEditAdv(p => ({ ...p!, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">في الانتظار</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="suspended">موقوف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isNewAdv && (
                  <div className="space-y-1.5">
                    <Label>الرصيد (ج.م)</Label>
                    <Input type="number" value={editAdv.balance || "0"} onChange={e => setEditAdv(p => ({ ...p!, balance: e.target.value }))} />
                  </div>
                )}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>ملاحظات</Label>
                  <Textarea value={editAdv.notes || ""} onChange={e => setEditAdv(p => ({ ...p!, notes: e.target.value }))} rows={2} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAdv(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={() => editAdv && saveAdv.mutate(editAdv)} disabled={saveAdv.isPending} className="rounded-xl gap-2">
              {saveAdv.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Edit Dialog */}
      <Dialog open={!!editCamp} onOpenChange={v => !v && setEditCamp(null)}>
        <DialogContent className="max-w-lg bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>{isNewCamp ? "حملة إعلانية جديدة" : "تعديل الحملة"}</DialogTitle>
          </DialogHeader>
          {editCamp && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>اسم الحملة *</Label>
                <Input value={editCamp.name || ""} onChange={e => setEditCamp(p => ({ ...p!, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>الوصف</Label>
                <Textarea value={editCamp.description || ""} onChange={e => setEditCamp(p => ({ ...p!, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>الميزانية (ج.م)</Label>
                  <Input type="number" value={editCamp.budget || "0"} onChange={e => setEditCamp(p => ({ ...p!, budget: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>الحالة</Label>
                  <Select value={editCamp.status || "draft"} onValueChange={v => setEditCamp(p => ({ ...p!, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="pending">في الانتظار</SelectItem>
                      <SelectItem value="active">نشطة</SelectItem>
                      <SelectItem value="paused">متوقفة</SelectItem>
                      <SelectItem value="completed">مكتملة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ البدء</Label>
                  <Input type="date" value={editCamp.startDate?.slice(0, 10) || ""} onChange={e => setEditCamp(p => ({ ...p!, startDate: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ الانتهاء</Label>
                  <Input type="date" value={editCamp.endDate?.slice(0, 10) || ""} onChange={e => setEditCamp(p => ({ ...p!, endDate: e.target.value }))} dir="ltr" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCamp(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={() => editCamp && saveCamp.mutate(editCamp)} disabled={saveCamp.isPending} className="rounded-xl gap-2">
              {saveCamp.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Create Dialog */}
      <Dialog open={!!editInv} onOpenChange={v => !v && setEditInv(null)}>
        <DialogContent className="max-w-md bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
          </DialogHeader>
          {editInv && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>المبلغ *</Label>
                  <Input type="number" value={editInv.amount || ""} onChange={e => setEditInv(p => ({ ...p!, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>العملة</Label>
                  <Select value={editInv.currency || "EGP"} onValueChange={v => setEditInv(p => ({ ...p!, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGP">ج.م (EGP)</SelectItem>
                      <SelectItem value="USD">$ (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>تاريخ الاستحقاق</Label>
                  <Input type="date" value={editInv.dueDate || ""} onChange={e => setEditInv(p => ({ ...p!, dueDate: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>ملاحظات</Label>
                  <Textarea value={editInv.notes || ""} onChange={e => setEditInv(p => ({ ...p!, notes: e.target.value }))} rows={2} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInv(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={() => editInv && saveInv.mutate(editInv)} disabled={saveInv.isPending} className="rounded-xl gap-2">
              {saveInv.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              إنشاء الفاتورة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
