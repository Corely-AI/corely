import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { RunInvoiceRemindersInputSchema, RunInvoiceRemindersOutputSchema } from "@corely/contracts";
import { ServiceTokenGuard } from "../../../../shared/http/service-token.guard";
import { buildUseCaseContext, mapResultToHttp } from "./mappers";
import { SendInvoiceRemindersUseCase } from "../../application/use-cases/send-invoice-reminders/send-invoice-reminders.usecase";

@Controller("internal/invoices")
@UseGuards(ServiceTokenGuard)
export class InvoicesInternalController {
  constructor(private readonly sendInvoiceReminders: SendInvoiceRemindersUseCase) {}

  @Post("reminders/run")
  async runReminders(@Body() body: unknown, @Req() req: Request) {
    const input = RunInvoiceRemindersInputSchema.parse(body ?? {});
    const ctx = buildUseCaseContext(req);
    const result = await this.sendInvoiceReminders.execute(input, ctx);
    return RunInvoiceRemindersOutputSchema.parse(mapResultToHttp(result));
  }
}
