import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, MessageCircleReply, Plus, Search, Ticket, Timer, Loader2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ProviderLayout from "@/components/ProviderLayout";
import { mapSupportTicketDto } from "@/components/support-tickets/map-dto";
import { StatCard } from "@/components/support-tickets/StatCard";
import { CreateTicketDialog } from "@/components/support-tickets/CreateTicketDialog";
import { TicketsTableSection } from "@/components/support-tickets/TicketsTableSection";
import { TicketDetailDialog } from "@/components/support-tickets/TicketDetailDialog";
import { arStatusFilterLabel } from "@/components/support-tickets/ar-ui";
import type { StatusFilter, SupportTicket, TicketCategory } from "@/components/support-tickets/types";
import { api, type SupportTicketDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;
const FILTERS: StatusFilter[] = ["All", "Replied", "Pending", "Closed"];

export default function ProviderSupportTicketsPage() {
  const { user, loading: authLoading, refetch: refetchAuth } = useAuth();
  const queryClient = useQueryClient();
  const providerId = user?.providerId;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<SupportTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "thread">("overview");

  const {
    data: rawTickets = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupportTicketDto[]>({
    queryKey: ["support-tickets", providerId],
    queryFn: () => api.supportTickets.list(providerId!, user?.id),
    enabled: !!providerId,
    retry: 1,
  });

  useEffect(() => {
    if (isError) void refetchAuth();
  }, [isError, refetchAuth]);

  const tickets = useMemo(() => rawTickets.map(mapSupportTicketDto), [rawTickets]);

  const createMutation = useMutation({
    mutationFn: (payload: { subject: string; category: TicketCategory; message: string }) =>
      api.supportTickets.create(providerId!, payload, user?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support-tickets", providerId] });
      toast.success("تم إرسال التذكرة بنجاح");
      setCreateOpen(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || "تعذر إنشاء التذكرة");
    },
  });

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((x) => x.status === "Pending").length;
    const replied = tickets.filter((x) => x.status === "Replied").length;
    return { total, open, replied };
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const statusOk = statusFilter === "All" || t.status === statusFilter;
      const searchOk =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [tickets, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const openDetail = useCallback((ticket: SupportTicket, tab: "overview" | "thread") => {
    setDetailTicket(ticket);
    setDetailTab(tab);
    setDetailOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(
    async (payload: { subject: string; category: TicketCategory; message: string }) => {
      await createMutation.mutateAsync(payload);
    },
    [createMutation]
  );

  if (authLoading) {
    return (
      <ProviderLayout>
        <div className="flex min-h-[40vh] items-center justify-center" dir="rtl">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </ProviderLayout>
    );
  }

  if (!user || !providerId) {
    return (
      <ProviderLayout>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center" dir="rtl">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <p className="text-lg font-medium text-slate-700">يرجى تسجيل الدخول كمقدم خدمة لعرض تذاكر الدعم.</p>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div
        dir="rtl"
        className="relative min-h-[calc(100vh-8rem)] bg-gradient-to-b from-slate-50 via-white to-cyan-50/20 px-4 py-6 text-start sm:px-6 lg:px-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-200/25 via-transparent to-transparent dark:from-sky-900/20" />

        <div className="relative mx-auto max-w-6xl space-y-8">
          {isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <span>{(error as Error)?.message ?? "تعذر تحميل التذاكر من الخادم."}</span>
              <Button type="button" variant="outline" size="sm" className="rounded-xl border-red-300" onClick={() => refetch()}>
                إعادة المحاولة
              </Button>
            </div>
          )}

          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6 border-b border-slate-200/60 pb-8 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200/60 bg-white/70 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm backdrop-blur dark:border-sky-800 dark:bg-slate-900/70 dark:text-sky-300">
                <Ticket className="h-3.5 w-3.5" />
                مقدّم خدمة
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">تذاكر الدعم الفني</h1>
              <p className="mt-1 max-w-xl text-slate-600 dark:text-slate-400">
                تابع مراسلاتك مع فريقنا، واطّلع على حالة الطلبات، وأنشئ تذكرة جديدة عند الحاجة.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-12 shrink-0 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-6 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-sky-500 hover:to-cyan-400"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              إنشاء تذكرة جديدة
            </Button>
          </motion.header>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <StatCard label="إجمالي التذاكر" value={stats.total} icon={Inbox} accent="cyan" loading={isLoading} />
            <StatCard label="التذاكر المفتوحة" value={stats.open} icon={Timer} accent="amber" loading={isLoading} />
            <StatCard label="تذاكر تم الرد عليها" value={stats.replied} icon={MessageCircleReply} accent="emerald" loading={isLoading} />
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/50 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث برقم التذكرة أو الموضوع أو التصنيف…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 ps-10 pe-4 text-sm text-slate-900 shadow-inner outline-none ring-sky-500/30 transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100/90 p-1 dark:bg-slate-900/80 lg:w-auto">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "min-h-10 shrink-0 rounded-lg px-4 text-sm font-medium transition-all",
                    statusFilter === f
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  {arStatusFilterLabel[f]}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <TicketsTableSection
              tickets={paginated}
              loading={isLoading}
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={filtered.length}
              totalPages={totalPages}
              onPageChange={setPage}
              onView={(t) => openDetail(t, "overview")}
              onOpenThread={(t) => openDetail(t, "thread")}
            />
          </motion.div>
        </div>

        <CreateTicketDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          submitting={createMutation.isPending}
          onSubmit={handleCreateSubmit}
        />

        <TicketDetailDialog
          ticket={detailTicket}
          open={detailOpen}
          onOpenChange={(v) => {
            setDetailOpen(v);
            if (!v) setDetailTicket(null);
          }}
          defaultTab={detailTab}
        />
      </div>
    </ProviderLayout>
  );
}
