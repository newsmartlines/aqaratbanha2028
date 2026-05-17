import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";
export type Dict = Record<string, { ar: string; en: string }>;

const STORAGE_KEY = "admin-lang";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  dir: "rtl" | "ltr";
  isRTL: boolean;
  formatNumber: (n: number | string, opts?: Intl.NumberFormatOptions) => string;
  formatCurrency: (n: number | string) => string;
  formatDate: (d: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (d: string | number | Date) => string;
};

const LangContext = createContext<Ctx | null>(null);

function getInitial(): Lang {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  return saved === "en" || saved === "ar" ? saved : "ar";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitial);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  const isRTL = lang === "ar";
  const dir: "rtl" | "ltr" = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dir;
  }, [lang, dir]);

  const value = useMemo<Ctx>(() => {
    const locale = lang === "ar" ? "ar-SA" : "en-US";
    const formatNumber = (n: number | string, opts?: Intl.NumberFormatOptions) => {
      const num = typeof n === "string" ? Number(n) : n;
      if (!Number.isFinite(num)) return String(n);
      return new Intl.NumberFormat(locale, opts).format(num);
    };
    return {
      lang,
      setLang,
      toggle: () => setLang(lang === "ar" ? "en" : "ar"),
      dir,
      isRTL,
      formatNumber,
      formatCurrency: (n) => {
        const num = typeof n === "string" ? Number(n) : n;
        if (!Number.isFinite(num)) return String(n);
        const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(num);
        return lang === "ar" ? `${formatted} ر.س` : `${formatted} SAR`;
      },
      formatDate: (d, opts) =>
        new Intl.DateTimeFormat(locale, opts ?? { year: "numeric", month: "short", day: "numeric" }).format(new Date(d)),
      formatDateTime: (d) =>
        new Intl.DateTimeFormat(locale, {
          year: "numeric", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        }).format(new Date(d)),
    };
  }, [lang, dir, isRTL]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLanguage(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useT<D extends Dict>(dict: D) {
  const { lang } = useLanguage();
  return (key: keyof D, fallback?: string): string => {
    const entry = dict[key];
    if (!entry) return fallback ?? String(key);
    return entry[lang] ?? entry.ar ?? fallback ?? String(key);
  };
}

export const commonDict = {
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  edit: { ar: "تعديل", en: "Edit" },
  delete: { ar: "حذف", en: "Delete" },
  add: { ar: "إضافة", en: "Add" },
  search: { ar: "بحث...", en: "Search..." },
  loading: { ar: "جاري التحميل...", en: "Loading..." },
  noResults: { ar: "لا توجد نتائج", en: "No results" },
  error: { ar: "خطأ", en: "Error" },
  success: { ar: "تم بنجاح", en: "Success" },
  saveChanges: { ar: "حفظ التغييرات", en: "Save Changes" },
  saving: { ar: "جاري الحفظ...", en: "Saving..." },
  refresh: { ar: "تحديث", en: "Refresh" },
  actions: { ar: "إجراءات", en: "Actions" },
  status: { ar: "الحالة", en: "Status" },
  name: { ar: "الاسم", en: "Name" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  phone: { ar: "الهاتف", en: "Phone" },
  date: { ar: "التاريخ", en: "Date" },
  active: { ar: "نشط", en: "Active" },
  pending: { ar: "معلق", en: "Pending" },
  inactive: { ar: "غير نشط", en: "Inactive" },
  yes: { ar: "نعم", en: "Yes" },
  no: { ar: "لا", en: "No" },
  required: { ar: "مطلوب", en: "Required" },
  password: { ar: "كلمة المرور", en: "Password" },
  confirmDelete: { ar: "تأكيد الحذف؟", en: "Confirm delete?" },
  cannotUndo: { ar: "لا يمكن التراجع عن هذا الإجراء.", en: "This action cannot be undone." },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  loadFailed: { ar: "فشل تحميل البيانات", en: "Failed to load data" },
  none: { ar: "لا يوجد", en: "None" },
  signOut: { ar: "تسجيل الخروج", en: "Sign Out" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  markAllRead: { ar: "تعليم الكل كمقروء", en: "Mark all as read" },
  noNotifications: { ar: "لا توجد إشعارات", en: "No notifications" },
  backToSite: { ar: "العودة إلى سمارت لاينز للنظم المتطورة", en: "Back to Smart Lines Advanced Systems" },
} satisfies Dict;
