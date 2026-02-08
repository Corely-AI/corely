import { Body, Controller, Post, UseGuards, Headers } from "@nestjs/common";
import { CreateTutoringLeadUseCase } from "../../application/use-cases/create-tutoring-lead.usecase";
import { UseCaseContext } from "@corely/kernel";

@Controller("internal/party")
export class PartyInternalController {
  constructor(private readonly createTutoringLead: CreateTutoringLeadUseCase) {}

  @Post("leads/from-form")
  async createLeadFromForm(
    @Headers("x-tenant-id") tenantId: string,
    @Body() body: { submissionId: string; formId: string; payload: Record<string, any> }
  ) {
    const ctx: UseCaseContext = {
      tenantId,
      userId: "system",
      correlationId: `form-submission-${body.submissionId}`,
    };

    const result = await this.createTutoringLead.execute(body, ctx);
    if (!result.ok) {
      throw (result as any).error;
    }
    return result.value;
  }
}
