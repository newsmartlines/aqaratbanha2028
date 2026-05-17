import { useState, useEffect, useRef } from "react";
import { Loader2, Send, MessageSquare } from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InboxThread } from "@/lib/api";

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=user";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function UserInbox() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: inbox = [], isLoading: inboxLoading } = useQuery({
    queryKey: ["inbox"],
    queryFn: api.messages.inbox,
    refetchInterval: 10000,
  });

  const { data: conversation = [], isLoading: convLoading } = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: () => api.messages.conversation(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: () => api.messages.send(selectedId!, draft.trim()),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const selectedConv = inbox.find((c: InboxThread) => c.otherId === selectedId);

  return (
    <UserLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            رسائلي
          </h1>
          <p className="text-muted-foreground text-sm mt-1">تواصل مع مقدمي الخدمات</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-240px)] min-h-[500px]">
          {/* Conversation List */}
          <Card className="lg:col-span-1 overflow-hidden flex flex-col border-border/50">
            <div className="p-3 border-b bg-secondary/30">
              <p className="text-sm font-semibold text-foreground">المحادثات</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {inboxLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : inbox.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد محادثات بعد</p>
                  <p className="text-xs text-muted-foreground mt-1">عند التواصل مع مزود ستظهر محادثتك هنا</p>
                </div>
              ) : (
                inbox.map((conv: InboxThread) => (
                  <button
                    key={conv.otherId}
                    onClick={() => setSelectedId(conv.otherId)}
                    className={`w-full flex items-center gap-3 p-3 border-b border-border/30 hover:bg-secondary/40 transition-colors text-right ${selectedId === conv.otherId ? "bg-primary/5 border-r-2 border-r-primary" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-secondary">
                      <img src={conv.otherAvatar ?? DEFAULT_AVATAR} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold truncate">{conv.otherName}</p>
                        {(conv.unreadCount ?? 0) > 0 && (
                          <span className="w-5 h-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.content}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 overflow-hidden flex flex-col border-border/50">
            {!selectedId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">اختر محادثة</h3>
                <p className="text-sm text-muted-foreground">اختر محادثة من القائمة لعرض الرسائل</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-secondary/20 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-secondary shrink-0">
                    <img src={selectedConv?.otherAvatar ?? DEFAULT_AVATAR} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedConv?.otherName ?? "..."}</p>
                    <p className="text-xs text-muted-foreground capitalize">{selectedConv?.otherRole === "provider" ? "مزود خدمة" : "مستخدم"}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {convLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : conversation.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">ابدأ المحادثة بإرسال رسالة!</div>
                  ) : (
                    conversation.map((msg: any) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary shrink-0">
                              <img src={msg.senderAvatar ?? DEFAULT_AVATAR} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                            </div>
                          )}
                          <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-tl-sm"
                                : "bg-secondary text-foreground rounded-tr-sm"
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t bg-background">
                  <div className="flex gap-2 items-end">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="اكتب رسالتك..."
                      className="resize-none min-h-[44px] max-h-32 rounded-xl text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (draft.trim()) sendMutation.mutate();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      disabled={!draft.trim() || sendMutation.isPending}
                      onClick={() => sendMutation.mutate()}
                    >
                      {sendMutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Enter لإرسال · Shift+Enter لسطر جديد</p>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
