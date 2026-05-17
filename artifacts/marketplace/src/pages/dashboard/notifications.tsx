import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bell, CheckCheck, Trash2, CreditCard, ShieldCheck, Info, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, type Notification } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return `قبل ${d} يوم`;
  const mo = Math.floor(d / 30);
  return `قبل ${mo} شهر`;
}

function iconFor(type: string) {
  switch (type) {
    case "payment":  return <CreditCard className="w-5 h-5 text-emerald-600" />;
    case "success":  return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
    case "warning":  return <AlertCircle className="w-5 h-5 text-amber-600" />;
    case "info":     return <Info className="w-5 h-5 text-sky-600" />;
    default:         return <Sparkles className="w-5 h-5 text-primary" />;
  }
}

export default function ProviderNotifications() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications.list,
    refetchInterval: 60_000,
  });

  const items: Notification[] = useMemo(() => {
    const arr = Array.isArray(data) ? data : ((data as any)?.rows ?? []);
    return arr as Notification[];
  }, [data]);

  const unreadCount = items.filter(n => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id: number) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "تم", description: "تمّ تحديد كل الإشعارات كمقروءة" });
    },
  });

  const removeOne = useMutation({
    mutationFn: (id: number) => api.notifications.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <ProviderLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              الإشعارات
              {unreadCount > 0 && (
                <span className="text-xs font-bold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                  {unreadCount} جديد
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">تابع آخر تحديثات حسابك واشتراكك ودفعاتك.</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-4 h-4" />
              قراءة الكل
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardContent className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-secondary/60 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">لا توجد إشعارات بعد. سيظهر هنا كل ما يخصّ حسابك.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map(n => (
              <Card
                key={n.id}
                className={`border-border/60 transition-colors ${!n.read ? "bg-primary/5 border-primary/20" : ""}`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/40 flex items-center justify-center shrink-0">
                    {iconFor(n.type ?? "info")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm ${!n.read ? "font-bold" : "font-semibold"}`}>{n.title}</h3>
                      <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    {n.message && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.message}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      {n.link && (
                        <Link href={n.link}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                            onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                          >
                            عرض التفاصيل
                          </Button>
                        </Link>
                      )}
                      {!n.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => markRead.mutate(n.id)}
                        >
                          تحديد كمقروء
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => removeOne.mutate(n.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
