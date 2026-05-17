import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { providersTable } from "./providers";

/**
 * Per-provider running wallet balance, credited when a paid service request completes.
 */
export const providerBalancesTable = pgTable("provider_balances", {
  providerId: integer("provider_id")
    .primaryKey()
    .references(() => providersTable.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Append-only ledger of money movements: provider credits, admin commissions, payouts.
 *   type='request_payment'  -> credit to provider for paid service request
 *   type='commission'       -> credit to platform/admin balance
 *   type='payout'           -> debit from provider when paid out
 *   type='refund'           -> debit from provider for cancellations
 */
export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => providersTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  refId: text("ref_id"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProviderBalance = typeof providerBalancesTable.$inferSelect;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
