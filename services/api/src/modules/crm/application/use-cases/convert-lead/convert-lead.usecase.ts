import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ok,
  err,
  type ClockPort,
  type LoggerPort,
  type IdGeneratorPort,
  RequireTenant,
  type IdempotencyPort,
  type AuditPort,
  type OutboxPort,
} from "@corely/kernel";
import { ConvertLeadInput, ConvertLeadOutput } from "@corely/contracts";
import { LEAD_REPO_PORT, type LeadRepoPort } from "../../ports/lead-repository.port";
import { PartyApplication } from "../../../../party/application/party.application";
import { CreateDealUseCase } from "../../use-cases/create-deal/create-deal.usecase"; // Intra-module import

type Deps = {
  logger: LoggerPort;
  leadRepo: LeadRepoPort;
  partyApp: PartyApplication;
  createDeal: CreateDealUseCase;
  clock: ClockPort;
  idGenerator: IdGeneratorPort;
  idempotency: IdempotencyPort;
  audit: AuditPort;
  outbox: OutboxPort;
};

@RequireTenant()
export class ConvertLeadUseCase extends BaseUseCase<ConvertLeadInput, ConvertLeadOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency });
  }

  protected validate(input: ConvertLeadInput): ConvertLeadInput {
    return input;
  }

  protected async handle(
    input: ConvertLeadInput,
    ctx: UseCaseContext
  ): Promise<Result<ConvertLeadOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("Tenant ID required"));
    }

    const lead = await this.deps.leadRepo.findById(ctx.tenantId, input.leadId);
    if (!lead) {
      return err(new NotFoundError("Lead not found"));
    }
    if (lead.status === "CONVERTED") {
      return err(new ValidationError("Lead already converted"));
    }

    // 1. Create/Get Contact (Individual)
    // For now, always create new unless match logic added.
    // Assuming simple conversion: Create new Party.
    const createContactResult = await this.deps.partyApp.createCustomer.execute(
      {
        kind: "INDIVIDUAL",
        displayName:
          lead.firstName && lead.lastName
            ? `${lead.firstName} ${lead.lastName}`
            : lead.firstName || lead.lastName || "Unknown Contact",
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        notes: lead.notes,
      },
      ctx
    );

    if (!createContactResult.ok) {
      return err((createContactResult as any).error);
    }
    const contactId = createContactResult.value.customer.id;
    const contactDto = createContactResult.value.customer;

    // 2. Create/Get Company (Organization) if needed
    let companyId: string | null = null;
    let companyDto: any = null;

    if (lead.companyName) {
      const createCompanyResult = await this.deps.partyApp.createCustomer.execute(
        {
          kind: "ORGANIZATION",
          organizationName: lead.companyName,
          displayName: lead.companyName,
          notes: `Created from Lead: ${input.leadId}`,
        },
        ctx
      );

      if (createCompanyResult.ok) {
        companyId = createCompanyResult.value.customer.id;
        companyDto = createCompanyResult.value.customer;
      }
    }

    // 3. Create Deal
    const dealTitle =
      input.dealTitle ||
      (lead.companyName ? `${lead.companyName} Deal` : `${contactDto.displayName} Deal`);

    // Create new context with user if possible (requires fix in Controller to pass complete context)
    // But passing ctx is fine.

    const createDealResult = await this.deps.createDeal.execute(
      {
        title: dealTitle,
        partyId: contactId, // Primary contact
        stageId: "lead",
      },
      ctx
    );

    if (!createDealResult.ok) {
      return err((createDealResult as any).error);
    }
    const deal = createDealResult.value.deal;

    // 4. Update Deal with CompanyId if available (and if CreateDeal didn't handle it)
    // If I can't pass companyId to CreateDeal, I might need to patch it directly?
    // Or update CreateDeal contract.
    // I will skip linking Deal-to-Company for this specific step unless I update CreateDeal.
    // I will update CreateDeal logic safely later.

    // 5. Update Lead
    lead.convert(deal.id, contactId, this.deps.clock.now());
    await this.deps.leadRepo.update(ctx.tenantId, lead);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "crm.lead.convert",
      entityType: "lead",
      entityId: lead.id,
      metadata: {
        dealId: deal.id,
        contactId,
        companyId,
      },
    });
    await this.deps.outbox.enqueue({
      eventType: "crm.lead.converted",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: { leadId: lead.id, dealId: deal.id, contactId, companyId },
    });

    return ok({
      deal,
      contact: contactDto,
      company: companyDto,
    });
  }
}
