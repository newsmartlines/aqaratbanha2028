/**
 * Per-step field validation for the property form.
 * Produces per-field error messages and provides a scroll-to-first-error utility.
 */
import type { FormValues } from "./types";
import type { PropertyTypeConfig } from "./types";

export type FieldErrors = Record<string, string>;

/**
 * Validate the required fields for the given wizard step.
 * Returns a map of { fieldKey → error message in Arabic }.
 * Only validates fields that are visible for the current category config.
 */
export function validateStep(
  step: number,
  v: FormValues,
  _cfg: PropertyTypeConfig,
): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 1) {
    if (!v.mainCategory?.trim()) {
      errors.mainCategory = "يرجى اختيار نوع الوحدة (شقة، فيلا، محل...)";
    }
    if (!v.listingType?.trim()) {
      errors.listingType = "يرجى اختيار نوع الإعلان (بيع أو إيجار)";
    }
  }

  if (step === 2) {
    if (!v.title?.trim()) {
      errors.title = "عنوان الإعلان مطلوب";
    } else if (v.title.trim().length < 10) {
      errors.title = "العنوان قصير جداً — 10 أحرف على الأقل";
    }
    if (!v.area?.trim() || isNaN(Number(v.area)) || Number(v.area) <= 0) {
      errors.area = "المساحة مطلوبة ويجب أن تكون رقماً أكبر من صفر";
    }
  }

  if (step === 3) {
    if (!v.district?.trim()) {
      errors.district = "يرجى اختيار المنطقة";
    }
  }

  if (step === 4) {
    if (!v.phone?.trim()) {
      errors.phone = "رقم الهاتف مطلوب للتواصل";
    } else if (!/^[0-9+\s\-()]{7,20}$/.test(v.phone.trim())) {
      errors.phone = "رقم الهاتف غير صحيح";
    }
  }

  return errors;
}

/**
 * Scroll smoothly to the first invalid field and focus it.
 * Fields must have a `data-field="<key>"` attribute.
 */
export function scrollToFirstError(errors: FieldErrors): void {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;

  const el = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  // Focus the first focusable element inside
  setTimeout(() => {
    const focusable = el.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
    );
    focusable?.focus();
  }, 350);
}
