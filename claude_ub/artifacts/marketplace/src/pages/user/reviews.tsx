import { useState } from "react";
import { Star, MoreVertical, Edit, Trash2 } from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
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

interface Review {
  id: string;
  provider: string;
  service: string;
  rating: number;
  date: string;
  text: string;
  canEdit: boolean;
}

const initialReviews: Review[] = [
  { id: "REV-1", provider: "مطبخ أم خالد", service: "بوفيه عشاء لـ 20 شخص", rating: 5, date: "16 مايو 2024", text: "الأكل كان رائع جداً ووصل في الوقت المحدد حار ولذيذ. الترتيب والتنسيق ممتاز أنصح بالتعامل معهم بشدة في المناسبات.", canEdit: true },
  { id: "REV-2", provider: "صالون أريج", service: "تجهيز عروس", rating: 4, date: "12 مايو 2024", text: "شغل مرتب ونظيف والأدوات معقمة. التأخير كان بسيط ربع ساعة تقريباً بس النتيجة النهائية كانت مرضية جداً.", canEdit: true },
  { id: "REV-3", provider: "توصيل سريع", service: "توصيل طرد مغلف", rating: 5, date: "26 أبريل 2024", text: "سريع جداً ومحترم وتعامله راقي، وصل الطرد سليم.", canEdit: false },
];

export default function UserReviews() {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleEditClick = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditText(review.text);
  };

  const saveEdit = (id: string) => {
    setReviews(reviews.map(r => 
      r.id === id ? { ...r, rating: editRating, text: editText } : r
    ));
    setEditingId(null);
    toast({ title: "تم التحديث", description: "تم تحديث التقييم بنجاح." });
  };

  const confirmDelete = () => {
    if (deletingId) {
      setReviews(reviews.filter(r => r.id !== deletingId));
      setDeletingId(null);
      toast({ title: "تم الحذف", description: "تم حذف التقييم بنجاح." });
    }
  };

  return (
    <UserLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold text-foreground">تقييماتي</h1>
          <p className="text-muted-foreground mt-1">إدارة التقييمات التي كتبتها لمزودي الخدمات</p>
        </div>

        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-16 bg-secondary/20 rounded-xl border border-border/50">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">لا توجد تقييمات سابقة</p>
            </div>
          ) : (
            reviews.map((review) => (
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
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>إلغاء</Button>
                        <Button size="sm" onClick={() => saveEdit(review.id)}>حفظ التعديلات</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-base text-indigo-700">{review.provider}</h3>
                            <Badge variant="secondary" className="text-xs">{review.service}</Badge>
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
                            <span className="text-xs text-muted-foreground mr-2">{review.date}</span>
                          </div>
                        </div>
                        {review.canEdit && (
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
                              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setDeletingId(review.id)}>
                                <Trash2 className="w-4 h-4 ml-2" /> حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed bg-secondary/30 p-3 rounded-lg border border-border/50">
                        "{review.text}"
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف التقييم؟</AlertDialogTitle>
              <AlertDialogDescription>
                لا يمكن التراجع عن هذا الإجراء بعد تنفيذه. سيتم إزالة التقييم نهائياً.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                نعم، احذف التقييم
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </UserLayout>
  );
}