import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, Trash2, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

type Report = {
  id: number;
  propertyId: number;
  email: string;
  message: string;
  status: string;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function AdminComplaints() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["admin-property-reports"],
    queryFn: () => fetch("/api/admin/property-reports", { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const reviewMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/property-reports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "reviewed" }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-property-reports"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/property-reports/${id}`, { method: "DELETE", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-property-reports"] }),
  });

  const pending = reports.filter((r) => r.status === "pending");
  const reviewed = reports.filter((r) => r.status === "reviewed");

  return (
    <AdminLayout title="البلاغات">
      <div className="space-y-6" dir="rtl">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center">
              <Flag className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{reports.length}</p>
              <p className="text-xs text-gray-400">إجمالي البلاغات</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{pending.length}</p>
              <p className="text-xs text-gray-400">بانتظار المراجعة</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{reviewed.length}</p>
              <p className="text-xs text-gray-400">تمت المراجعة</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-500" />
              قائمة البلاغات
            </h2>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">جاري التحميل...</div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Flag className="w-10 h-10 text-gray-200" />
              <p className="text-sm">لا توجد بلاغات حتى الآن</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reports.map((r) => (
                <div key={r.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Flag className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{r.email}</span>
                      <Badge variant={r.status === "pending" ? "destructive" : "outline"} className="text-[10px]">
                        {r.status === "pending" ? "جديد" : "تمت المراجعة"}
                      </Badge>
                      <span className="text-[11px] text-gray-400">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{r.message}</p>
                    <button
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={() => setLocation(`/property/${r.propertyId}`)}
                    >
                      <ExternalLink className="w-3 h-3" />
                      عرض العقار #{r.propertyId}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === "pending" && (
                      <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => reviewMut.mutate(r.id)} disabled={reviewMut.isPending}>
                        <CheckCircle className="w-3.5 h-3.5 ml-1" />
                        تمت المراجعة
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 text-rose-500 border-rose-200 hover:bg-rose-50"
                      onClick={() => deleteMut.mutate(r.id)} disabled={deleteMut.isPending}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
