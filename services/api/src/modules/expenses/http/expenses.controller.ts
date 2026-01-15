import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import {
  CreateExpenseWebInputSchema,
  type ExpenseDto,
  type ExpenseStatus,
} from "@corely/contracts";
import { parseListQuery } from "../../shared/http/pagination";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../shared/http/usecase-mappers";
import { CreateExpenseUseCase } from "../application/use-cases/create-expense.usecase";
import { ArchiveExpenseUseCase } from "../application/use-cases/archive-expense.usecase";
import { UnarchiveExpenseUseCase } from "../application/use-cases/unarchive-expense.usecase";
import { ListExpensesUseCase } from "../application/use-cases/list-expenses.usecase";
import { GetExpenseUseCase } from "../application/use-cases/get-expense.usecase";
import { UpdateExpenseUseCase } from "../application/use-cases/update-expense.usecase";
import type { Expense } from "../domain/expense.entity";

const ExpenseHttpInputSchema = CreateExpenseWebInputSchema.partial().extend({
  tenantId: z.string().optional(),
  merchant: z.string().optional(),
  totalCents: z.number().optional(),
  issuedAt: z.string().optional(),
  createdByUserId: z.string().optional(),
  expenseDate: z.string().optional(),
  vatRate: z.number().optional(),
  idempotencyKey: z.string().optional(),
});

@Controller("expenses")
export class ExpensesController {
  constructor(
    private readonly createExpenseUseCase: CreateExpenseUseCase,
    private readonly archiveExpenseUseCase: ArchiveExpenseUseCase,
    private readonly unarchiveExpenseUseCase: UnarchiveExpenseUseCase,
    private readonly listExpensesUseCase: ListExpensesUseCase,
    private readonly getExpenseUseCase: GetExpenseUseCase,
    private readonly updateExpenseUseCase: UpdateExpenseUseCase
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = ExpenseHttpInputSchema.parse(body);
    const ctx = buildUseCaseContext(req as any);

    const tenantId = input.tenantId ?? ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new BadRequestException("Missing tenant/workspace id");
    }

    const merchant = input.merchant ?? input.merchantName;
    if (!merchant) {
      throw new BadRequestException("Missing merchant");
    }

    const totalCents = input.totalCents ?? input.totalAmountCents;
    if (typeof totalCents !== "number") {
      throw new BadRequestException("Missing total amount");
    }

    const currency = input.currency;
    if (!currency) {
      throw new BadRequestException("Missing currency");
    }

    const issuedAtStr = input.issuedAt ?? input.expenseDate ?? new Date().toISOString();
    const issuedAt = new Date(issuedAtStr);
    if (Number.isNaN(issuedAt.getTime())) {
      throw new BadRequestException("Invalid date");
    }

    const vatRate = typeof input.vatRate === "number" ? input.vatRate : undefined;
    const taxAmountCents = vatRate != null ? Math.round((totalCents * vatRate) / 100) : null;

    const expense = await this.createExpenseUseCase.execute(
      {
        tenantId,
        merchant,
        totalCents,
        taxAmountCents,
        currency,
        category: input.category,
        createdByUserId: input.createdByUserId ?? ctx.userId ?? "system",
        custom: input.custom,
        issuedAt,
        idempotencyKey: resolveIdempotencyKey(req as any) ?? input.idempotencyKey ?? "default",
      },
      ctx
    );

    const payload = this.mapExpenseDto(expense);
    // Return both flat fields (for existing tests) and contract shape under "expense"
    return { ...payload, expense: payload };
  }

  @Get()
  async list(@Query() query: any, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const ctx = buildUseCaseContext(req as any);
    const category = typeof query.category === "string" ? query.category : undefined;
    const status = typeof query.status === "string" ? (query.status as ExpenseStatus) : undefined;

    const result = await this.listExpensesUseCase.execute(
      {
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        q: listQuery.q,
        cursor: typeof query.cursor === "string" ? query.cursor : undefined,
        includeArchived: listQuery.includeArchived,
        category,
        status,
        merchantName: typeof query.merchantName === "string" ? query.merchantName : undefined,
        fromDate: typeof query.fromDate === "string" ? query.fromDate : undefined,
        toDate: typeof query.toDate === "string" ? query.toDate : undefined,
      },
      ctx
    );

    const items = result.items.map((expense) => this.mapExpenseDto(expense));
    return { items, expenses: items, pageInfo: result.pageInfo, nextCursor: result.nextCursor };
  }

  @Get(":expenseId")
  async getOne(@Param("expenseId") expenseId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req as any);
    const includeArchived =
      req.query?.includeArchived === "true" || req.query?.includeArchived === "1";

    const expense = await this.getExpenseUseCase.execute({ expenseId, includeArchived }, ctx);
    return { expense: this.mapExpenseDto(expense) };
  }

  @Patch(":expenseId")
  async update(@Param("expenseId") expenseId: string, @Body() body: unknown, @Req() req: Request) {
    const input = ExpenseHttpInputSchema.parse(body);
    const ctx = buildUseCaseContext(req as any);

    const expenseDateStr = input.expenseDate ?? input.issuedAt;
    const expenseDate = expenseDateStr ? new Date(expenseDateStr) : undefined;
    if (expenseDate && Number.isNaN(expenseDate.getTime())) {
      throw new BadRequestException("Invalid expense date");
    }

    const updated = await this.updateExpenseUseCase.execute(
      {
        expenseId,
        merchantName: input.merchant ?? input.merchantName,
        expenseDate,
        totalAmountCents: input.totalCents ?? input.totalAmountCents,
        currency: input.currency,
        category: input.category ?? null,
        vatRate: input.vatRate ?? null,
        custom: input.custom ?? null,
      },
      ctx
    );

    return { expense: this.mapExpenseDto(updated) };
  }

  @Delete(":expenseId")
  async delete(@Param("expenseId") expenseId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req as any);
    await this.archiveExpenseUseCase.execute({ expenseId }, ctx);
    return { archived: true };
  }

  @Post(":expenseId/archive")
  async archive(@Param("expenseId") expenseId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req as any);
    await this.archiveExpenseUseCase.execute({ expenseId }, ctx);
    return { archived: true };
  }

  @Post(":expenseId/unarchive")
  async unarchive(@Param("expenseId") expenseId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req as any);
    await this.unarchiveExpenseUseCase.execute({ expenseId }, ctx);
    return { archived: false };
  }

  private mapExpenseDto(expense: Expense): ExpenseDto {
    const taxAmountCents = expense.taxAmountCents ?? null;
    return {
      id: expense.id,
      tenantId: expense.tenantId,
      status: "SUBMITTED",
      expenseDate: expense.issuedAt.toISOString().slice(0, 10),
      merchantName: expense.merchant,
      supplierPartyId: null,
      currency: expense.currency,
      notes: null,
      category: expense.category,
      totalAmountCents: expense.totalCents,
      taxAmountCents,
      archivedAt: expense.archivedAt?.toISOString() ?? null,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.createdAt.toISOString(),
      lines: [],
      receipts: [],
      custom: expense.custom ?? undefined,
    };
  }
}
