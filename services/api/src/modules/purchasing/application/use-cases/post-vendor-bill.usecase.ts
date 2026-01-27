import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type {
  PostVendorBillInput,
  PostVendorBillOutput,
  CreateJournalEntryInput,
  PostJournalEntryInput,
} from "@corely/contracts";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { VendorBillDeps } from "./purchasing-bill.deps";
import { resolveAccountForLine } from "./purchasing-bill.deps";

@RequireTenant()
export class PostVendorBillUseCase extends BaseUseCase<PostVendorBillInput, PostVendorBillOutput> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: PostVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<PostVendorBillOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<PostVendorBillOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.post-bill",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const vendorBill = await this.services.repo.findById(tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
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
      return err(new ValidationError("Default AP account is required for posting"));
    }

    const accountIds: string[] = [];
    for (let idx = 0; idx < vendorBill.lineItems.length; idx += 1) {
      const line = vendorBill.lineItems[idx];
      const resolved = await resolveAccountForLine({
        line,
        tenantId,
        supplierPartyId: vendorBill.supplierPartyId,
        mappingRepo: this.services.mappingRepo,
        defaultExpenseAccountId: settings.defaultExpenseAccountId,
      });
      if (!resolved) {
        return err(
          new ValidationError(
            `Missing GL account mapping for line ${idx + 1}`,
            { lineIndex: idx },
            "MISSING_GL_MAPPING"
          )
        );
      }
      accountIds.push(resolved);
    }

    const debitBuckets = new Map<string, number>();
    vendorBill.lineItems.forEach((line, idx) => {
      const accountId = accountIds[idx];
      const amount = line.quantity * line.unitCostCents;
      debitBuckets.set(accountId, (debitBuckets.get(accountId) ?? 0) + amount);
    });

    const createInput: CreateJournalEntryInput = {
      postingDate: vendorBill.billDate,
      memo: `Vendor Bill ${vendorBill.billNumber ?? vendorBill.id} posted`,
      lines: [
        ...Array.from(debitBuckets.entries()).map(([ledgerAccountId, amountCents]) => ({
          ledgerAccountId,
          direction: "Debit" as const,
          amountCents,
          currency: vendorBill.currency,
        })),
        {
          ledgerAccountId: settings.defaultAccountsPayableAccountId,
          direction: "Credit" as const,
          amountCents: vendorBill.totals.totalCents,
          currency: vendorBill.currency,
        },
      ],
      sourceType: "VendorBill",
      sourceId: vendorBill.id,
      sourceRef: vendorBill.billNumber ?? undefined,
    };

    const created = await this.services.accounting.createJournalEntry.execute(createInput, ctx);
    if ("error" in created) {
      return err(created.error);
    }

    const postInput: PostJournalEntryInput = {
      entryId: created.value.entry.id,
    };
    const posted = await this.services.accounting.postJournalEntry.execute(postInput, ctx);
    if ("error" in posted) {
      return err(posted.error);
    }

    const now = this.services.clock.now();
    try {
      vendorBill.setPostedJournalEntry(created.value.entry.id, now);
      vendorBill.post(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.services.repo.save(tenantId, vendorBill);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "purchasing.bill.posted",
      entityType: "VendorBill",
      entityId: vendorBill.id,
      metadata: { journalEntryId: created.value.entry.id },
    });

    const result = { vendorBill: toVendorBillDto(vendorBill) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.post-bill",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
