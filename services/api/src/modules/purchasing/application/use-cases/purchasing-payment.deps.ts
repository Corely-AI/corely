import {
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type AuditPort,
} from "@corely/kernel";
import type { VendorBillRepositoryPort } from "../ports/vendor-bill-repository.port";
import type { BillPaymentRepositoryPort } from "../ports/bill-payment-repository.port";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { AccountingApplication } from "../../../accounting/application/accounting.application";

export type PaymentDeps = {
  logger: LoggerPort;
  billRepo: VendorBillRepositoryPort;
  paymentRepo: BillPaymentRepositoryPort;
  settingsRepo: PurchasingSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  accounting: AccountingApplication;
  audit: AuditPort;
};
