import { useState } from "react";
import { Star, MessageSquare, Send, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Review } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ReviewsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const providerId = user?.providerId;
  const isProvider = user?.role === "provider";

  const [filter, setFilter] = useState("الكل");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["provider-reviews", providerId],
    queryFn: () => api.reviews.listByProvider(providerId!),
    enabled: !!providerId,
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: number; reply: string }) =>
      api.reviews.addReply(id, reply),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-reviews", providerId] });
      setReplyingTo(null);
      setReplyText("");
    },
  });

  const filteredReviews = reviews.filter(review => {
    if (filter === "الكل") return true;
    if (filter === "5 نجوم") return review.rating === 5;
    if (filter === "4 نجوم") return review.rating === 4;
    if (filter === "أقل من 4") return review.rating < 4;
    return true;
  });

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: reviews.filter(r => r.rating === s).length,
    percent: totalReviews > 0 ? Math.round((reviews.filter(r => r.rating === s).length / totalReviews) * 100) : 0,
  }));

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`w-4 h-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`} />
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-foreground">التقييمات</h1>
          <p className="text-muted-foreground mt-1">
            {isProvider ? "آراء العملاء في خدماتك المقدمة" : "تقييماتك للمعلنين والعقارات"}
          </p>
        </div>

        {!isProvider && (
          <div className="col-span-full text-center py-20 bg-card rounded-xl border border-dashed">
            <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">لا توجد تقييمات بعد</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto leading-relaxed">
              يمكنك تقييم المعلنين والعقارات مباشرةً من صفحات تفاصيل العقارات.
            </p>
          </div>
        )}

        {isProvider && <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-auto md:min-w-48 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <span className="text-5xl font-black text-foreground">{avgRating.toFixed(1)}</span>
                <div className="flex gap-1 my-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`w-6 h-6 ${star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`} />
                  ))}
                </div>
                <span className="text-sm font-medium text-muted-foreground">بناءً على {totalReviews} تقييم</span>
              </div>

              <div className="flex-1 w-full space-y-3">
                {starCounts.map((row) => (
                  <div key={row.stars} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-16 text-muted-foreground flex items-center justify-end gap-1">
                      {row.stars} <Star className="w-3 h-3" />
                    </span>
                    <Progress value={row.percent} className="h-2 flex-1" />
                    <span className="text-sm font-medium w-10 text-left text-muted-foreground">{row.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>}

        {isProvider && <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto overflow-x-auto hide-scrollbar">
            <TabsList className="w-max">
              <TabsTrigger value="الكل">الكل ({reviews.length})</TabsTrigger>
              <TabsTrigger value="5 نجوم">5 نجوم</TabsTrigger>
              <TabsTrigger value="4 نجوم">4 نجوم</TabsTrigger>
              <TabsTrigger value="أقل من 4">أقل من 4</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>}

        {isProvider && (isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <Card key={review.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">
                          {(review.userName ?? "؟").charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{review.userName ?? "عميل"}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                        </div>
                      </div>
                      {renderStars(review.rating)}
                    </div>

                    {review.text && (
                      <p className="text-sm text-foreground mb-4 leading-relaxed flex-1">
                        "{review.text}"
                      </p>
                    )}

                    {review.reply ? (
                      <div className="mt-auto bg-secondary/50 p-3 rounded-lg border border-border/50">
                        <p className="text-xs font-bold text-primary mb-1">ردك:</p>
                        <p className="text-xs text-muted-foreground">{review.reply}</p>
                      </div>
                    ) : replyingTo === review.id ? (
                      <div className="mt-auto space-y-2">
                        <Textarea
                          placeholder="اكتب ردك هنا..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="text-sm resize-none rounded-lg"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={!replyText.trim() || replyMutation.isPending}
                            onClick={() => replyMutation.mutate({ id: review.id, reply: replyText.trim() })}
                          >
                            {replyMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
                            ) : (
                              <Send className="w-3.5 h-3.5 ml-1" />
                            )}
                            إرسال الرد
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          >
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-auto self-start text-primary hover:bg-primary/10 -ml-2"
                        onClick={() => { setReplyingTo(review.id); setReplyText(""); }}
                      >
                        <MessageSquare className="w-4 h-4 ml-1.5" />
                        إضافة رد
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-16 bg-card rounded-xl border border-dashed">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">لا توجد تقييمات</h3>
                <p className="text-muted-foreground text-sm mt-1">لم يتم العثور على تقييمات تطابق الفلتر الحالي.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
