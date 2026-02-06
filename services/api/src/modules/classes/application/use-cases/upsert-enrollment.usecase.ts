import { NotFoundError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpsertEnrollmentInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassEnrollmentEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class UpsertEnrollmentUseCase {
  private readonly actionKey = "classes.enrollment.upsert";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: UpsertEnrollmentInput, ctx: UseCaseContext): Promise<ClassEnrollmentEntity> {
    assertCanClasses(ctx, "classes.write");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    if (!input.classGroupId || !input.studentClientId || !input.payerClientId) {
      throw new ValidationFailedError(
        "classGroupId, studentClientId, and payerClientId are required",
        [
          { message: "classGroupId is required", members: ["classGroupId"] },
          { message: "studentClientId is required", members: ["studentClientId"] },
          { message: "payerClientId is required", members: ["payerClientId"] },
        ]
      );
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
    const enrollment: ClassEnrollmentEntity = {
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId,
      classGroupId: input.classGroupId,
      studentClientId: input.studentClientId,
      payerClientId: input.payerClientId,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      isActive: input.isActive ?? true,
      priceOverridePerSession: input.priceOverridePerSession ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await this.repo.upsertEnrollment(
      tenantId,
      workspaceId,
      input.classGroupId,
      input.studentClientId,
      enrollment
    );

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.enrollment.upserted",
      entityType: "ClassEnrollment",
      entityId: saved.id,
      metadata: {
        studentClientId: saved.studentClientId,
        payerClientId: saved.payerClientId,
        classGroupId: saved.classGroupId,
      },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(saved),
      });
    }

    return saved;
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
