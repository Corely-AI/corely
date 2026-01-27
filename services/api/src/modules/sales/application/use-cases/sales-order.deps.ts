import {
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type AuditPort,
} from "@corely/kernel";
import type { SalesOrderRepositoryPort } from "../ports/order-repository.port";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import type { CustomerQueryPort } from "../../../party/application/ports/customer-query.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { type InvoiceCommandsPort } from "../../../invoices/application/ports/invoice-commands.port";

export type OrderDeps = {
  logger: LoggerPort;
  orderRepo: SalesOrderRepositoryPort;
  settingsRepo: SalesSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
  invoiceCommands: InvoiceCommandsPort;
};
