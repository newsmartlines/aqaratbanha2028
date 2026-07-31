/**
 * Replaces {{variable}} placeholders in text with values from a vars object.
 *
 * Supported variables (from siteSettings):
 *   {{siteName}}        — اسم الموقع (عربي)
 *   {{siteNameEn}}      — اسم الموقع (إنجليزي)
 *   {{contactEmail}}    — البريد الإلكتروني
 *   {{contactPhone}}    — رقم الهاتف
 *   {{contactWhatsapp}} — رقم الواتساب
 *   {{contactAddress}}  — العنوان
 */
export function interpolate(text: string, vars: Record<string, string>): string {
  if (!text) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in vars ? (vars[key] ?? match) : match
  );
}

/** All placeholder keys the system supports, for display in admin UI */
export const INTERPOLATION_VARS = [
  { key: "{{siteName}}",        label: "اسم الموقع (عربي)" },
  { key: "{{siteNameEn}}",      label: "اسم الموقع (إنجليزي)" },
  { key: "{{contactEmail}}",    label: "البريد الإلكتروني" },
  { key: "{{contactPhone}}",    label: "رقم الهاتف" },
  { key: "{{contactWhatsapp}}", label: "رقم الواتساب" },
  { key: "{{contactAddress}}",  label: "العنوان" },
] as const;
