import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  type AuditPort,
  err,
  ok,
  parseLocalDate,
} from "@kerniflow/kernel";
import type {
  RecordBillPaymentInput,
  RecordBillPaymentOutput,
  ListBillPaymentsInput,
  ListBillPaymentsOutput,
  CreateJournalEntryInput,
  PostJournalEntryInput,
} from "@kerniflow/contracts";
import type { VendorBillRepositoryPort } from "../ports/vendor-bill-repository.port";
import type { BillPaymentRepositoryPort } from "../ports/bill-payment-repository.port";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toBillPaymentDto, toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import type { IdempotencyStoragePort } from "../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { AccountingApplication } from "../../accounting/application/accounting.application";
import type { BillPayment } from "../../domain/purchasing.types";

type PaymentDeps = {
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

export class RecordBillPaymentUseCase extends BaseUseCase<
  RecordBillPaymentInput,
  RecordBillPaymentOutput
> {
  constructor(private readonly deps: PaymentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: RecordBillPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<RecordBillPaymentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<RecordBillPaymentOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "purchasing.record-payment",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const vendorBill = await this.deps.billRepo.findById(ctx.tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    if (vendorBill.totals.dueCents < input.amountCents) {
      return err(new ValidationError("Payment exceeds remaining balance"));
    }

    let settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now: this.deps.clock.now(),
      });
    }

    if (!settings.defaultAccountsPayableAccountId) {
      return err(new ValidationError("Default AP account is required for payments"));
    }

    const bankAccountId = input.bankAccountId || settings.defaultBankAccountId;
    if (!bankAccountId) {
      return err(new ValidationError("Bank account is required for payment posting"));
    }

    const paymentDate = parseLocalDate(input.paymentDate);
    const now = this.deps.clock.now();

    const payment: BillPayment = {
      id: this.deps.idGenerator.newId(),
      vendorBillId: vendorBill.id,
      amountCents: input.amountCents,
      currency: input.currency,
      paymentDate,
      method: input.method,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      recordedAt: now,
      recordedByUserId: ctx.userId,
      journalEntryId: null,
    };

    const createInput: CreateJournalEntryInput = {
      postingDate: paymentDate,
      memo: `Payment for Vendor Bill ${vendorBill.billNumber ?? vendorBill.id}`,
      lines: [
        {
          ledgerAccountId: settings.defaultAccountsPayableAccountId,
          direction: "Debit",
          amountCents: payment.amountCents,
          currency: payment.currency,
        },
        {
          ledgerAccountId: bankAccountId,
          direction: "Credit",
          amountCents: payment.amountCents,
          currency: payment.currency,
        },
      ],
      sourceType: "BillPayment",
      sourceId: payment.id,
      sourceRef: vendorBill.billNumber ?? undefined,
    };

    const created = await this.deps.accounting.createJournalEntry.execute(createInput, ctx);
    if (!created.ok) {
      return err(created.error);
    }
    const postInput: PostJournalEntryInput = { entryId: created.value.entry.id };
    const posted = await this.deps.accounting.postJournalEntry.execute(postInput, ctx);
    if (!posted.ok) {
      return err(posted.error);
    }

    payment.journalEntryId = created.value.entry.id;

    try {
      vendorBill.addPayment(payment, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.deps.paymentRepo.create(ctx.tenantId, payment);
    await this.deps.billRepo.save(ctx.tenantId, vendorBill);
    await this.deps.settingsRepo.save(settings);

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.bill.payment.recorded",
      entityType: "VendorBill",
      entityId: vendorBill.id,
      metadata: { paymentId: payment.id, journalEntryId: payment.journalEntryId },
    });

    const result = { vendorBill: toVendorBillDto(vendorBill) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "purchasing.record-payment",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class ListBillPaymentsUseCase extends BaseUseCase<
  ListBillPaymentsInput,
  ListBillPaymentsOutput
> {
  constructor(private readonly deps: PaymentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListBillPaymentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListBillPaymentsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const payments = await this.deps.paymentRepo.listByBill(ctx.tenantId, input.vendorBillId);

    return ok({ payments: payments.map(toBillPaymentDto) });
  }
}
