import { ValidationFailedError } from "@corely/domain";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import {
  type CustomFieldDefinitionPort,
  type CustomFieldIndexPort,
  buildCustomFieldIndexes,
  validateAndNormalizeCustomValues,
} from "@corely/domain";
import { Expense } from "../../domain/expense.entity";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import { Inject } from "@nestjs/common";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import { WorkspaceTemplateService } from "../../../platform/application/services/workspace-template.service";

export interface CreateExpenseInput {
  tenantId: string;
  merchant: string;
  totalCents: number;
  taxAmountCents?: number | null;
  currency: string;
  category?: string | null;
  issuedAt: Date;
  createdByUserId?: string;
  custom?: Record<string, unknown>;
  idempotencyKey: string;
}

export class CreateExpenseUseCase {
  private readonly actionKey = "expenses.create";

  constructor(
    private readonly expenseRepo: ExpenseRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly customFieldDefinitions: CustomFieldDefinitionPort,
    private readonly customFieldIndexes: CustomFieldIndexPort,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    private readonly templateService: WorkspaceTemplateService
  ) {}

  async execute(input: CreateExpenseInput, ctx: UseCaseContext): Promise<Expense> {
    if (!input.tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const cached = await this.idempotency.get(this.actionKey, input.tenantId, input.idempotencyKey);
    if (cached) {
      const body = cached.body as any;
      return new Expense(
        body.id,
        body.tenantId,
        body.status,
        body.merchant,
        body.totalCents,
        body.taxAmountCents ?? null,
        body.currency,
        body.category ?? null,
        new Date(body.issuedAt),
        body.createdByUserId,
        new Date(body.createdAt),
        body.archivedAt ? new Date(body.archivedAt) : null,
        body.archivedByUserId ?? null,
        (body.custom ?? null) as Record<string, unknown> | null
      );
    }

    // Determine initial status based on workspace type
    const initialStatus = await this.determineInitialStatus(ctx.tenantId, ctx.workspaceId);

    const definitions = await this.customFieldDefinitions.listActiveByEntityType(
      input.tenantId,
      "expense"
    );
    const normalizedCustom = validateAndNormalizeCustomValues(definitions, input.custom);

    const expense = new Expense(
      this.idGenerator.newId(),
      input.tenantId,
      initialStatus,
      input.merchant,
      input.totalCents,
      input.taxAmountCents ?? null,
      input.currency,
      input.category ?? null,
      input.issuedAt,
      input.createdByUserId ?? ctx.userId ?? "system",
      this.clock.now(),
      null,
      null,
      Object.keys(normalizedCustom).length ? normalizedCustom : null
    );

    await this.expenseRepo.create(expense);
    await this.audit.log({
      tenantId: input.tenantId,
      userId: input.createdByUserId ?? ctx.userId ?? "system",
      action: "expense.created",
      entityType: "Expense",
      entityId: expense.id,
      metadata: {},
    });

    await this.outbox.enqueue({
      tenantId: input.tenantId,
      eventType: "expense.created",
      payload: {
        expenseId: expense.id,
        tenantId: expense.tenantId,
        totalCents: expense.totalCents,
        taxAmountCents: expense.taxAmountCents,
        currency: expense.currency,
      },
    });

    const indexRows = buildCustomFieldIndexes({
      tenantId: input.tenantId,
      entityType: "expense",
      entityId: expense.id,
      definitions,
      values: normalizedCustom,
    });
    if (indexRows.length) {
      await this.customFieldIndexes.upsertIndexesForEntity(
        input.tenantId,
        "expense",
        expense.id,
        indexRows
      );
    }

    await this.idempotency.store(this.actionKey, input.tenantId, input.idempotencyKey, {
      body: this.toJSON(expense),
    });

    return expense;
  }

  private toJSON(expense: Expense) {
    return {
      id: expense.id,
      tenantId: expense.tenantId,
      status: expense.status,
      merchant: expense.merchant,
      totalCents: expense.totalCents,
      taxAmountCents: expense.taxAmountCents,
      currency: expense.currency,
      category: expense.category,
      issuedAt: expense.issuedAt.toISOString(),
      createdByUserId: expense.createdByUserId,
      archivedAt: expense.archivedAt?.toISOString(),
      archivedByUserId: expense.archivedByUserId,
      createdAt: expense.createdAt.toISOString(),
      custom: expense.custom,
    };
  }

  /**
   * Determine initial expense status based on workspace type
   * - Freelancer mode (PERSONAL): No approval workflow needed -> APPROVED
   * - Company mode: Requires approval workflow -> DRAFT
   */
  private async determineInitialStatus(
    tenantId: string,
    workspaceId?: string
  ): Promise<"DRAFT" | "APPROVED"> {
    if (!workspaceId) {
      // Fallback to DRAFT if no workspace context
      return "DRAFT";
    }

    try {
      const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
        tenantId,
        workspaceId
      );

      if (!workspace || !workspace.legalEntity) {
        return "DRAFT";
      }

      // Determine workspace kind based on legal entity
      const workspaceKind = workspace.legalEntity.kind === "COMPANY" ? "COMPANY" : "PERSONAL";

      // Get capabilities for this workspace type
      const capabilities = this.templateService.getDefaultCapabilities(workspaceKind);

      // If approvals are disabled (freelancer mode), auto-approve
      return capabilities.approvals === false ? "APPROVED" : "DRAFT";
    } catch (error) {
      // On error, default to DRAFT (safer)
      return "DRAFT";
    }
  }
}
