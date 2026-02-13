import { NotFoundError, ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { type PrismaService } from "@corely/data";
import type { EntityDimensionAssignment } from "@corely/contracts";
import {
  buildCustomFieldIndexes,
  type CustomFieldDefinitionPort,
  type CustomFieldIndexPort,
  validateAndNormalizeCustomValues,
} from "@corely/domain";
import type {
  CustomFieldsWritePort,
  DimensionsWritePort,
} from "../../../platform-custom-attributes/application/ports/custom-attributes.ports";

export interface UpdateExpenseInput {
  expenseId: string;
  merchantName?: string;
  expenseDate?: Date;
  totalAmountCents?: number;
  currency?: string;
  category?: string | null;
  vatRate?: number | null;
  custom?: Record<string, unknown> | null;
  customFieldValues?: Record<string, unknown> | null;
  dimensionAssignments?: EntityDimensionAssignment[];
}

export class UpdateExpenseUseCase {
  constructor(
    private readonly repo: ExpenseRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort,
    private readonly prisma: PrismaService,
    private readonly customFieldDefinitions: CustomFieldDefinitionPort,
    private readonly customFieldIndexes: CustomFieldIndexPort,
    private readonly dimensionsWritePort: DimensionsWritePort,
    private readonly customFieldsWritePort: CustomFieldsWritePort
  ) {}

  async execute(input: UpdateExpenseInput, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const expense = await this.repo.findById(tenantId, input.expenseId, { includeArchived: true });
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }

    const totalCents = input.totalAmountCents ?? expense.totalCents;
    const vatRate = input.vatRate;
    const taxAmountCents =
      vatRate != null ? Math.round((totalCents * vatRate) / 100) : expense.taxAmountCents;

    const incomingCustom = input.customFieldValues ?? input.custom ?? expense.custom ?? undefined;
    const definitions = await this.customFieldDefinitions.listActiveByEntityType(
      tenantId,
      "expense"
    );
    const normalizedCustom = validateAndNormalizeCustomValues(
      definitions,
      incomingCustom ?? undefined
    );

    expense.update({
      merchant: input.merchantName,
      totalCents,
      taxAmountCents,
      currency: input.currency ?? expense.currency,
      category: input.category ?? expense.category,
      issuedAt: input.expenseDate ?? expense.issuedAt,
      custom: Object.keys(normalizedCustom).length ? normalizedCustom : null,
    });

    await this.repo.update(expense);
    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "expense.updated",
      entityType: "Expense",
      entityId: expense.id,
      metadata: {},
    });

    const indexRows = buildCustomFieldIndexes({
      tenantId,
      entityType: "expense",
      entityId: expense.id,
      definitions,
      values: normalizedCustom,
    });
    await this.customFieldIndexes.upsertIndexesForEntity(
      tenantId,
      "expense",
      expense.id,
      indexRows
    );

    await this.customFieldsWritePort.setEntityValues(
      tenantId,
      "expense",
      expense.id,
      normalizedCustom
    );
    if (input.dimensionAssignments) {
      await this.dimensionsWritePort.setEntityAssignments(
        tenantId,
        "expense",
        expense.id,
        input.dimensionAssignments
      );
    }

    // Sync Tax Snapshot (moved from worker to API)
    if (expense.status === "APPROVED") {
      const tax = expense.taxAmountCents ?? 0;
      const subtotal = expense.totalCents - tax;
      await this.prisma.taxSnapshot.upsert({
        where: {
          tenantId_sourceType_sourceId: {
            tenantId: expense.tenantId,
            sourceType: "EXPENSE",
            sourceId: expense.id,
          },
        },
        update: {
          subtotalAmountCents: subtotal,
          taxTotalAmountCents: tax,
          totalAmountCents: expense.totalCents,
          currency: expense.currency,
          calculatedAt: expense.issuedAt,
        },
        create: {
          tenantId: expense.tenantId,
          sourceType: "EXPENSE",
          sourceId: expense.id,
          jurisdiction: "DE",
          regime: "STANDARD_VAT",
          roundingMode: "PER_DOCUMENT",
          currency: expense.currency,
          calculatedAt: expense.issuedAt,
          subtotalAmountCents: subtotal,
          taxTotalAmountCents: tax,
          totalAmountCents: expense.totalCents,
          breakdownJson: "{}",
          version: 1,
        },
      });
    }

    return expense;
  }
}
