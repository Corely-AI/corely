import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import type { LeadDto } from "@corely/contracts";
import { LEAD_REPO_PORT, type LeadRepoPort } from "../../ports/lead-repository.port";

type ListLeadsInput = {
  status?: string;
};

type ListLeadsOutput = {
  items: LeadDto[];
  nextCursor: null;
};

@Injectable()
@RequireTenant()
export class ListLeadsUseCase extends BaseUseCase<ListLeadsInput, ListLeadsOutput> {
  constructor(@Inject(LEAD_REPO_PORT) private readonly leadRepo: LeadRepoPort) {
    super({});
  }

  protected async handle(
    input: ListLeadsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListLeadsOutput, UseCaseError>> {
    const leads = await this.leadRepo.list(ctx.tenantId, { status: input.status });
    return ok({
      items: leads.map((lead) => ({
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
      })),
      nextCursor: null,
    });
  }
}
