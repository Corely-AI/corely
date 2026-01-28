import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  parseLocalDate,
  RequireTenant,
} from "@corely/kernel";
import type {
  RecordBillPaymentInput,
  RecordBillPaymentOutput,
  CreateJournalEntryInput,
  PostJournalEntryInput,
} from "@corely/contracts";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { PaymentDeps } from "./purchasing-payment.deps";
import type { BillPayment } from "../../domain/purchasing.types";

@RequireTenant()
export class RecordBillPaymentUseCase extends BaseUseCase<
  RecordBillPaymentInput,
  RecordBillPaymentOutput
> {
  constructor(private readonly services: PaymentDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: RecordBillPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<RecordBillPaymentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<RecordBillPaymentOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.record-payment",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const vendorBill = await this.services.billRepo.findById(tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    if (vendorBill.totals.dueCents < input.amountCents) {
      return err(new ValidationError("Payment exceeds remaining balance"));
    }

    let settings = await this.services.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId,
        now: this.services.clock.now(),
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
    const now = this.services.clock.now();

    const payment: BillPayment = {
      id: this.services.idGenerator.newId(),
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

    const created = await this.services.accounting.createJournalEntry.execute(createInput, ctx);
    if ("error" in created) {
      return err(created.error);
    }
    const postInput: PostJournalEntryInput = { entryId: created.value.entry.id };
    const posted = await this.services.accounting.postJournalEntry.execute(postInput, ctx);
    if ("error" in posted) {
      return err(posted.error);
    }

    payment.journalEntryId = created.value.entry.id;

    try {
      vendorBill.addPayment(payment, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.services.paymentRepo.create(tenantId, payment);
    await this.services.billRepo.save(tenantId, vendorBill);
    await this.services.settingsRepo.save(settings);

    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "purchasing.bill.payment.recorded",
      entityType: "VendorBill",
      entityId: vendorBill.id,
      metadata: { paymentId: payment.id, journalEntryId: payment.journalEntryId },
    });

    const result = { vendorBill: toVendorBillDto(vendorBill) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.record-payment",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
