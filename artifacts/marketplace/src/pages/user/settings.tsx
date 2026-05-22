import { useState, useEffect, useRef } from "react";
import { User, Lock, Save, Eye, EyeOff, Loader2, Camera } from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { mediaUrl } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type Region } from "@/lib/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function UserSettings() {
  const { toast } = useToast();
  const { user, refetch: refetchAuth } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [regionId, setRegionId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");

  const { data: regList = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
    staleTime: 5 * 60_000,
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setAvatar(user.avatar ?? "");
      setRegionId(user.regionId != null && user.regionId > 0 ? String(user.regionId) : "");
      setCityId(user.cityId != null && user.cityId > 0 ? String(user.cityId) : "");
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("غير مسجّل");
      await api.users.update(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        avatar: avatar || null,
        regionId: regionId ? parseInt(regionId, 10) : null,
        cityId: cityId ? parseInt(cityId, 10) : null,
      });
    },
    onSuccess: async () => {
      await refetchAuth();
      toast({ title: "تم الحفظ", description: "تم تحديث معلوماتك بنجاح." });
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message || "تعذر حفظ البيانات", variant: "destructive" }),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("كلمات المرور غير متطابقة");
      if (newPassword.length < 6) throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      await api.auth.changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "تم التحديث", description: "تم تغيير كلمة المرور بنجاح." });
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message || "تعذر تغيير كلمة المرور", variant: "destructive" }),
  });

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const { url } = await api.upload.avatar(file);
      setAvatar(url);
      await api.users.update(user.id, { avatar: url });
      await refetchAuth();
      toast({ title: "تم رفع الصورة", description: "تم تحديث صورتك الشخصية." });
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message ?? "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  return (
    <UserLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground mt-1">إدارة معلومات حسابك الشخصي وإعدادات الأمان</p>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="info" className="gap-2"><User className="w-4 h-4" /> معلوماتي</TabsTrigger>
            <TabsTrigger value="security" className="gap-2"><Lock className="w-4 h-4" /> الأمان</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>المعلومات الشخصية</CardTitle>
                <CardDescription>يتم حفظ التغييرات في قاعدة البيانات فوراً بعد الضغط على حفظ.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateProfile.mutate();
                  }}
                >
                  <div className="flex flex-col sm:flex-row gap-6 items-center mb-6 p-4 bg-secondary/30 rounded-xl border border-border/50">
                    <div className="w-24 h-24 rounded-full bg-indigo-100 border-4 border-white shadow-md shrink-0 flex items-center justify-center p-1">
                      <img
                        src={avatar ? mediaUrl(avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || "user")}`}
                        alt="Avatar"
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-full"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-right">
                      <h3 className="font-medium text-foreground">الصورة الشخصية</h3>
                      <p className="text-sm text-muted-foreground mb-3">صيغة صورة واضحة (يتم الرفع إلى الخادم)</p>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                      <Button type="button" variant="outline" size="sm" disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
                        {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Camera className="w-4 h-4 ml-2" />}
                        تغيير الصورة
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-background" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-background text-left"
                        dir="ltr"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="phone">رقم الجوال</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-background text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التغييرات
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>تغيير كلمة المرور</CardTitle>
                <CardDescription>أدخل كلمة المرور الحالية ثم الجديدة.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    changePassword.mutate();
                  }}
                >
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-background text-left pr-10"
                          dir="ltr"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-background text-left pr-10"
                          dir="ltr"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-background text-left"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-start">
                    <Button type="submit" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={changePassword.isPending}>
                      {changePassword.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      تحديث كلمة المرور
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
}
