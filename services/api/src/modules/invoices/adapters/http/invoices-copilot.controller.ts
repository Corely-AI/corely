import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  DraftInvoiceIssueEmailInputSchema,
  DraftInvoiceReminderEmailInputSchema,
} from "@corely/contracts";
import { InvoicesApplication } from "../../application/invoices.application";
import { buildUseCaseContext, mapResultToHttp } from "./mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../../identity";

@Controller("invoices")
@UseGuards(AuthGuard, RbacGuard)
export class InvoicesCopilotController {
  constructor(private readonly app: InvoicesApplication) {}

  @Post(":invoiceId/copilot/draft-issue-email")
  @RequirePermission("sales.invoices.read")
  async draftIssueEmail(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = DraftInvoiceIssueEmailInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.draftInvoiceIssueEmail.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":invoiceId/copilot/draft-reminder")
  @RequirePermission("sales.invoices.read")
  async draftReminderEmail(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = DraftInvoiceReminderEmailInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.draftReminderEmail.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
