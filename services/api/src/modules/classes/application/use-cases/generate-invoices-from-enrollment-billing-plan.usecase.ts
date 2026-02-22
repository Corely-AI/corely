import { ConflictError, NotFoundError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, isErr, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { GenerateBillingPlanInvoicesInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { InvoicesWritePort } from "../ports/invoices-write.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortBillingManage } from "../../policies/assert-can-classes";
import {
  CLASSES_INVOICE_GENERATED_EVENT,
  CLASSES_INVOICE_READY_TO_SEND_EVENT,
} from "../../domain/events/monthly-invoices-generated.event";
import type {
  BillingInvoicePurpose,
  ClassBillingInvoiceLinkEntity,
} from "../../domain/entities/classes.entities";

type InvoiceTarget = {
  amountCents: number;
  currency: string;
  dueDate?: string;
  label?: string;
};

@RequireTenant()
export class GenerateInvoicesFromEnrollmentBillingPlanUseCase {
  private readonly actionKey = "classes.enrollment.billing-plan.generate-invoices";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly invoices: InvoicesWritePort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: GenerateBillingPlanInvoicesInput & { enrollmentId: string },
    ctx: UseCaseContext
  ): Promise<{ invoiceIds: string[]; links: ClassBillingInvoiceLinkEntity[] }> {
    assertCanCohortBillingManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    if (!input.idempotencyKey?.trim()) {
      throw new ValidationFailedError("Idempotency-Key is required", [
        {
          message: "Provide Idempotency-Key header for generate-invoices",
          members: ["idempotencyKey"],
        },
      ]);
    }

    const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
    if (cached?.body) {
      const body = cached.body as {
        invoiceIds?: string[];
        links?: Array<ClassBillingInvoiceLinkEntity & { createdAt?: Date | string }>;
      };
      return {
        invoiceIds: Array.isArray(body.invoiceIds) ? body.invoiceIds : [],
        links: Array.isArray(body.links)
          ? body.links.map((link) => ({
              ...link,
              createdAt:
                link.createdAt instanceof Date
                  ? link.createdAt
                  : new Date(link.createdAt ?? this.clock.now().toISOString()),
            }))
          : [],
      };
    }

    const enrollment = await this.repo.findEnrollmentById(
      tenantId,
      workspaceId,
      input.enrollmentId
    );
    if (!enrollment) {
      throw new NotFoundError("Enrollment not found", { code: "Classes:EnrollmentNotFound" });
    }
    if (enrollment.status !== "ENROLLED") {
      throw new ConflictError("Invoices can only be generated for ENROLLED enrollments", {
        code: "Classes:EnrollmentNotEnrolled",
      });
    }

    const plan = await this.repo.findEnrollmentBillingPlan(
      tenantId,
      workspaceId,
      input.enrollmentId
    );
    if (!plan) {
      throw new NotFoundError("Enrollment billing plan not found", {
        code: "Classes:BillingPlanNotFound",
      });
    }

    const { targets, purpose } = this.resolveInvoiceTargets(plan.type, plan.scheduleJson);

    const invoiceIds: string[] = [];
    const links: ClassBillingInvoiceLinkEntity[] = [];

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const lineIdempotencyKey = `${input.idempotencyKey}:${index + 1}`;
      const existingLink = await this.repo.findBillingInvoiceLinkByIdempotency(
        tenantId,
        workspaceId,
        lineIdempotencyKey
      );

      if (existingLink) {
        invoiceIds.push(existingLink.invoiceId);
        links.push(existingLink);
        continue;
      }

      const created = await this.invoices.createDraft(
        {
          customerPartyId: enrollment.payerClientId,
          currency: target.currency,
          lineItems: [
            {
              description: target.label ?? `Enrollment plan (${plan.type})`,
              qty: 1,
              unitPriceCents: target.amountCents,
            },
          ],
          sourceType: "manual",
          sourceId: plan.id,
          idempotencyKey: lineIdempotencyKey,
        },
        ctx
      );

      if (isErr(created)) {
        throw created.error;
      }

      const invoiceId = created.value.invoice.id;
      const finalized = await this.invoices.finalize({ invoiceId }, ctx);
      if (isErr(finalized)) {
        throw finalized.error;
      }

      const link = await this.repo.createBillingInvoiceLink({
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        billingRunId: null,
        enrollmentId: enrollment.id,
        payerClientId: enrollment.payerClientId,
        classGroupId: enrollment.classGroupId,
        invoiceId,
        idempotencyKey: lineIdempotencyKey,
        purpose,
        createdAt: this.clock.now(),
      });

      await this.outbox.enqueue({
        tenantId,
        eventType: CLASSES_INVOICE_GENERATED_EVENT,
        payload: {
          tenantId,
          workspaceId,
          classGroupId: enrollment.classGroupId,
          enrollmentId: enrollment.id,
          invoiceId,
          purpose,
          at: this.clock.now().toISOString(),
        },
      });

      if (input.sendInvoices) {
        await this.outbox.enqueue({
          tenantId: workspaceId,
          eventType: CLASSES_INVOICE_READY_TO_SEND_EVENT,
          payload: {
            tenantId: workspaceId,
            invoiceId,
          },
        });
      }

      invoiceIds.push(invoiceId);
      links.push(link);
    }

    const output = { invoiceIds, links };

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.enrollment.billing-plan.invoices.generated",
      entityType: "ClassEnrollment",
      entityId: enrollment.id,
      metadata: {
        planType: plan.type,
        invoiceCount: invoiceIds.length,
        purpose,
      },
    });

    await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
      body: output,
    });

    return output;
  }

  private resolveInvoiceTargets(
    type: string,
    scheduleJson: Record<string, unknown>
  ): { targets: InvoiceTarget[]; purpose: BillingInvoicePurpose } {
    const payload = scheduleJson as any;

    if (type === "UPFRONT") {
      return {
        purpose: "FINAL",
        targets: [
          {
            amountCents: Number(payload?.data?.amountCents ?? payload?.amountCents ?? 0),
            currency: String(payload?.data?.currency ?? payload?.currency ?? "EUR"),
            dueDate: payload?.data?.dueDate ?? payload?.dueDate,
            label: payload?.data?.label ?? payload?.label,
          },
        ],
      };
    }

    if (type === "INSTALLMENTS") {
      const installments = Array.isArray(payload?.data?.installments)
        ? payload.data.installments
        : Array.isArray(payload?.installments)
          ? payload.installments
          : [];
      const currency = String(payload?.data?.currency ?? payload?.currency ?? "EUR");
      return {
        purpose: "INSTALLMENT",
        targets: installments.map((item: any) => ({
          amountCents: Number(item.amountCents ?? 0),
          currency,
          dueDate: item.dueDate,
          label: item.label,
        })),
      };
    }

    if (type === "INVOICE_NET") {
      return {
        purpose: "ADHOC",
        targets: [
          {
            amountCents: Number(payload?.data?.amountCents ?? payload?.amountCents ?? 0),
            currency: String(payload?.data?.currency ?? payload?.currency ?? "EUR"),
            label: payload?.data?.purchaseOrderNumber,
          },
        ],
      };
    }

    throw new ValidationFailedError(
      `Unsupported billing plan type for invoice generation: ${type}`,
      [
        {
          message: "Only UPFRONT, INSTALLMENTS, INVOICE_NET are supported",
          members: ["type"],
        },
      ]
    );
  }
}
