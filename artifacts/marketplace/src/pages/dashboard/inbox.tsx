import { useState, useEffect, useRef } from "react";
import { Loader2, Send, MessageSquare, ArrowRight, Home, Building2, Check, CheckCheck } from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InboxThread, mediaUrl } from "@/lib/api";

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/initials/svg?seed=user&backgroundColor=0d8abc";

function getAvatar(name?: string, avatar?: string) {
  if (avatar) return mediaUrl(avatar);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name ?? "user")}&backgroundColor=0d8abc&fontFamily=Tajawal`;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "الآن";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} د`;
  if (diff < 86400000) return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("ar-SA", { weekday: "short" });
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

function formatFull(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("ar-SA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getPropertyFirstImage(imagesJson?: string | null): string | null {
  try {
    if (!imagesJson) return null;
    const arr = JSON.parse(imagesJson);
    return Array.isArray(arr) && arr[0] ? arr[0] : null;
  } catch { return null; }
}

function getConvoKey(conv: InboxThread) {
  return `${conv.otherId}__${conv.propertyId ?? "0"}`;
}

export default function ProviderInbox() {
  const { user } = useAuth();
  const [selectedOtherId, setSelectedOtherId] = useState<number | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: inbox = [], isLoading: inboxLoading } = useQuery({
    queryKey: ["inbox"],
    queryFn: api.messages.inbox,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ["conversation", selectedOtherId, selectedPropertyId],
    queryFn: () => api.messages.conversation(selectedOtherId!, selectedPropertyId),
    enabled: !!selectedOtherId,
    refetchInterval: 1500,
    staleTime: 0,
  });

  const conversation: any[] = (convData as any)?.messages ?? [];
  const convProperty: any = (convData as any)?.property ?? null;

  const sendMutation = useMutation({
    mutationFn: () => api.messages.send(selectedOtherId!, draft.trim(), selectedPropertyId),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedOtherId, selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length]);

  useEffect(() => {
    if (selectedOtherId) {
      api.messages.markRead(selectedOtherId, selectedPropertyId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    }
  }, [selectedOtherId, selectedPropertyId]);

  const selectedConv = inbox.find((c: InboxThread) =>
    c.otherId === selectedOtherId && (c.propertyId ?? null) === selectedPropertyId
  ) ?? inbox.find((c: InboxThread) => c.otherId === selectedOtherId);

  function selectConversation(conv: InboxThread) {
    setSelectedOtherId(conv.otherId);
    setSelectedPropertyId(conv.propertyId ?? null);
    setMobileShowChat(true);
    setDraft("");
  }

  const propertyImg = convProperty
    ? getPropertyFirstImage(convProperty.propertyImages ?? convProperty.images)
    : getPropertyFirstImage(selectedConv?.propertyImages);
  const propertyTitle = convProperty?.title ?? selectedConv?.propertyTitle;
  const propertyPrice = convProperty?.price ?? selectedConv?.propertyPrice;

  return (
    <ProviderLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            صندوق الرسائل
          </h1>
          <p className="text-muted-foreground text-sm mt-1">راسل عملاءك وتابع المحادثات</p>
        </div>

        {/* Mobile back header when chat is open */}
        {mobileShowChat && (
          <div className="lg:hidden flex items-center gap-3 mb-3 p-2 bg-secondary/30 rounded-xl border border-border/40">
            <button
              onClick={() => setMobileShowChat(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            {selectedConv && (
              <>
                <img
                  src={getAvatar(selectedConv.otherName, selectedConv.otherAvatar)}
                  className="w-8 h-8 rounded-full object-cover"
                  alt=""
                />
                <p className="font-semibold text-sm truncate">{selectedConv.otherName}</p>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-240px)] min-h-[500px]">
          {/* ── Conversation List ── */}
          <Card className={`lg:col-span-1 overflow-hidden flex flex-col border-border/50 ${mobileShowChat ? "hidden lg:flex" : "flex"}`}>
            <div className="p-3 border-b bg-secondary/30 shrink-0 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">المحادثات</p>
              {inbox.some((c: InboxThread) => (c.unreadCount ?? 0) > 0) && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mr-auto">
                  {inbox.reduce((s: number, c: InboxThread) => s + (c.unreadCount ?? 0), 0)}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {inboxLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : inbox.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد محادثات بعد</p>
                </div>
              ) : (
                inbox.map((conv: InboxThread) => {
                  const key = getConvoKey(conv);
                  const isSelected = conv.otherId === selectedOtherId && (conv.propertyId ?? null) === selectedPropertyId;
                  const hasUnread = (conv.unreadCount ?? 0) > 0;
                  const thumb = getPropertyFirstImage(conv.propertyImages);
                  return (
                    <button
                      key={key}
                      onClick={() => selectConversation(conv)}
                      className={`w-full flex items-center gap-3 p-3 border-b border-border/20 hover:bg-secondary/40 transition-colors text-right ${isSelected ? "bg-primary/5 border-r-2 border-r-primary" : ""}`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={getAvatar(conv.otherName, conv.otherAvatar)}
                          className="w-11 h-11 rounded-full object-cover border border-border/30"
                          alt=""
                        />
                        {hasUnread && (
                          <span className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-sm truncate ${hasUnread ? "font-bold" : "font-semibold"}`}>
                            {conv.otherName ?? "مستخدم"}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTime(conv.createdAt)}
                          </span>
                        </div>
                        {conv.propertyTitle && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <Home className="w-3 h-3 text-primary/60 shrink-0" />
                            <span className="text-[10px] text-primary font-medium truncate">
                              {conv.propertyTitle}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {conv.senderId === user?.id ? "أنت: " : ""}{conv.content ?? ""}
                          </p>
                          {hasUnread && (
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      {thumb && (
                        <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-border/30">
                          <img src={thumb} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* ── Chat Area ── */}
          <Card className={`lg:col-span-2 overflow-hidden flex flex-col border-border/50 ${!mobileShowChat && "hidden lg:flex"}`}>
            {!selectedOtherId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="font-semibold text-lg mb-2">اختر محادثة</h3>
                <p className="text-sm text-muted-foreground">اختر محادثة من القائمة لعرض الرسائل والرد عليها</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="shrink-0 bg-background border-b border-border/40 shadow-sm">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <img
                      src={getAvatar(selectedConv?.otherName, selectedConv?.otherAvatar)}
                      className="w-9 h-9 rounded-full object-cover border border-border/30"
                      alt=""
                    />
                    <div>
                      <p className="font-bold text-sm">{selectedConv?.otherName ?? "مستخدم"}</p>
                      <p className="text-xs text-muted-foreground">عميل</p>
                    </div>
                  </div>

                  {/* Property context card */}
                  {(propertyTitle || selectedPropertyId) && (
                    <div className="mx-3 mb-3 flex items-center gap-3 p-2.5 bg-primary/5 rounded-xl border border-primary/15">
                      {propertyImg ? (
                        <img src={propertyImg} className="w-12 h-10 rounded-lg object-cover shrink-0 border border-border/30" alt="" />
                      ) : (
                        <div className="w-12 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-primary/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{propertyTitle ?? "عقار"}</p>
                        {propertyPrice && (
                          <p className="text-xs text-primary font-semibold">
                            {parseFloat(String(propertyPrice)) > 0
                              ? `${Number(propertyPrice).toLocaleString("ar-EG")} ج.م`
                              : "السعر غير محدد"}
                          </p>
                        )}
                      </div>
                      {selectedPropertyId && (
                        <a href={`/property/${selectedPropertyId}`} className="text-[10px] text-primary font-semibold hover:underline shrink-0">
                          عرض
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50 dark:bg-background">
                  {convLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : conversation.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">ابدأ المحادثة بإرسال رسالة</p>
                    </div>
                  ) : (
                    (() => {
                      let lastDate = "";
                      return conversation.map((msg: any) => {
                        const isMe = msg.senderId === user?.id;
                        const msgDate = new Date(msg.createdAt).toLocaleDateString("ar-SA", {
                          weekday: "long", month: "long", day: "numeric",
                        });
                        const showDate = msgDate !== lastDate;
                        lastDate = msgDate;
                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-border/40" />
                                <span className="text-[10px] text-muted-foreground px-2 bg-gray-50 dark:bg-background font-medium">
                                  {msgDate}
                                </span>
                                <div className="flex-1 h-px bg-border/40" />
                              </div>
                            )}
                            <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                              {!isMe && (
                                <img
                                  src={getAvatar(selectedConv?.otherName, selectedConv?.otherAvatar)}
                                  className="w-6 h-6 rounded-full object-cover shrink-0 mb-1"
                                  alt=""
                                />
                              )}
                              <div className={`max-w-[72%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                                  isMe
                                    ? "bg-primary text-white rounded-tl-md"
                                    : "bg-white dark:bg-secondary text-foreground rounded-tr-md border border-border/30"
                                }`}>
                                  {msg.content}
                                </div>
                                <div className={`flex items-center gap-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                                  <span
                                    className="text-[10px] text-muted-foreground"
                                    title={formatFull(msg.createdAt)}
                                  >
                                    {formatTime(msg.createdAt)}
                                  </span>
                                  {isMe && (
                                    msg.isRead
                                      ? <CheckCheck className="w-3 h-3 text-primary" />
                                      : <Check className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 p-3 border-t bg-background border-border/40">
                  <div className="flex gap-2 items-end">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="اكتب ردك..."
                      className="resize-none min-h-[44px] max-h-28 rounded-2xl text-sm border-border/60 bg-gray-50 dark:bg-secondary focus:bg-background transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (draft.trim() && !sendMutation.isPending) sendMutation.mutate();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-2xl bg-primary hover:bg-primary/90 shadow-sm"
                      disabled={!draft.trim() || sendMutation.isPending}
                      onClick={() => sendMutation.mutate()}
                    >
                      {sendMutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 px-1">Enter لإرسال · Shift+Enter لسطر جديد</p>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </ProviderLayout>
  );
}
