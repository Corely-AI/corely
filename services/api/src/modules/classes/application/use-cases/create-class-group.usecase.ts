import { ValidationFailedError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { CreateClassGroupInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassGroupEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class CreateClassGroupUseCase {
  private readonly actionKey = "classes.class-group.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: CreateClassGroupInput, ctx: UseCaseContext): Promise<ClassGroupEntity> {
    assertCanClasses(ctx, "classes.write");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    if (!input.name?.trim()) {
      throw new ValidationFailedError("name is required", [
        { message: "name is required", members: ["name"] },
      ]);
    }

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return this.fromJson(cached.body);
      }
    }

    const now = this.clock.now();
    const group: ClassGroupEntity = {
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      level: input.level.trim(),
      defaultPricePerSession: input.defaultPricePerSession,
      currency: input.currency ?? "EUR",
      schedulePattern: (input.schedulePattern as Record<string, unknown>) ?? null,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.repo.createClassGroup(group);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.class-group.created",
      entityType: "ClassGroup",
      entityId: created.id,
      metadata: { name: created.name },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(created),
      });
    }

    return created;
  }

  private toJson(group: ClassGroupEntity) {
    return {
      ...group,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }

  private fromJson(body: any): ClassGroupEntity {
    return {
      ...body,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    } as ClassGroupEntity;
  }
}
