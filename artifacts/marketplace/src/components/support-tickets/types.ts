export type TicketStatus = "Replied" | "Pending" | "Closed";
export type TicketCategory = "Technical" | "Payment" | "Account" | "Other";

export interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  message: string;
  adminReply?: string | null;
}

export type StatusFilter = "All" | TicketStatus;
