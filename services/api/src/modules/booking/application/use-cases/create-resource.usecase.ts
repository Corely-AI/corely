import type { UseCaseContext } from "@corely/kernel";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { BookingResource } from "../../domain/booking.entities";
import type { ResourceRepositoryPort } from "../ports/booking-repo.ports";

export interface CreateResourceInput {
  type: "STAFF" | "ROOM" | "EQUIPMENT";
  name: string;
  description?: string | null;
  location?: string | null;
  capacity?: number | null;
  tags?: string[];
  attributes?: Record<string, unknown> | null;
  isActive?: boolean;
  idempotencyKey: string;
}

export class CreateResourceUseCase {
  private readonly actionKey = "booking.resource.create";

  constructor(
    private readonly resourceRepo: ResourceRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: CreateResourceInput, ctx: UseCaseContext): Promise<BookingResource> {
    const tenantId = ctx.tenantId!;

    const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
    if (cached) {
      return cached.body as BookingResource;
    }

    const now = this.clock.now();
    const resource = new BookingResource(
      this.idGenerator.newId(),
      tenantId,
      ctx.workspaceId ?? null,
      input.type,
      input.name,
      input.description ?? null,
      input.location ?? null,
      input.capacity ?? null,
      input.tags ?? [],
      input.attributes ?? null,
      input.isActive ?? true,
      now,
      now
    );

    await this.resourceRepo.create(resource);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.resource.created",
      entityType: "BookingResource",
      entityId: resource.id,
      metadata: { type: resource.type, name: resource.name },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "booking.resource.created",
      payload: { resourceId: resource.id, type: resource.type },
    });

    await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
      body: resource,
    });

    return resource;
  }
}
