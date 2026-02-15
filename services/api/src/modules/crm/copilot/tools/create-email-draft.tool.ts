import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { CreateActivityUseCase } from "../../application/use-cases/create-activity/create-activity.usecase";
import { DomainToolPort, ToolKind } from "../../../ai-copilot/application/ports/domain-tool.port";
import { ActivityTypeSchema } from "@corely/contracts";

const InputSchema = z.object({
  dealId: z.string().optional().describe("ID of the deal to link context"),
  partyId: z.string().optional().describe("ID of the contact person"),
  subject: z.string().describe("Subject line of the email"),
  body: z.string().describe("Body content of the email (HTML or text)"),
  recipientEmail: z.string().email().optional().describe("Recipient email address if known"),
});

@Injectable()
export class CreateEmailDraftTool implements DomainToolPort {
  name = "crm_create_email_draft";
  description = "Creates a draft email activity in the CRM for later review/sending.";
  inputSchema = InputSchema;
  kind: ToolKind = "server";
  needsApproval = false; // Drafting is safe, sending requires approval

  constructor(private readonly createActivity: CreateActivityUseCase) {}

  execute = async (params: { tenantId: string; userId: string; input: unknown }) => {
    const input = InputSchema.parse(params.input);

    const result = await this.createActivity.execute(
      {
        type: "EMAIL_DRAFT",
        subject: input.subject,
        body: input.body,
        dealId: input.dealId,
        partyId: input.partyId,
        metadata: {
          recipientEmail: input.recipientEmail,
        },
        // other fields optional
      },
      { tenantId: params.tenantId }
    );

    if (!result.ok) {
      throw (result as any).error;
    }

    return {
      activityId: result.value.activity!.id,
      message: "Draft created successfully",
    };
  };
}
