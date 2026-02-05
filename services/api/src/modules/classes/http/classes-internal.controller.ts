import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { CreateBillingRunInputSchema, CreateBillingRunOutputSchema } from "@corely/contracts";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { ServiceTokenGuard } from "../../../shared/http/service-token.guard";
import { CreateMonthlyBillingRunUseCase } from "../application/use-cases/create-monthly-billing-run.usecase";
import { toBillingRunDto } from "./mappers/classes.mappers";

@Controller("internal/classes")
@UseGuards(ServiceTokenGuard)
export class ClassesInternalController {
  constructor(private readonly createMonthlyBillingRun: CreateMonthlyBillingRunUseCase) {}

  @Post("billing/runs")
  async createBillingRun(@Body() body: unknown, @Req() req: Request) {
    const input = CreateBillingRunInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.createMonthlyBillingRun.execute(
      { ...input, idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey },
      ctx
    );
    return CreateBillingRunOutputSchema.parse({
      billingRun: toBillingRunDto(result.billingRun),
      invoiceIds: result.invoiceIds,
    });
  }
}
