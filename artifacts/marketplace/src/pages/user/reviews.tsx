import { useState } from "react";
import { Star, MoreVertical, Edit, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api, type UserReviewItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function UserReviews() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: reviews = [], isLoading } = useQuery<UserReviewItem[]>({
    queryKey: ["user-reviews", user?.id],
    queryFn: () => api.reviews.listByUser(user!.id),
    enabled: !!user,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const updateMut = useMutation({
    mutationFn: (vars: { id: number; rating: number; text: string }) =>
      api.reviews.update(vars.id, { rating: vars.rating, text: vars.text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-reviews", user?.id] });
      setEditingId(null);
      toast({ title: "تم التحديث", description: "تم تحديث التقييم بنجاح." });
    },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.reviews.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-reviews", user?.id] });
      setDeletingId(null);
      toast({ title: "تم الحذف", description: "تم حذف التقييم بنجاح." });
    },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  const handleEditClick = (review: UserReviewItem) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditText(review.text ?? "");
  };

  return (
    <UserLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold text-foreground">تقييماتي</h1>
          <p className="text-muted-foreground mt-1">إدارة التقييمات التي كتبتها لمزودي الخدمات</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 bg-secondary/20 rounded-xl border border-border/50">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">لا توجد تقييمات بعد</p>
            <p className="text-sm text-muted-foreground mt-1">يمكنك تقييم مقدمي الخدمات بعد إكمال طلباتك</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  {editingId === review.id ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setEditRating(star)}
                              className={`p-1 transition-colors ${star <= editRating ? "text-amber-500" : "text-gray-300"}`}
                            >
                              <Star className={`w-6 h-6 ${star <= editRating ? "fill-amber-500" : ""}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[100px]"
                        placeholder="اكتب رأيك..."
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)} disabled={updateMut.isPending}>
                          إلغاء
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateMut.mutate({ id: review.id, rating: editRating, text: editText })}
                          disabled={updateMut.isPending || editRating < 1}
                        >
                          {updateMut.isPending && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                          حفظ التعديلات
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/provider/${review.providerId}`} className="font-bold text-base text-primary hover:underline">
                              {review.providerName ?? "شركة عقارية"}
                            </Link>
                          </div>
                          <div className="flex items-center gap-1 mb-3">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${star <= review.rating ? "text-amber-500 fill-amber-500" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground mr-2">{formatDate(review.createdAt)}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(review)}>
                              <Edit className="w-4 h-4 ml-2" /> تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => setDeletingId(review.id)}
                            >
                              <Trash2 className="w-4 h-4 ml-2" /> حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {review.text && (
                        <p className="text-sm text-foreground/90 leading-relaxed bg-secondary/30 p-3 rounded-lg border border-border/50">
                          "{review.text}"
                        </p>
                      )}
                      {review.reply && (
                        <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <p className="text-xs font-bold text-primary mb-1">رد مقدم الخدمة:</p>
                          <p className="text-sm text-foreground/80 leading-relaxed">{review.reply}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف التقييم؟</AlertDialogTitle>
              <AlertDialogDescription>
                لا يمكن التراجع عن هذا الإجراء بعد تنفيذه. سيتم إزالة التقييم نهائياً وتحديث متوسط تقييم مقدم الخدمة.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel disabled={deleteMut.isPending}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingId && deleteMut.mutate(deletingId)}
                disabled={deleteMut.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                نعم، احذف التقييم
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </UserLayout>
  );
}
