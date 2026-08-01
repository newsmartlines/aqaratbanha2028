export type TicketStatus = "Replied" | "Pending" | "Closed";
export type TicketCategory = "Technical" | "Payment" | "Account" | "Other";

export interface TicketMessage {
  role: "provider" | "admin";
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  message: string;
  adminReply?: string | null;
  messages: TicketMessage[];
}

export type StatusFilter = "All" | TicketStatus;
