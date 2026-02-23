import type { UseCaseContext } from "@corely/kernel";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { ServiceOffering, type ResourceType } from "../../domain/booking.entities";
import type { ServiceRepositoryPort } from "../ports/booking-repo.ports";

export interface CreateServiceOfferingInput {
  name: string;
  description?: string | null;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceCents?: number | null;
  currency?: string | null;
  depositCents?: number | null;
  requiredResourceTypes?: ResourceType[];
  requiredTags?: string[];
  isActive?: boolean;
  idempotencyKey?: string;
}

export class CreateServiceOfferingUseCase {
  private readonly actionKey = "booking.service.create";

  constructor(
    private readonly serviceRepo: ServiceRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: CreateServiceOfferingInput, ctx: UseCaseContext): Promise<ServiceOffering> {
    const tenantId = ctx.tenantId!;

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached) {
        return cached.body as ServiceOffering;
      }
    }

    const now = this.clock.now();
    const service = new ServiceOffering(
      this.idGenerator.newId(),
      tenantId,
      ctx.workspaceId ?? null,
      input.name,
      input.description ?? null,
      input.durationMinutes,
      input.bufferBeforeMinutes ?? 0,
      input.bufferAfterMinutes ?? 0,
      input.priceCents ?? null,
      input.currency ?? null,
      input.depositCents ?? null,
      input.requiredResourceTypes ?? [],
      input.requiredTags ?? [],
      input.isActive ?? true,
      now,
      now
    );

    await this.serviceRepo.create(service);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.service.created",
      entityType: "BookingServiceOffering",
      entityId: service.id,
      metadata: { name: service.name },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "booking.service.created",
      payload: { serviceId: service.id },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: service,
      });
    }

    return service;
  }
}
