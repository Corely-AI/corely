import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  RequireTenant,
  type IdempotencyPort,
  type AuditPort,
  type OutboxPort,
} from "@corely/kernel";
import { CreateLeadInput, CreateLeadOutput } from "@corely/contracts";
import { LeadAggregate, LeadSource } from "../../../domain/lead.aggregate";
import { LEAD_REPO_PORT, LeadRepoPort } from "../../ports/lead-repository.port";

type Deps = {
  clock: ClockPort;
  idGenerator: IdGeneratorPort;
  logger: LoggerPort;
  leadRepo: LeadRepoPort; // injected manually or via DI logic later
  idempotency: IdempotencyPort;
  audit: AuditPort;
  outbox: OutboxPort;
};

@RequireTenant()
export class CreateLeadUseCase extends BaseUseCase<CreateLeadInput, CreateLeadOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency });
  }

  protected validate(input: CreateLeadInput): CreateLeadInput {
    // Basic validation
    return input;
  }

  protected async handle(
    input: CreateLeadInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLeadOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("Tenant ID required"));
    }

    const now = this.deps.clock.now();
    const lead = LeadAggregate.create({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      source: input.source as LeadSource,
      firstName: input.firstName,
      lastName: input.lastName,
      companyName: input.companyName,
      email: input.email,
      phone: input.phone,
      ownerUserId: input.ownerUserId,
      notes: input.notes,
      createdAt: now,
    });

    await this.deps.leadRepo.create(ctx.tenantId, lead);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "crm.lead.create",
      entityType: "lead",
      entityId: lead.id,
      metadata: { source: lead.source, status: lead.status },
    });
    await this.deps.outbox.enqueue({
      eventType: "crm.lead.created",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: { leadId: lead.id },
    });

    return ok({
      lead: {
        id: lead.id,
        tenantId: lead.tenantId,
        source: lead.source,
        status: lead.status,
        firstName: lead.firstName,
        lastName: lead.lastName,
        companyName: lead.companyName,
        email: lead.email,
        phone: lead.phone,
        ownerUserId: lead.ownerUserId,
        convertedDealId: lead.convertedDealId,
        convertedPartyId: lead.convertedPartyId,
        notes: lead.notes,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },
    });
  }
}
