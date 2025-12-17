import { Body, Controller, Post, UseInterceptors, Req } from "@nestjs/common";
import { CreateExpenseUseCase } from "../../application/use-cases/CreateExpenseUseCase";
import { CreateExpenseInputSchema } from "@kerniflow/contracts";
import { IdempotencyInterceptor } from "../../../../shared/idempotency/IdempotencyInterceptor";
import { buildRequestContext } from "../../../../shared/context/request-context";
import { Request } from "express";

@Controller("expenses")
@UseInterceptors(IdempotencyInterceptor)
export class ExpensesController {
  constructor(private readonly createExpenseUseCase: CreateExpenseUseCase) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateExpenseInputSchema.parse(body);
    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId: input.tenantId,
      actorUserId: input.createdByUserId,
    });
    const expense = await this.createExpenseUseCase.execute({
      ...input,
      issuedAt: new Date(input.issuedAt),
      idempotencyKey: (req.headers["x-idempotency-key"] as string) ?? "default",
      context: ctx,
    });
    return {
      id: expense.id,
      tenantId: expense.tenantId,
      merchant: expense.merchant,
      totalCents: expense.totalCents,
      currency: expense.currency,
      category: expense.category,
      issuedAt: expense.issuedAt.toISOString(),
      createdByUserId: expense.createdByUserId,
    };
  }
}
