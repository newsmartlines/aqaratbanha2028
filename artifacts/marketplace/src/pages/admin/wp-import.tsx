import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Upload, FileText, Database, FileCode2, CheckCircle2, XCircle,
  Loader2, AlertCircle, Users, Building2, ImageIcon, Download,
  ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "csv" | "xml" | "sql";

interface PreviewData {
  usersFound: number;
  propertiesFound: number;
  sampleUsers: { name: string; email: string; role: string }[];
  sampleProperties: { title: string; userEmail?: string; price?: number; category?: string; type?: string }[];
}

interface ImportResult {
  usersImported: number;
  usersSkipped: number;
  propertiesImported: number;
  propertiesSkipped: number;
  imagesDownloaded: number;
  imageErrors: number;
  totalUsers: number;
  totalProperties: number;
  usersErrors: string[];
  propertiesErrors: string[];
}

const CSV_USERS_SAMPLE = `name,email,phone,role,username
أحمد محمد,ahmed@example.com,01012345678,provider,ahmed_m
سارة علي,sara@example.com,01098765432,user,sara_ali`;

const CSV_PROPS_SAMPLE = `title,description,price,area,rooms,bathrooms,address,district,city,main_category,listing_type,images,user_email
شقة 3 غرف في بنها,شقة مميزة للبيع,850000,120,3,2,شارع النزهة,النزهة,بنها,residential,sale,https://example.com/img1.jpg,ahmed@example.com
أرض للبيع,أرض مميزة,500000,500,,,طريق القاهرة,,بنها,land,sale,,ahmed@example.com`;

