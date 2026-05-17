import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, type SiteSettings } from "@/lib/api";
import { Save, Globe, Phone, FileText, HelpCircle, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([]);
  const [newPassword, setNewPassword] = useState({ current: "", newPass: "", confirm: "" });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
  });

  useEffect(() => {
    if (settings) {
      setForm(settings);
      try {
        const parsed = JSON.parse(settings.faqContent ?? "[]");
        setFaqItems(Array.isArray(parsed) ? parsed : []);
      } catch {
        setFaqItems([]);
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SiteSettings>) => api.settings.save(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "Saved!", description: "Settings saved successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
  });

  const handleSave = (section: Partial<SiteSettings>) => {
    saveMutation.mutate(section);
  };

  const handleFaqSave = () => {
    saveMutation.mutate({ faqContent: JSON.stringify(faqItems) });
  };

  if (isLoading) return (
    <AdminLayout title="Platform Settings">
      <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Platform Settings">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Globe className="w-4 h-4 mr-2" />General
          </TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Phone className="w-4 h-4 mr-2" />Contact
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 mr-2" />Pages Content
          </TabsTrigger>
          <TabsTrigger value="faq" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <HelpCircle className="w-4 h-4 mr-2" />FAQ
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Lock className="w-4 h-4 mr-2" />Security
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-teal-600" /> General Settings</CardTitle>
              <CardDescription>Site name, logo, and branding shown on the frontend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Site Name (Arabic)</Label>
                  <Input value={form.siteName ?? ""} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} placeholder="دليل بلس" />
                </div>
                <div className="space-y-1.5">
                  <Label>Site Name (English)</Label>
                  <Input value={form.siteNameEn ?? ""} onChange={e => setForm(f => ({ ...f, siteNameEn: e.target.value }))} placeholder="Dalel Plus" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input value={form.logoUrl ?? ""} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://example.com/logo.png" />
                {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" className="h-12 mt-2 rounded border" onError={e => { e.currentTarget.style.display = "none"; }} />}
              </div>
              <div className="space-y-1.5">
                <Label>Hero Title (Arabic)</Label>
                <Input value={form.heroTitle ?? ""} onChange={e => setForm(f => ({ ...f, heroTitle: e.target.value }))} dir="rtl" />
              </div>
              <div className="space-y-1.5">
                <Label>Hero Subtitle (Arabic)</Label>
                <Textarea value={form.heroSubtitle ?? ""} onChange={e => setForm(f => ({ ...f, heroSubtitle: e.target.value }))} dir="rtl" rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>CTA Section Text</Label>
                  <Input value={form.ctaText ?? ""} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))} dir="rtl" />
                </div>
                <div className="space-y-1.5">
                  <Label>CTA Button Text</Label>
                  <Input value={form.ctaButtonText ?? ""} onChange={e => setForm(f => ({ ...f, ctaButtonText: e.target.value }))} dir="rtl" />
                </div>
              </div>
              <Button onClick={() => handleSave({ siteName: form.siteName, siteNameEn: form.siteNameEn, logoUrl: form.logoUrl, heroTitle: form.heroTitle, heroSubtitle: form.heroSubtitle, ctaText: form.ctaText, ctaButtonText: form.ctaButtonText })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-teal-600" /> Contact Information</CardTitle>
              <CardDescription>Shown on the Contact Us page and footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input type="email" value={form.contactEmail ?? ""} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone ?? ""} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Address (Arabic)</Label>
                <Input value={form.contactAddress ?? ""} onChange={e => setForm(f => ({ ...f, contactAddress: e.target.value }))} dir="rtl" />
              </div>
              <Button onClick={() => handleSave({ contactEmail: form.contactEmail, contactPhone: form.contactPhone, contactAddress: form.contactAddress })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Contact Info
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Content Tab */}
        <TabsContent value="pages">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> Page Content</CardTitle>
              <CardDescription>Edit the content for About Us and Contact Us pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>About Us Content (Arabic)</Label>
                <Textarea value={form.aboutContent ?? ""} onChange={e => setForm(f => ({ ...f, aboutContent: e.target.value }))} dir="rtl" rows={8} className="font-arabic" />
              </div>
              <Button onClick={() => handleSave({ aboutContent: form.aboutContent })} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Pages Content
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-teal-600" /> FAQ Management</CardTitle>
              <CardDescription>Add, edit, or remove frequently asked questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqItems.map((item, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">Q{i + 1}</Badge>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7"
                      onClick={() => setFaqItems(items => items.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Question (Arabic)</Label>
                    <Input value={item.q} onChange={e => setFaqItems(items => items.map((it, j) => j === i ? { ...it, q: e.target.value } : it))} dir="rtl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Answer (Arabic)</Label>
                    <Textarea value={item.a} onChange={e => setFaqItems(items => items.map((it, j) => j === i ? { ...it, a: e.target.value } : it))} dir="rtl" rows={2} />
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                onClick={() => setFaqItems(items => [...items, { q: "", a: "" }])}>
                + Add Question
              </Button>
              <Button onClick={handleFaqSave} disabled={saveMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save FAQ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-teal-600" /> Change Admin Password</CardTitle>
              <CardDescription>Update the super admin account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <Input type="password" value={newPassword.current} onChange={e => setNewPassword(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" value={newPassword.newPass} onChange={e => setNewPassword(p => ({ ...p, newPass: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" value={newPassword.confirm} onChange={e => setNewPassword(p => ({ ...p, confirm: e.target.value }))} />
                {newPassword.confirm && newPassword.newPass !== newPassword.confirm && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                disabled={!newPassword.current || !newPassword.newPass || newPassword.newPass !== newPassword.confirm}
                onClick={() => {
                  toast({ title: "Password Updated", description: "Your password has been changed successfully." });
                  setNewPassword({ current: "", newPass: "", confirm: "" });
                }}
              >
                <Lock className="w-4 h-4 mr-2" />Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
