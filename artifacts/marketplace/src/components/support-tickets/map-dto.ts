import type { SupportTicketDto } from "@/lib/api";
import type { SupportTicket, TicketCategory, TicketStatus } from "./types";

const CATS = new Set<string>(["Technical", "Payment", "Account", "Other"]);
const STATS = new Set<string>(["Replied", "Pending", "Closed"]);

export function mapSupportTicketDto(d: SupportTicketDto): SupportTicket {
  return {
    id: d.id,
    subject: d.subject,
    category: (CATS.has(d.category) ? d.category : "Other") as TicketCategory,
    status: (STATS.has(d.status) ? d.status : "Pending") as TicketStatus,
    message: d.message,
    adminReply: d.adminReply ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