export default function WpImport() {
  const [activeTab, setActiveTab] = useState<Tab>("csv");
  const [file, setFile] = useState<File | null>(null);
  const [downloadImages, setDownloadImages] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tabConfig: Record<Tab, { label: string; icon: any; accept: string; desc: string }> = {
    csv: { label: "CSV", icon: FileText, accept: ".csv", desc: "ملف CSV مُصدَّر من WordPress أو WP All Export" },
    xml: { label: "XML / WXR", icon: FileCode2, accept: ".xml,.wxr", desc: "ملف تصدير WordPress القياسي (.xml / .wxr) أو WP All Export" },
    sql: { label: "SQL Backup", icon: Database, accept: ".sql", desc: "نسخة احتياطية SQL من قاعدة بيانات WordPress" },
  };

  const getImportType = (): string => activeTab;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
    setPreviewData(null); setResult(null); setError(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    setPreviewData(null); setResult(null); setError(null);
  };

  const doRequest = async (preview: boolean) => {
    if (!file) return;
    setLoading(true); setError(null);
    if (!preview) setPreviewData(null);

    const form = new FormData();
    form.append("file", file);
    form.append("importType", getImportType());
    form.append("downloadImages", String(downloadImages));
    if (preview) form.append("preview", "true");

    try {
      const res = await fetch("/api/admin/wp-import", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل الاستيراد");
      if (preview) setPreviewData(json.data);
      else setResult(json.data);
    } catch (err: any) {
      setError(err.message || "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = (type: "users" | "props") => {
    const content = type === "users" ? CSV_USERS_SAMPLE : CSV_PROPS_SAMPLE;
    const fname = type === "users" ? "sample_users.csv" : "sample_properties.csv";
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null); setPreviewData(null); setResult(null); setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const { icon: TabIcon, accept, desc } = tabConfig[activeTab];

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" />
            استيراد من WordPress
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            استيراد المستخدمين والعقارات من WordPress إلى المنصة الحالية
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {(Object.keys(tabConfig) as Tab[]).map(t => {
            const { label, icon: Icon } = tabConfig[t];
            return (
              <button
                key={t}
                onClick={() => { setActiveTab(t); reset(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Upload + Config */}
          <div className="lg:col-span-2 space-y-5">
            {/* File drop zone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${file ? "border-primary/50 bg-primary/5" : "border-slate-300 hover:border-primary/40 hover:bg-slate-50"}`}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <TabIcon className="w-10 h-10 text-primary" />
                  <p className="font-bold text-slate-800">{file.name}</p>
                  <p className="text-slate-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                  <button onClick={e => { e.stopPropagation(); reset(); }} className="text-xs text-rose-500 underline">إزالة</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Upload className="w-10 h-10" />
                  <div>
                    <p className="font-semibold text-slate-600">اسحب الملف هنا أو اضغط للتصفح</p>
                    <p className="text-sm mt-1">{desc}</p>
                    <p className="text-xs mt-1 text-slate-300">الحجم الأقصى: 100 MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-slate-800">خيارات الاستيراد</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-10 h-6 rounded-full transition-colors relative ${downloadImages ? "bg-primary" : "bg-slate-300"}`}
                  onClick={() => setDownloadImages(v => !v)}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${downloadImages ? "right-0.5" : "left-0.5"}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800">تحميل الصور تلقائياً</p>
                  <p className="text-xs text-slate-500">تحميل صور العقارات وحفظها على الخادم المحلي</p>
                </div>
              </label>
              {!downloadImages && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>سيتم حفظ روابط الصور الأصلية مباشرة دون تحميل (قد لا تعمل إذا أُغلق موقع WordPress)</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={!file || loading}
                onClick={() => doRequest(true)}
                className="gap-2 rounded-xl"
              >
                {loading && previewData === null ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                معاينة قبل الاستيراد
              </Button>
              <Button
                disabled={!file || loading || !previewData}
                onClick={() => doRequest(false)}
                className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white flex-1"
              >
                {loading && result === null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading && result === null ? "جاري الاستيراد..." : "بدء الاستيراد"}
              </Button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Preview */}
            {previewData && !result && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-primary/5 px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-slate-800">معاينة الاستيراد</h3>
                  <span className="text-xs text-slate-500 mr-auto">راجع البيانات قبل الاستيراد الفعلي</span>
                </div>
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <p className="text-2xl font-black text-primary">{previewData.usersFound}</p>
                      <p className="text-sm text-slate-500 mt-1">مستخدم</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <p className="text-2xl font-black text-primary">{previewData.propertiesFound}</p>
                      <p className="text-sm text-slate-500 mt-1">عقار</p>
                    </div>
                  </div>

                  {previewData.sampleUsers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-2">عينة المستخدمين</h4>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="text-right px-3 py-2 font-semibold">الاسم</th>
                              <th className="text-right px-3 py-2 font-semibold">البريد</th>
                              <th className="text-right px-3 py-2 font-semibold">الدور</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewData.sampleUsers.map((u, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-medium text-slate-800">{u.name}</td>
                                <td className="px-3 py-2 text-slate-500">{u.email}</td>
                                <td className="px-3 py-2"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{u.role}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {previewData.sampleProperties.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-2">عينة العقارات</h4>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="text-right px-3 py-2 font-semibold">العنوان</th>
                              <th className="text-right px-3 py-2 font-semibold">المعلن</th>
                              <th className="text-right px-3 py-2 font-semibold">السعر</th>
                              <th className="text-right px-3 py-2 font-semibold">النوع</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewData.sampleProperties.map((p, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-medium text-slate-800 max-w-[150px] truncate">{p.title}</td>
                                <td className="px-3 py-2 text-slate-500 text-[10px]">{p.userEmail || "—"}</td>
                                <td className="px-3 py-2 text-slate-700 font-semibold" dir="ltr">{p.price ? p.price.toLocaleString("en-US") : "—"}</td>
                                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full ${p.type === "sale" || p.type === "للبيع" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{p.type === "sale" ? "للبيع" : p.type === "rent" ? "للإيجار" : p.type || "—"}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {previewData.usersFound === 0 && previewData.propertiesFound === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      لم يتم اكتشاف بيانات — تأكد من صيغة الملف وتطابقه مع التنسيق المدعوم
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden">
                <div className="bg-emerald-50 px-5 py-4 border-b border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-emerald-800">اكتمل الاستيراد بنجاح</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "مستخدمون جدد", value: result.usersImported, color: "text-emerald-600", bg: "bg-emerald-50", icon: Users },
                      { label: "تخطى (موجود)", value: result.usersSkipped, color: "text-amber-600", bg: "bg-amber-50", icon: Users },
                      { label: "عقارات مستوردة", value: result.propertiesImported, color: "text-primary", bg: "bg-primary/5", icon: Building2 },
                      { label: "صور محملة", value: result.imagesDownloaded, color: "text-indigo-600", bg: "bg-indigo-50", icon: ImageIcon },
                    ].map(({ label, value, color, bg, icon: Icon }) => (
                      <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                        <p className={`text-xl font-black ${color}`}>{value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {(result.usersErrors.length > 0 || result.propertiesErrors.length > 0) && (
                    <div className="border border-rose-200 rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 bg-rose-50 text-rose-700 text-sm font-semibold"
                        onClick={() => setShowErrors(v => !v)}
                      >
                        <span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> {result.usersErrors.length + result.propertiesErrors.length} أخطاء</span>
                        {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {showErrors && (
                        <div className="p-4 space-y-1 max-h-48 overflow-y-auto">
                          {[...result.usersErrors, ...result.propertiesErrors].map((e, i) => (
                            <p key={i} className="text-xs text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">{e}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={reset} variant="outline" className="w-full rounded-xl">استيراد ملف آخر</Button>
                </div>
              </div>
            )}
          </div>

          {/* Right — Instructions */}
          <div className="space-y-4">
            {/* Format guide */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> دليل التنسيق
              </h3>

              {activeTab === "csv" && (
                <div className="space-y-4 text-sm text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-800 mb-2">CSV المستخدمين</p>
                    <p className="text-xs text-slate-500 mb-2">الأعمدة المطلوبة:</p>
                    <div className="space-y-1">
                      {["name — الاسم", "email — البريد الإلكتروني", "phone — الهاتف (اختياري)", "role — user / provider"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{f}</code>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => downloadSample("users")} className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <Download className="w-3.5 h-3.5" /> تحميل نموذج المستخدمين
                    </button>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="font-semibold text-slate-800 mb-2">CSV العقارات</p>
                    <p className="text-xs text-slate-500 mb-2">الأعمدة المطلوبة:</p>
                    <div className="space-y-1">
                      {["title — عنوان العقار", "user_email — بريد المعلن", "price — السعر", "listing_type — sale / rent", "main_category — residential/commercial/land", "images — روابط الصور (مفصولة بـ |)"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 break-all">{f}</code>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => downloadSample("props")} className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <Download className="w-3.5 h-3.5" /> تحميل نموذج العقارات
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "xml" && (
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="text-xs text-slate-500 leading-relaxed">صيغة WXR القياسية لـ WordPress أو ملف WP All Export XML</p>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-800 text-xs">طريقة التصدير من WordPress:</p>
                    <ol className="space-y-1">
                      {[
                        "ادخل لوحة التحكم → الأدوات → تصدير",
                        "اختر \"كل المحتوى\" أو نوع المنشورات",
                        "انقر \"تحميل ملف التصدير\"",
                        "ارفع الملف .xml هنا",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                    <p className="font-semibold text-slate-700">الإضافات المدعومة:</p>
                    <ul className="space-y-0.5 text-slate-500">
                      <li>✓ WP All Export (XML/CSV)</li>
                      <li>✓ Houzez Real Estate</li>
                      <li>✓ WP Property</li>
                      <li>✓ Real Homes Theme</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "sql" && (
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="text-xs text-slate-500 leading-relaxed">ملف SQL من phpMyAdmin أو أي أداة نسخ احتياطي</p>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-800 text-xs">جداول WordPress المستخدمة:</p>
                    <div className="space-y-1">
                      {["wp_users — بيانات المستخدمين", "wp_usermeta — معلومات إضافية", "wp_posts — المنشورات/العقارات", "wp_postmeta — خصائص العقارات"].map(t => (
                        <div key={t} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{t}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                    <p className="font-semibold mb-1">ملاحظة:</p>
                    <p>كلمات مرور WordPress (MD5/phpass) غير متوافقة. سيتم تعيين كلمة مرور عشوائية وسيحتاج المستخدم لإعادة تعيينها.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-700 text-sm">ملاحظات مهمة</h3>
              <ul className="space-y-2">
                {[
                  "يتم تجاهل المستخدمين المكررين تلقائياً (حسب البريد الإلكتروني)",
                  "كل عقار يرتبط تلقائياً بحساب المعلن الأصلي",
                  "العقارات المستوردة تظهر فور الاستيراد بدون مراجعة",
                  "يمكن استيراد ملف المستخدمين أولاً ثم ملف العقارات",
                ].map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
