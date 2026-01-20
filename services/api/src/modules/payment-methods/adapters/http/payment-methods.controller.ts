import { Controller, Get, Post, Patch, Body, Param, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { resolveRequestContext } from "@/shared/request-context/request-context.resolver";
import { Request } from "express";
import { Req } from "@nestjs/common";
import { CreatePaymentMethodInputSchema, UpdatePaymentMethodInputSchema } from "@corely/contracts";
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
  ListPaymentMethodsOutput,
  PaymentMethod,
} from "@corely/contracts";
import { PAYMENT_METHOD_REPOSITORY_PORT } from "../../application/ports/payment-method-repository.port";
import { BANK_ACCOUNT_REPOSITORY_PORT } from "../../application/ports/bank-account-repository.port";
import type { PaymentMethodRepositoryPort } from "../../application/ports/payment-method-repository.port";
import type { BankAccountRepositoryPort } from "../../application/ports/bank-account-repository.port";
import { ValidationError } from "@corely/kernel";

@Controller("payment-methods")
@UseGuards(AuthGuard)
export class PaymentMethodsController {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY_PORT)
    private readonly paymentMethodRepo: PaymentMethodRepositoryPort,
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

    const paymentMethods = await this.paymentMethodRepo.listByLegalEntity(
      ctx.tenantId,
      legalEntityId
    );
    return { paymentMethods } as ListPaymentMethodsOutput;
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: unknown
  ): Promise<{ paymentMethod: PaymentMethod }> {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const input = CreatePaymentMethodInputSchema.parse(body);
    const legalEntityId = (req.query.legalEntityId as string) || ctx.workspaceId;
    if (!legalEntityId) {
      throw new ValidationError("legalEntityId is required");
    }

    // Validate bank account if BANK_TRANSFER
    if (input.type === "BANK_TRANSFER" && input.bankAccountId) {
      const bankAccount = await this.bankAccountRepo.getById(ctx.tenantId, input.bankAccountId);
      if (!bankAccount || bankAccount.legalEntityId !== legalEntityId) {
        throw new ValidationError("Bank account not found or does not belong to this legal entity");
      }
    }

    // Check if label already exists
    const exists = await this.paymentMethodRepo.checkLabelExists(
      ctx.tenantId,
      legalEntityId,
      input.label
    );
    if (exists) {
      throw new ValidationError(`Payment method label "${input.label}" already exists`);
    }

    const paymentMethod = await this.paymentMethodRepo.create(ctx.tenantId, legalEntityId, input);
    return { paymentMethod };
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<{ paymentMethod: PaymentMethod }> {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const input = UpdatePaymentMethodInputSchema.parse(body);

    // Verify ownership
    const existing = await this.paymentMethodRepo.getById(ctx.tenantId, id);
    if (!existing) {
      throw new ValidationError("Payment method not found");
    }

    // Validate bank account if updating
    if (input.bankAccountId && existing.type === "BANK_TRANSFER") {
      const bankAccount = await this.bankAccountRepo.getById(ctx.tenantId, input.bankAccountId);
      if (!bankAccount || bankAccount.legalEntityId !== existing.legalEntityId) {
        throw new ValidationError("Bank account not found or does not belong to this legal entity");
      }
    }

    // Check if new label conflicts with another method
    if (input.label) {
      const exists = await this.paymentMethodRepo.checkLabelExists(
        ctx.tenantId,
        existing.legalEntityId,
        input.label,
        id
      );
      if (exists) {
        throw new ValidationError(`Payment method label "${input.label}" already exists`);
      }
    }

    const paymentMethod = await this.paymentMethodRepo.update(ctx.tenantId, id, input);
    return { paymentMethod };
  }

  @Post(":id/set-default")
  async setDefault(
    @Req() req: Request,
    @Param("id") id: string
  ): Promise<{ paymentMethod: PaymentMethod }> {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const existing = await this.paymentMethodRepo.getById(ctx.tenantId, id);
    if (!existing) {
      throw new ValidationError("Payment method not found");
    }

    if (!existing.isActive) {
      throw new ValidationError("Cannot set inactive payment method as default");
    }

    await this.paymentMethodRepo.setDefault(ctx.tenantId, existing.legalEntityId, id);
    const updated = await this.paymentMethodRepo.getById(ctx.tenantId, id);
    return { paymentMethod: updated };
  }

  @Post(":id/deactivate")
  async deactivate(
    @Req() req: Request,
    @Param("id") id: string
  ): Promise<{ paymentMethod: PaymentMethod }> {
    const ctx = resolveRequestContext(req);
    if (!ctx.tenantId) {
      throw new ValidationError("tenantId is required");
    }

    const paymentMethod = await this.paymentMethodRepo.deactivate(ctx.tenantId, id);
    return { paymentMethod };
  }
}
