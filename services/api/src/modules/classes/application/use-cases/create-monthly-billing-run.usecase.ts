import { ConflictError } from "@corely/domain";
import { RequireTenant, type UseCaseContext, isErr } from "@corely/kernel";
import type { CreateBillingRunInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { InvoicesWritePort } from "../ports/invoices-write.port";
import type { AuditPort } from "../ports/audit.port";
import type { OutboxPort } from "../ports/outbox.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { aggregateBillingPreview } from "../../domain/rules/billing.rules";
import { getMonthRangeUtc, normalizeBillingMonth } from "../helpers/billing-period";
import type { ClassMonthlyBillingRunEntity } from "../../domain/entities/classes.entities";
import { MONTHLY_INVOICES_GENERATED_EVENT } from "../../domain/events/monthly-invoices-generated.event";

@RequireTenant()
export class CreateMonthlyBillingRunUseCase {
  private readonly actionKey = "classes.billing.run.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly invoices: InvoicesWritePort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: CreateBillingRunInput, ctx: UseCaseContext) {
    assertCanClasses(ctx, "classes.billing");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const month = normalizeBillingMonth(input.month);
    const idempotencyKey = input.idempotencyKey ?? `${tenantId}:${month}`;

    if (idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, idempotencyKey);
      if (cached?.body) {
        return {
          billingRun: this.fromJson(cached.body.billingRun),
          invoiceIds: cached.body.invoiceIds ?? [],
        };
      }
    }

    const existing = await this.repo.findBillingRunByMonth(tenantId, workspaceId, month);
    let run: ClassMonthlyBillingRunEntity;
    if (existing) {
      run = existing;
    } else {
      const now = this.clock.now();
      run = await this.repo.createBillingRun({
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        month,
        status: "DRAFT",
        runId: this.idGenerator.newId(),
        generatedAt: null,
        createdByUserId: ctx.userId ?? "system",
        createdAt: now,
        updatedAt: now,
      });
    }

    if (run.status === "LOCKED") {
      throw new ConflictError("Billing month is locked", { code: "Classes:BillingLocked" });
    }

    const { startUtc, endUtc } = getMonthRangeUtc(month);
    const rows = await this.repo.listBillableAttendanceForMonth(tenantId, workspaceId, {
      monthStart: startUtc,
      monthEnd: endUtc,
    });
    const previewItems = aggregateBillingPreview(rows).filter((item) => item.totalAmountCents > 0);

    const invoiceIds: string[] = [];
    if (input.createInvoices) {
      for (const item of previewItems) {
        const invoiceKey = `${tenantId}:${month}:${item.clientId}`;
        const existingLink = await this.repo.findBillingInvoiceLinkByIdempotency(
          tenantId,
          workspaceId,
          invoiceKey
        );
        if (existingLink) {
          invoiceIds.push(existingLink.invoiceId);
          continue;
        }

        const result = await this.invoices.createDraft(
          {
            customerPartyId: item.clientId,
            currency: item.currency,
            lineItems: item.lines.map((line) => ({
              description: `${line.classGroupName} (${line.sessions} sessions)`,
              qty: line.sessions,
              unitPriceCents: line.priceCents,
            })),
            sourceType: "classes.billing",
            sourceId: run.id,
            idempotencyKey: invoiceKey,
          },
          ctx
        );

        if (isErr(result)) {
          await this.repo.updateBillingRun(tenantId, workspaceId, run.id, {
            status: "FAILED",
            updatedAt: this.clock.now(),
          });
          throw result.error;
        }

        const invoiceId = result.value.invoice.id;
        invoiceIds.push(invoiceId);

        await this.repo.createBillingInvoiceLink({
          id: this.idGenerator.newId(),
          tenantId,
          workspaceId,
          billingRunId: run.id,
          clientId: item.clientId,
          invoiceId,
          idempotencyKey: invoiceKey,
          createdAt: this.clock.now(),
        });

        if (input.sendInvoices) {
          const sendResult = await this.invoices.send({ invoiceId }, ctx);
          if (isErr(sendResult)) {
            throw sendResult.error;
          }
        }
      }

      run = await this.repo.updateBillingRun(tenantId, workspaceId, run.id, {
        status: "INVOICES_CREATED",
        generatedAt: this.clock.now(),
        updatedAt: this.clock.now(),
      });
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.billing.run.created",
      entityType: "ClassMonthlyBillingRun",
      entityId: run.id,
      metadata: { month, invoiceCount: invoiceIds.length },
    });

    if (input.createInvoices) {
      await this.outbox.enqueue({
        tenantId,
        eventType: MONTHLY_INVOICES_GENERATED_EVENT,
        payload: {
          tenantId,
          month,
          billingRunId: run.id,
          invoiceIds,
        },
      });

      await this.audit.log({
        tenantId,
        userId: ctx.userId ?? "system",
        action: "classes.billing.invoices.created",
        entityType: "ClassMonthlyBillingRun",
        entityId: run.id,
        metadata: { invoiceCount: invoiceIds.length },
      });
    }

    const output = { billingRun: run, invoiceIds };

    if (idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, idempotencyKey, {
        body: {
          billingRun: this.toJson(run),
          invoiceIds,
        },
      });
    }

    return output;
  }

  private toJson(run: ClassMonthlyBillingRunEntity) {
    return {
      ...run,
      generatedAt: run.generatedAt ? run.generatedAt.toISOString() : null,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    };
  }

  private fromJson(body: any): ClassMonthlyBillingRunEntity {
    return {
      ...body,
      generatedAt: body.generatedAt ? new Date(body.generatedAt) : null,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    } as ClassMonthlyBillingRunEntity;
  }
}
