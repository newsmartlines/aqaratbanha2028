import { useState } from "react";
import { User, Lock, Save, Eye, EyeOff } from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function UserSettings() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "ريم القحطاني",
    email: "reem.q@example.com",
    phone: "0551234567"
  });

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "تم الحفظ بنجاح",
      description: "تم تحديث معلوماتك الشخصية.",
    });
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "تم تغيير كلمة المرور",
      description: "تم تحديث كلمة المرور الخاصة بك بنجاح.",
    });
  };

  return (
    <UserLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
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
                <CardDescription>قم بتحديث معلوماتك الشخصية وطرق التواصل.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveInfo} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-6 items-center mb-6 p-4 bg-secondary/30 rounded-xl border border-border/50">
                    <div className="w-20 h-20 rounded-full bg-indigo-100 overflow-hidden border-2 border-white shadow-sm shrink-0">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Reem" alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center sm:text-right">
                      <h3 className="font-medium text-foreground">الصورة الشخصية</h3>
                      <p className="text-sm text-muted-foreground mb-3">يُفضل استخدام صورة واضحة لزيادة الموثوقية</p>
                      <Button type="button" variant="outline" size="sm">تغيير الصورة</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل</Label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="bg-background text-left" 
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="phone">رقم الجوال</Label>
                      <Input 
                        id="phone" 
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="bg-background text-left" 
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Save className="w-4 h-4" /> حفظ التغييرات
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
                <CardDescription>قم بتحديث كلمة المرور الخاصة بك للحفاظ على أمان حسابك.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavePassword} className="space-y-4">
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                      <div className="relative">
                        <Input 
                          id="current-password" 
                          type={showPassword ? "text" : "password"} 
                          className="bg-background text-left pr-10" 
                          dir="ltr"
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
                          className="bg-background text-left pr-10" 
                          dir="ltr"
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
                        className="bg-background text-left" 
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-start">
                    <Button type="submit" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Save className="w-4 h-4" /> تحديث كلمة المرور
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