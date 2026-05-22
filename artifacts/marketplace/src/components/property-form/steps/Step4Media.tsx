import { useRef } from "react";
import { UseFormRegister } from "react-hook-form";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormValues } from "../types";

interface Step4MediaProps {
  v:                FormValues;
  register:         UseFormRegister<FormValues>;
  isCompany:        boolean;
  uploading:        boolean;
  fileInputRef:     React.RefObject<HTMLInputElement>;
  removeImage:      (url: string) => void;
  handleFileUpload: (files: FileList | null) => void;
}

export function Step4Media({
  v, register, isCompany, uploading, fileInputRef, removeImage, handleFileUpload,
}: Step4MediaProps) {
  return (
    <div className="space-y-6">
      {/* صور العقار */}
      <div>
        <Label className="text-base font-bold mb-2 block">صور العقار</Label>
        <p className="text-xs text-muted-foreground mb-4">
          أضف حتى 10 صور — الصورة الأولى تكون الغلاف
        </p>

        {(v.images as string[]).length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(v.images as string[]).map((img, i) => (
              <div
                key={i}
                className="relative group rounded-xl overflow-hidden border border-border/50 aspect-video bg-muted"
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1 right-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    غلاف
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="absolute top-1 left-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(v.images as string[]).length < 10 && (
          <>
            <input
              ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-border hover:border-teal-400 hover:bg-teal-50/30 transition-all flex flex-col items-center gap-2 text-muted-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
                  <span className="text-sm">جارٍ الرفع...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-7 h-7" />
                  <span className="text-sm font-medium">اضغط لاختيار الصور</span>
                  <span className="text-xs">PNG, JPG حتى 5MB</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* معلومات التواصل */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          معلومات التواصل <span className="text-red-500">*</span>
        </Label>
        <div className="space-y-4">
          <div>
            <Label htmlFor="f-phone" className="text-sm font-semibold mb-2 block">
              رقم الهاتف <span className="text-red-500">*</span>
            </Label>
            <Input
              id="f-phone" placeholder="01XXXXXXXXX"
              {...register("phone")}
              className="h-11 rounded-xl" dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="f-whatsapp" className="text-sm font-semibold mb-2 block">
              رقم الواتساب (اختياري)
            </Label>
            <Input
              id="f-whatsapp" placeholder="01XXXXXXXXX"
              {...register("whatsapp")}
              className="h-11 rounded-xl" dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* ── Company only: رابط فيديو يوتيوب ──────────── */}
      {isCompany && (
        <div>
          <Label htmlFor="f-video" className="text-sm font-semibold mb-2 block">
            رابط فيديو يوتيوب (اختياري)
          </Label>
          <Input
            id="f-video"
            placeholder="https://youtube.com/watch?v=..."
            {...register("videoUrl")}
            className="h-11 rounded-xl"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            أضف فيديو جولة افتراضية أو عرض المشروع
          </p>
        </div>
      )}
    </div>
  );
}
