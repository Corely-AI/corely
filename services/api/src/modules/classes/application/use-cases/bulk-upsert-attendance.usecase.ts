import { ForbiddenError, NotFoundError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { BulkUpsertAttendanceInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { resolveBillableForStatus } from "../../domain/rules/attendance.rules";
import { getMonthKeyForInstant } from "../helpers/billing-period";
import type { ClassAttendanceEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class BulkUpsertAttendanceUseCase {
  private readonly actionKey = "classes.attendance.bulk-upsert";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: BulkUpsertAttendanceInput & { sessionId: string },
    ctx: UseCaseContext
  ): Promise<ClassAttendanceEntity[]> {
    assertCanClasses(ctx, "classes.write");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    if (!input.items?.length) {
      throw new ValidationFailedError("items are required", [
        { message: "items are required", members: ["items"] },
      ]);
    }

    const session = await this.repo.findSessionById(tenantId, workspaceId, input.sessionId);
    if (!session) {
      throw new NotFoundError("Session not found", { code: "Classes:SessionNotFound" });
    }

    const monthKey = getMonthKeyForInstant(session.startsAt);
    const locked = await this.repo.isMonthLocked(tenantId, workspaceId, monthKey);
    if (locked) {
      throw new ForbiddenError("Month is locked for attendance changes", "Classes:MonthLocked");
    }

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return this.fromJson(cached.body);
      }
    }

    const now = this.clock.now();
    const entities: ClassAttendanceEntity[] = input.items.map((item) => ({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId,
      sessionId: input.sessionId,
      enrollmentId: item.enrollmentId,
      status: item.status,
      billable: resolveBillableForStatus(item.status, item.billable),
      note: item.note ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    const saved = await this.repo.bulkUpsertAttendance(
      tenantId,
      workspaceId,
      input.sessionId,
      entities
    );

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.attendance.bulk_updated",
      entityType: "ClassSession",
      entityId: input.sessionId,
      metadata: { count: saved.length },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(saved),
      });
    }

    return saved;
  }

  private toJson(items: ClassAttendanceEntity[]) {
    return items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  private fromJson(body: any): ClassAttendanceEntity[] {
    if (!Array.isArray(body)) {
      return [];
    }
    return body.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    })) as ClassAttendanceEntity[];
  }
}
