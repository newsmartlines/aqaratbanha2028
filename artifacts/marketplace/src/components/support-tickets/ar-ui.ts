import type { StatusFilter, TicketCategory, TicketStatus } from "./types";

/** Arabic UI copy keyed by English enum / filter values (logic unchanged). */
export const arStatusFilterLabel: Record<StatusFilter, string> = {
  All: "الكل",
  Replied: "تم الرد",
  Pending: "قيد المعالجة",
  Closed: "مغلقة",
};

export const arTicketStatusLabel: Record<TicketStatus, string> = {
  Replied: "تم الرد",
  Pending: "قيد الانتظار",
  Closed: "مغلقة",
};

export const arTicketCategoryLabel: Record<TicketCategory, string> = {
  Technical: "الدعم الفني",
  Payment: "المدفوعات والفوترة",
  Account: "الحساب والصلاحيات",
  Other: "أخرى",
};
