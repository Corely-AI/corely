import { Controller, Get, Post, Patch, Body, Param, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { resolveRequestContext } from "@/shared/request-context/request-context.resolver";
import type { Request } from "express";
import { Req } from "@nestjs/common";
import { CreateBankAccountInputSchema, UpdateBankAccountInputSchema } from "@corely/contracts";
import type { ListBankAccountsOutput, BankAccount } from "@corely/contracts";
import { BANK_ACCOUNT_REPOSITORY_PORT } from "../../application/ports/bank-account-repository.port";
import type { BankAccountRepositoryPort } from "../../application/ports/bank-account-repository.port";
import { ValidationError } from "@corely/kernel";

@Controller("payment-methods/bank-accounts")
@UseGuards(AuthGuard)
export class BankAccountsController {
  constructor(
    @Inject(BANK_ACCOUNT_REPOSITORY_PORT)
    private readonly bankAccountRepo: BankAccountRepositoryPort
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const legalEntityId = (req.query.legalEntityId as string) || ctx.workspaceId;
    if (!legalEntityId) {
      throw new ValidationError("legalEntityId is required");
    }

    const bankAccounts = await this.bankAccountRepo.listByLegalEntity(ctx.tenantId, legalEntityId);
    const includeSensitive = String(req.query.includeSensitive ?? "").toLowerCase() === "true";

    if (includeSensitive) {
      return { bankAccounts } as ListBankAccountsOutput;
    }

    return {
      bankAccounts: bankAccounts.map((acc) => ({
        ...acc,
        // Mask IBAN in list view
        iban: acc.iban ? `****${acc.iban.slice(-4)}` : acc.iban,
      })),
    } as ListBankAccountsOutput;
  }

  @Post()
  async create(@Req() req: Request, @Body() body: unknown): Promise<{ bankAccount: BankAccount }> {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const input = CreateBankAccountInputSchema.parse(body);
    const legalEntityId = (req.query.legalEntityId as string) || ctx.workspaceId;
    if (!legalEntityId) {
      throw new ValidationError("legalEntityId is required");
    }

    // Check if label already exists
    const exists = await this.bankAccountRepo.checkLabelExists(
      ctx.tenantId,
      legalEntityId,
      input.label
    );
    if (exists) {
      throw new ValidationError(`Bank account label "${input.label}" already exists`);
    }

    const bankAccount = await this.bankAccountRepo.create(ctx.tenantId, legalEntityId, input);
    return { bankAccount };
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<{ bankAccount: BankAccount }> {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const input = UpdateBankAccountInputSchema.parse(body);

    // Verify ownership
    const existing = await this.bankAccountRepo.getById(ctx.tenantId, id);
    if (!existing) {
      throw new ValidationError("Bank account not found");
    }

    // Check if new label conflicts with another account
    if (input.label) {
      const exists = await this.bankAccountRepo.checkLabelExists(
        ctx.tenantId,
        existing.legalEntityId,
        input.label,
        id
      );
      if (exists) {
        throw new ValidationError(`Bank account label "${input.label}" already exists`);
      }
    }

    const bankAccount = await this.bankAccountRepo.update(ctx.tenantId, id, input);
    return { bankAccount };
  }

  @Post(":id/set-default")
  async setDefault(
    @Req() req: Request,
    @Param("id") id: string
  ): Promise<{ bankAccount: BankAccount }> {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const existing = await this.bankAccountRepo.getById(ctx.tenantId, id);
    if (!existing) {
      throw new ValidationError("Bank account not found");
    }

    await this.bankAccountRepo.setDefault(ctx.tenantId, existing.legalEntityId, id);
    const updated = await this.bankAccountRepo.getById(ctx.tenantId, id);
    return { bankAccount: updated };
  }

  @Post(":id/deactivate")
  async deactivate(
    @Req() req: Request,
    @Param("id") id: string
  ): Promise<{ bankAccount: BankAccount }> {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const bankAccount = await this.bankAccountRepo.deactivate(ctx.tenantId, id);
    return { bankAccount };
  }
}
