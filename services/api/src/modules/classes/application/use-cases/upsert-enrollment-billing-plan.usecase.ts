import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { UpsertEnrollmentBillingPlanInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortBillingManage } from "../../policies/assert-can-classes";
import { validateBillingPlan } from "../../domain/rules/billing-plan.rules";
import { CLASSES_ENROLLMENT_BILLING_PLAN_UPDATED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassEnrollmentBillingPlanEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class UpsertEnrollmentBillingPlanUseCase {
  private readonly actionKey = "classes.enrollment.billing-plan.upsert";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: UpsertEnrollmentBillingPlanInput & { enrollmentId: string },
    ctx: UseCaseContext
  ): Promise<ClassEnrollmentBillingPlanEntity> {
    assertCanCohortBillingManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const enrollment = await this.repo.findEnrollmentById(
      tenantId,
      workspaceId,
      input.enrollmentId
    );
    if (!enrollment) {
      throw new NotFoundError("Enrollment not found", { code: "Classes:EnrollmentNotFound" });
    }

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return this.fromJson(cached.body);
      }
    }

    validateBillingPlan({
      type: input.type,
      scheduleJson: input.scheduleJson,
    });

    const now = this.clock.now();
    const saved = await this.repo.upsertEnrollmentBillingPlan(
      tenantId,
      workspaceId,
      input.enrollmentId,
      {
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        enrollmentId: input.enrollmentId,
        type: input.type,
        scheduleJson: input.scheduleJson as Record<string, unknown>,
        createdAt: now,
        updatedAt: now,
      }
    );

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_ENROLLMENT_BILLING_PLAN_UPDATED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: enrollment.classGroupId,
        enrollmentId: enrollment.id,
        billingPlanType: saved.type,
        at: now.toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.enrollment.billing-plan.updated",
      entityType: "ClassEnrollment",
      entityId: input.enrollmentId,
      metadata: {
        billingPlanType: saved.type,
      },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(saved),
      });
    }

    return saved;
  }

  private toJson(entity: ClassEnrollmentBillingPlanEntity) {
    return {
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private fromJson(body: any): ClassEnrollmentBillingPlanEntity {
    return {
      ...body,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    } as ClassEnrollmentBillingPlanEntity;
  }
}
