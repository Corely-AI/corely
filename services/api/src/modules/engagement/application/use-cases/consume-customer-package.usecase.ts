import {
  type AuditPort,
  BaseUseCase,
  ConflictError,
  type IdempotencyPort,
  type LoggerPort,
  NotFoundError,
  type OutboxPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import {
  type ConsumeCustomerPackageInput,
  type ConsumeCustomerPackageOutput,
} from "@corely/contracts";
import { toCustomerPackageDto, toPackageUsageDto } from "../mappers/engagement-dto.mappers";
import type { PackageRepositoryPort } from "../ports/package-repository.port";

type Deps = {
  logger: LoggerPort;
  packages: PackageRepositoryPort;
  idempotency: IdempotencyPort;
  audit: AuditPort;
  outbox: OutboxPort;
};

const startOfDayUtc = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export class ConsumeCustomerPackageUseCase extends BaseUseCase<
  ConsumeCustomerPackageInput,
  ConsumeCustomerPackageOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency });
  }

  protected getIdempotencyKey(
    input: ConsumeCustomerPackageInput,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey || !ctx.tenantId) {
      return undefined;
    }
    return `engagement:package:consume:${ctx.tenantId}:${input.idempotencyKey}`;
  }

  protected async handle(
    input: ConsumeCustomerPackageInput,
    ctx: UseCaseContext
  ): Promise<Result<ConsumeCustomerPackageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }
    if (!input.idempotencyKey) {
      return err(new ValidationError("idempotencyKey is required"));
    }

    const existing = await this.deps.packages.findPackageById(
      ctx.tenantId,
      input.customerPackageId
    );
    if (!existing) {
      return err(new NotFoundError("Package not found"));
    }

    if (existing.status !== "ACTIVE") {
      return err(new ConflictError("Only active packages can be consumed"));
    }

    if (existing.expiresOn && existing.expiresOn < startOfDayUtc(new Date())) {
      return err(new ConflictError("Package is expired"));
    }

    if (existing.remainingUnits < input.unitsUsed) {
      return err(
        new ConflictError(
          "Cannot consume more units than remaining",
          {
            remainingUnits: existing.remainingUnits,
            requestedUnits: input.unitsUsed,
          },
          "PACKAGE_INSUFFICIENT_UNITS"
        )
      );
    }

    const usage = {
      usageId: input.usageId,
      tenantId: ctx.tenantId,
      customerPackageId: input.customerPackageId,
      customerPartyId: existing.customerPartyId,
      unitsUsed: input.unitsUsed,
      usedAt: input.usedAt ? new Date(input.usedAt) : new Date(),
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      notes: input.notes ?? null,
      createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
      createdAt: new Date(),
    };

    const consumed = await this.deps.packages.consumePackageUnits({
      tenantId: ctx.tenantId,
      customerPackageId: input.customerPackageId,
      unitsUsed: input.unitsUsed,
      usage,
    });

    if (!consumed) {
      return err(
        new ConflictError(
          "Cannot consume more units than remaining",
          {
            remainingUnits: existing.remainingUnits,
            requestedUnits: input.unitsUsed,
          },
          "PACKAGE_INSUFFICIENT_UNITS"
        )
      );
    }

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "engagement.package.consume",
      entityType: "CustomerPackage",
      entityId: input.customerPackageId,
      metadata: {
        usageId: input.usageId,
        unitsUsed: input.unitsUsed,
        remainingUnits: consumed.customerPackage.remainingUnits,
      },
    });

    await this.deps.outbox.enqueue({
      eventType: "PackageConsumed",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: {
        customerPackageId: consumed.customerPackage.customerPackageId,
        customerPartyId: consumed.customerPackage.customerPartyId,
        usageId: consumed.usage.usageId,
        unitsUsed: consumed.usage.unitsUsed,
        remainingUnits: consumed.customerPackage.remainingUnits,
      },
    });

    return ok({
      customerPackage: toCustomerPackageDto(consumed.customerPackage),
      usage: toPackageUsageDto(consumed.usage),
    });
  }
}
