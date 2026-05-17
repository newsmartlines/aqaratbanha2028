import { useState } from "react";
import { Search, ChevronDown, ChevronUp, Phone, MessageSquare, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface ProviderRequest {
  id: number;
  message: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  userId: number;
  providerId: number;
  serviceId: number | null;
  userName: string | null;
  userPhone: string | null;
  serviceName: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: "جديد", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  in_progress: { label: "قيد التنفيذ", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  completed: { label: "مكتمل", color: "bg-green-500/10 text-green-600 border-green-200" },
  cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-600 border-red-200" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "new", label: "جديد" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

export default function ProviderOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const providerId = user?.providerId;

  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: requests = [], isLoading, refetch } = useQuery<ProviderRequest[]>({
    queryKey: ["provider-requests", providerId],
    queryFn: () => api.requests.listByProvider(providerId!) as Promise<ProviderRequest[]>,
    enabled: !!providerId,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.requests.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-requests", providerId] });
    },
  });

  const filteredRequests = requests.filter(req => {
    const matchStatus = filter === "all" || req.status === filter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (req.userName ?? "").toLowerCase().includes(q) ||
      (req.serviceName ?? "").toLowerCase().includes(q) ||
      String(req.id).includes(q);
    return matchStatus && matchSearch;
  });

  const getInitials = (name: string | null) => {
    if (!name) return "؟";
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2);
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) return;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  return (
    <ProviderLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">الطلبات</h1>
            <p className="text-muted-foreground mt-1">إدارة طلبات العملاء الواردة والمكتملة</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto overflow-x-auto hide-scrollbar">
            <TabsList className="w-max">
              {FILTER_OPTIONS.map(opt => (
                <TabsTrigger key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.value !== "all" && (
                    <span className="mr-1 text-xs opacity-60">
                      ({requests.filter(r => r.status === opt.value).length})
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="ابحث برقم الطلب، العميل..."
              className="pr-9 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.length > 0 ? (
              filteredRequests.map(req => {
                const statusInfo = STATUS_MAP[req.status] ?? { label: req.status, color: "bg-gray-500/10 text-gray-600 border-gray-200" };
                const isExpanded = expandedId === req.id;

                return (
                  <div key={req.id} className="bg-card border rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div
                      className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    >
                      <Avatar className="w-12 h-12 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                          {getInitials(req.userName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{req.userName ?? "عميل"}</h3>
                          <span className="text-xs text-muted-foreground">(#{req.id})</span>
                        </div>
                        {req.serviceName && (
                          <p className="text-muted-foreground text-sm font-medium">{req.serviceName}</p>
                        )}
                        {req.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{req.message}</p>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 sm:gap-1 mt-2 sm:mt-0">
                        <Badge variant="outline" className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString("ar-SA")}
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center justify-center text-muted-foreground pr-2 shrink-0">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2">
                        <div className="pt-4 border-t mt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3 bg-secondary/30 p-4 rounded-lg">
                            <h4 className="text-sm font-bold text-foreground mb-2">تفاصيل الطلب</h4>
                            {req.message && (
                              <div className="flex items-start gap-2 text-sm">
                                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                <span className="text-foreground">{req.message}</span>
                              </div>
                            )}
                            {req.userPhone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-foreground" dir="ltr">{req.userPhone}</span>
                              </div>
                            )}
                            {req.notes && (
                              <div className="mt-2 pt-2 border-t border-border/40">
                                <p className="text-xs text-muted-foreground font-medium mb-1">ملاحظات:</p>
                                <p className="text-xs text-foreground">{req.notes}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col justify-end gap-2">
                            {req.status === "new" && (
                              <div className="flex gap-2 w-full">
                                <Button
                                  className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg gap-1"
                                  disabled={updateStatus.isPending}
                                  onClick={() => updateStatus.mutate({ id: req.id, status: "in_progress" })}
                                >
                                  {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                  قبول الطلب
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 rounded-lg gap-1"
                                  disabled={updateStatus.isPending}
                                  onClick={() => updateStatus.mutate({ id: req.id, status: "cancelled" })}
                                >
                                  <XCircle className="w-4 h-4" />
                                  رفض الطلب
                                </Button>
                              </div>
                            )}
                            {req.status === "in_progress" && (
                              <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg gap-1"
                                disabled={updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ id: req.id, status: "completed" })}
                              >
                                {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                تحديد كمكتمل
                              </Button>
                            )}
                            {req.userPhone && (
                              <Button
                                variant="ghost"
                                className="w-full rounded-lg text-muted-foreground gap-1"
                                onClick={() => handleWhatsApp(req.userPhone)}
                              >
                                <MessageSquare className="w-4 h-4" />
                                التواصل مع العميل
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-card rounded-xl border border-dashed">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">لا توجد طلبات</h3>
                <p className="text-muted-foreground text-sm mt-1">لم يتم العثور على طلبات تطابق الفلتر الحالي.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
