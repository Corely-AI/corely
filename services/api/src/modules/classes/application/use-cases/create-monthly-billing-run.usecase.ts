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
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { aggregateBillingPreview } from "../../domain/rules/billing.rules";
import {
  BILLING_TIMEZONE,
  getMonthRangeUtc,
  normalizeBillingMonth,
} from "../helpers/billing-period";
import type { ClassMonthlyBillingRunEntity } from "../../domain/entities/classes.entities";
import type { ClassesBillingSettings } from "../../domain/entities/classes.entities";
import {
  CLASSES_INVOICE_READY_TO_SEND_EVENT,
  MONTHLY_INVOICES_GENERATED_EVENT,
} from "../../domain/events/monthly-invoices-generated.event";
import { DEFAULT_PREPAID_SETTINGS, normalizeBillingSettings } from "../helpers/billing-settings";
import { generateScheduledSessionStartsForMonth } from "../helpers/schedule-generator";

@RequireTenant()
export class CreateMonthlyBillingRunUseCase {
  private readonly actionKey = "classes.billing.run.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly settingsRepo: ClassesSettingsRepositoryPort,
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
    const settings = await this.resolveSettings(tenantId, workspaceId);
    const effectiveSettings = existing
      ? {
          billingMonthStrategy: existing.billingMonthStrategy ?? settings.billingMonthStrategy,
          billingBasis: existing.billingBasis ?? settings.billingBasis,
        }
      : settings;
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
        billingMonthStrategy: effectiveSettings.billingMonthStrategy,
        billingBasis: effectiveSettings.billingBasis,
        billingSnapshot: null,
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

    if (effectiveSettings.billingBasis === "SCHEDULED_SESSIONS" && run.status === "DRAFT") {
      await this.ensureScheduledSessionsForMonth(tenantId, workspaceId, month);
    }

    const { startUtc, endUtc } = getMonthRangeUtc(month);
    const rows =
      effectiveSettings.billingBasis === "SCHEDULED_SESSIONS"
        ? await this.repo.listBillableScheduledForMonth(tenantId, workspaceId, {
            monthStart: startUtc,
            monthEnd: endUtc,
          })
        : await this.repo.listBillableAttendanceForMonth(tenantId, workspaceId, {
            monthStart: startUtc,
            monthEnd: endUtc,
          });
    const previewItems = aggregateBillingPreview(rows).filter((item) => item.totalAmountCents > 0);

    const invoiceIds: string[] = [];
    if (input.createInvoices) {
      for (const item of previewItems) {
        const invoiceKey = `${tenantId}:${month}:${item.payerClientId}`;
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
            customerPartyId: item.payerClientId,
            currency: item.currency,
            lineItems: item.lines.map((line) => ({
              description: `${line.classGroupName} (${line.sessions} ${
                effectiveSettings.billingBasis === "SCHEDULED_SESSIONS" ? "scheduled" : "attended"
              } sessions)`,
              qty: line.sessions,
              unitPriceCents: line.priceCents,
            })),
            sourceType: "manual",
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
          payerClientId: item.payerClientId,
          invoiceId,
          idempotencyKey: invoiceKey,
          createdAt: this.clock.now(),
        });

        if (input.sendInvoices) {
          await this.outbox.enqueue({
            tenantId,
            eventType: CLASSES_INVOICE_READY_TO_SEND_EVENT,
            payload: {
              tenantId,
              invoiceId,
            },
          });
        }
      }

      run = await this.repo.updateBillingRun(tenantId, workspaceId, run.id, {
        billingMonthStrategy: effectiveSettings.billingMonthStrategy,
        billingBasis: effectiveSettings.billingBasis,
        billingSnapshot: {
          billMonth: month,
          strategy: effectiveSettings.billingMonthStrategy,
          basis: effectiveSettings.billingBasis,
          items: previewItems,
        },
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
      metadata: {
        month,
        invoiceCount: invoiceIds.length,
        billingMonthStrategy: effectiveSettings.billingMonthStrategy,
        billingBasis: effectiveSettings.billingBasis,
      },
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
        metadata: {
          invoiceCount: invoiceIds.length,
          billingMonthStrategy: effectiveSettings.billingMonthStrategy,
          billingBasis: effectiveSettings.billingBasis,
        },
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

  private async resolveSettings(
    tenantId: string,
    workspaceId: string
  ): Promise<ClassesBillingSettings> {
    return normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );
  }

  private async ensureScheduledSessionsForMonth(
    tenantId: string,
    workspaceId: string,
    month: string
  ) {
    const groups = await this.repo.listClassGroupsWithSchedulePattern(tenantId, workspaceId);
    if (groups.length === 0) {
      return;
    }

    const now = this.clock.now();

    for (const group of groups) {
      const startsAtList = generateScheduledSessionStartsForMonth({
        schedulePattern: group.schedulePattern ?? null,
        month,
        timezone: BILLING_TIMEZONE,
      });

      for (const startsAt of startsAtList) {
        await this.repo.upsertSession({
          id: this.idGenerator.newId(),
          tenantId,
          workspaceId,
          classGroupId: group.id,
          startsAt,
          endsAt: null,
          topic: null,
          notes: null,
          status: "PLANNED",
          createdAt: now,
          updatedAt: now,
        });
      }
    }
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
