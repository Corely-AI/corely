import { ConflictError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, type UseCaseContext, isErr } from "@corely/kernel";
import type { CreateBillingRunInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { InvoicesWritePort } from "../ports/invoices-write.port";
import type { AuditPort } from "../ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
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

    if (idempotencyKey && !input.force) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, idempotencyKey);
      if (cached?.body) {
        const invoiceIds = cached.body.invoiceIds ?? [];
        const status = cached.body.billingRun?.status;
        // Only return cached result if invoices were created or the run is locked/finalized
        // This allows retrying empty runs (e.g. after changing settings)
        if (invoiceIds.length > 0 || status === "LOCKED") {
          return {
            billingRun: this.fromJson(cached.body.billingRun),
            invoiceIds,
          };
        }
      }
    }

    const existing = await this.repo.findBillingRunByMonth(tenantId, workspaceId, month);
    const settings = await this.resolveSettings(tenantId, workspaceId);

    let effectiveSettings = settings;
    let run: ClassMonthlyBillingRunEntity;
    let existingLinks: Awaited<ReturnType<ClassesRepositoryPort["listBillingInvoiceLinks"]>> = [];

    if (existing) {
      // If a run exists but hasn't created any invoices, we allow it to sync with current global settings.
      // This handles cases where settings were changed after a placeholder run was created.
      existingLinks = await this.repo.listBillingInvoiceLinks(tenantId, workspaceId, existing.id);
      if (existingLinks.length === 0 && existing.status !== "LOCKED") {
        effectiveSettings = settings;
        // If it was previously marked as INVOICES_CREATED but had 0 invoices,
        // we reset it to DRAFT to allow session generation etc.
        if (existing.status === "INVOICES_CREATED") {
          existing.status = "DRAFT";
        }
      } else {
        effectiveSettings = {
          billingMonthStrategy: existing.billingMonthStrategy ?? settings.billingMonthStrategy,
          billingBasis: existing.billingBasis ?? settings.billingBasis,
          attendanceMode: settings.attendanceMode,
        };
      }
      run = existing;
      if (input.force && run.status !== "LOCKED") {
        if (existingLinks.length > 0) {
          for (const link of existingLinks) {
            const cancelResult = await this.invoices.cancel(
              {
                invoiceId: link.invoiceId,
                reason: "Regenerated class billing run",
              },
              ctx
            );
            if (isErr(cancelResult)) {
              throw cancelResult.error;
            }
          }
        }
        await this.repo.deleteBillingInvoiceLinks(tenantId, workspaceId, run.id);
        // Reset status to DRAFT so it behaves like a fresh run
        run.status = "DRAFT";
        run.billingSnapshot = null;
      }
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
        const finalizeResult = await this.invoices.finalize({ invoiceId }, ctx);
        if (isErr(finalizeResult)) {
          await this.repo.updateBillingRun(tenantId, workspaceId, run.id, {
            status: "FAILED",
            updatedAt: this.clock.now(),
          });
          throw finalizeResult.error;
        }
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

    if (input.sendInvoices) {
      const invoiceIdsToSend = input.createInvoices
        ? invoiceIds
        : existingLinks.map((link) => link.invoiceId);
      const uniqueInvoiceIds = Array.from(new Set(invoiceIdsToSend));
      if (uniqueInvoiceIds.length > 0) {
        await this.ensureInvoicesHaveRecipientEmail(tenantId, uniqueInvoiceIds);

        for (const invoiceId of uniqueInvoiceIds) {
          await this.outbox.enqueue({
            tenantId,
            eventType: CLASSES_INVOICE_READY_TO_SEND_EVENT,
            payload: {
              tenantId,
              invoiceId,
            },
          });
        }

        const sentAt = this.clock.now();
        run = await this.repo.updateBillingRun(tenantId, workspaceId, run.id, {
          billingSnapshot: {
            ...(typeof run.billingSnapshot === "object" && run.billingSnapshot
              ? run.billingSnapshot
              : {}),
            sentAt: sentAt.toISOString(),
            sentInvoiceCount: uniqueInvoiceIds.length,
          },
          updatedAt: sentAt,
        });
      }
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
      try {
        await this.idempotency.store(this.actionKey, tenantId, idempotencyKey, {
          body: {
            billingRun: this.toJson(run),
            invoiceIds,
          },
        });
      } catch (error: any) {
        // For re-send flows, the same idempotency key may already exist with an empty invoiceIds payload.
        // Do not fail the send operation if only the idempotency write collides.
        if (error?.code !== "P2002" && !String(error?.message ?? "").includes("P2002")) {
          throw error;
        }
      }
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

  private async ensureInvoicesHaveRecipientEmail(tenantId: string, invoiceIds: string[]) {
    if (!this.repo.getInvoiceRecipientEmailsByIds) {
      return;
    }

    const recipients = await this.repo.getInvoiceRecipientEmailsByIds(tenantId, invoiceIds);
    const emailByInvoiceId = new Map(recipients.map((item) => [item.invoiceId, item.email]));
    const missingInvoiceIds = invoiceIds.filter((invoiceId) => !emailByInvoiceId.get(invoiceId));

    if (missingInvoiceIds.length > 0) {
      throw new ValidationFailedError(
        "Cannot send invoices until all students have a payer email",
        [
          {
            message: `Missing payer email for ${missingInvoiceIds.length} invoice(s): ${missingInvoiceIds.join(", ")}`,
            members: ["sendInvoices"],
          },
        ]
      );
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
