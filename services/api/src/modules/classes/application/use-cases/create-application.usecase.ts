import { NotFoundError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { CreateApplicationInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanEnrollmentManage } from "../../policies/assert-can-classes";
import { CLASSES_ENROLLMENT_APPLIED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassEnrollmentEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class CreateApplicationUseCase {
  private readonly actionKey = "classes.enrollment.application.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: CreateApplicationInput & { classGroupId: string },
    ctx: UseCaseContext
  ): Promise<ClassEnrollmentEntity> {
    assertCanEnrollmentManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    if (!input.studentClientId || !input.payerClientId) {
      throw new ValidationFailedError("studentClientId and payerClientId are required", [
        { message: "studentClientId is required", members: ["studentClientId"] },
        { message: "payerClientId is required", members: ["payerClientId"] },
      ]);
    }

    const group = await this.repo.findClassGroupById(tenantId, workspaceId, input.classGroupId);
    if (!group) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return this.fromJson(cached.body);
      }
    }

    const now = this.clock.now();
    const enrollment = await this.repo.upsertEnrollment(
      tenantId,
      workspaceId,
      input.classGroupId,
      input.studentClientId,
      {
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        classGroupId: input.classGroupId,
        studentClientId: input.studentClientId,
        payerClientId: input.payerClientId,
        payerPartyId: input.payerPartyId ?? null,
        status: "APPLIED",
        seatType: input.seatType ?? "LEARNER",
        source: input.source ?? "ADMIN",
        startDate: null,
        endDate: null,
        isActive: true,
        priceOverridePerSession: null,
        priceCents: null,
        currency: null,
        discountCents: null,
        discountLabel: null,
        placementLevel: input.placementLevel ?? null,
        placementGoal: input.placementGoal ?? null,
        placementNote: input.placementNote ?? null,
        createdAt: now,
        updatedAt: now,
      }
    );

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_ENROLLMENT_APPLIED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: input.classGroupId,
        enrollmentId: enrollment.id,
        at: now.toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.enrollment.application.created",
      entityType: "ClassEnrollment",
      entityId: enrollment.id,
      metadata: {
        classGroupId: enrollment.classGroupId,
        studentClientId: enrollment.studentClientId,
      },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(enrollment),
      });
    }

    return enrollment;
  }

  private toJson(entity: ClassEnrollmentEntity) {
    return {
      ...entity,
      startDate: entity.startDate ? entity.startDate.toISOString().slice(0, 10) : null,
      endDate: entity.endDate ? entity.endDate.toISOString().slice(0, 10) : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private fromJson(body: any): ClassEnrollmentEntity {
    return {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    } as ClassEnrollmentEntity;
  }
}
