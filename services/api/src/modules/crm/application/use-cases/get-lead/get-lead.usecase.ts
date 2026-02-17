import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { LeadDto } from "@corely/contracts";
import { LEAD_REPO_PORT, type LeadRepoPort } from "../../ports/lead-repository.port";

type GetLeadInput = {
  id: string;
};

@Injectable()
@RequireTenant()
export class GetLeadUseCase extends BaseUseCase<GetLeadInput, LeadDto> {
  constructor(@Inject(LEAD_REPO_PORT) private readonly leadRepo: LeadRepoPort) {
    super({});
  }

  protected async handle(
    input: GetLeadInput,
    ctx: UseCaseContext
  ): Promise<Result<LeadDto, UseCaseError>> {
    const lead = await this.leadRepo.findById(ctx.tenantId, input.id);
    if (!lead) {
      return err(new NotFoundError("Lead not found"));
    }

    return ok({
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
    });
  }
}
