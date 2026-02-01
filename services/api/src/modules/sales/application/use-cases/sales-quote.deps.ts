import {
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type AuditPort,
} from "@corely/kernel";
import type { QuoteRepositoryPort } from "../ports/quote-repository.port";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import type { SalesOrderRepositoryPort } from "../ports/order-repository.port";
import type { CustomerQueryPort } from "../../../party/application/ports/customer-query.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { type InvoiceCommandsPort } from "../../../invoices/application/ports/invoice-commands.port";

export type QuoteDeps = {
  logger: LoggerPort;
  quoteRepo: QuoteRepositoryPort;
  settingsRepo: SalesSettingsRepositoryPort;
  orderRepo: SalesOrderRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
  invoiceCommands: InvoiceCommandsPort;
};
