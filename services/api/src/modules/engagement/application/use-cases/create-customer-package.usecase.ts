import {
  type AuditPort,
  BaseUseCase,
  type IdempotencyPort,
  type LoggerPort,
  type OutboxPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import {
  type CreateCustomerPackageInput,
  type CreateCustomerPackageOutput,
} from "@corely/contracts";
import { toCustomerPackageDto } from "../mappers/engagement-dto.mappers";
import type { PackageRepositoryPort } from "../ports/package-repository.port";

type Deps = {
  logger: LoggerPort;
  packages: PackageRepositoryPort;
  idempotency: IdempotencyPort;
  audit: AuditPort;
  outbox: OutboxPort;
};

export class CreateCustomerPackageUseCase extends BaseUseCase<
  CreateCustomerPackageInput,
  CreateCustomerPackageOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency });
  }

  protected getIdempotencyKey(
    input: CreateCustomerPackageInput,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey || !ctx.tenantId) {
      return undefined;
    }
    return `engagement:package:create:${ctx.tenantId}:${input.idempotencyKey}`;
  }

  protected async handle(
    input: CreateCustomerPackageInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCustomerPackageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }
    if (!input.idempotencyKey) {
      return err(new ValidationError("idempotencyKey is required"));
    }

    const now = new Date();
    const expiresOn = input.expiresOn ? new Date(`${input.expiresOn}T00:00:00.000Z`) : null;

    const record = {
      customerPackageId: input.customerPackageId,
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      name: input.name,
      status: "ACTIVE" as const,
      totalUnits: input.totalUnits,
      remainingUnits: input.totalUnits,
      expiresOn,
      notes: input.notes ?? null,
      createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.packages.createPackage(record);

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "engagement.package.create",
      entityType: "CustomerPackage",
      entityId: input.customerPackageId,
      metadata: {
        customerPartyId: input.customerPartyId,
        totalUnits: input.totalUnits,
      },
    });

    await this.deps.outbox.enqueue({
      eventType: "PackageCreated",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: {
        customerPackageId: input.customerPackageId,
        customerPartyId: input.customerPartyId,
        totalUnits: input.totalUnits,
        remainingUnits: input.totalUnits,
      },
    });

    return ok({
      customerPackage: toCustomerPackageDto(record),
    });
  }
}
