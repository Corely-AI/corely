import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { PaymentMethodRepositoryPort } from "../../application/ports/payment-method-repository.port";
import type {
  PaymentMethod,
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from "@corely/contracts";

@Injectable()
export class PrismaPaymentMethodRepositoryAdapter implements PaymentMethodRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | null) {}

  async create(
    tenantId: string,
    legalEntityId: string,
    input: CreatePaymentMethodInput
  ): Promise<PaymentMethod> {
    const method = await this.prisma!.paymentMethod.create({
      data: {
        tenantId,
        legalEntityId,
        type: input.type,
        label: input.label,
        bankAccountId: input.bankAccountId || null,
        instructions: input.instructions || null,
        payUrl: input.payUrl || null,
        referenceTemplate: input.referenceTemplate || "INV-{invoiceNumber}",
        isActive: true,
        isDefaultForInvoicing: input.isDefaultForInvoicing || false,
      },
    });

    // If this is set as default, unset other defaults for this legalEntity
    if (input.isDefaultForInvoicing) {
      await this.prisma!.paymentMethod.updateMany({
        where: {
          tenantId,
          legalEntityId,
          NOT: { id: method.id },
        },
        data: { isDefaultForInvoicing: false },
      });
    }

    return this.mapToDomain(method);
  }

  async getById(tenantId: string, id: string): Promise<PaymentMethod | null> {
    const method = await this.prisma!.paymentMethod.findFirst({
      where: { id, tenantId },
    });
    return method ? this.mapToDomain(method) : null;
  }

  async listByLegalEntity(tenantId: string, legalEntityId: string): Promise<PaymentMethod[]> {
    const methods = await this.prisma!.paymentMethod.findMany({
      where: { tenantId, legalEntityId, isActive: true },
      orderBy: [{ isDefaultForInvoicing: "desc" }, { createdAt: "desc" }],
    });
    return methods.map((m) => this.mapToDomain(m));
  }

  async getDefault(tenantId: string, legalEntityId: string): Promise<PaymentMethod | null> {
    const method = await this.prisma!.paymentMethod.findFirst({
      where: {
        tenantId,
        legalEntityId,
        isActive: true,
        isDefaultForInvoicing: true,
      },
    });
    return method ? this.mapToDomain(method) : null;
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdatePaymentMethodInput
  ): Promise<PaymentMethod> {
    const method = await this.prisma!.paymentMethod.update({
      where: { id },
      data: {
        label: input.label,
        bankAccountId: input.bankAccountId,
        instructions: input.instructions,
        payUrl: input.payUrl,
        referenceTemplate: input.referenceTemplate,
      },
    });
    return this.mapToDomain(method);
  }

  async setDefault(tenantId: string, legalEntityId: string, id: string): Promise<void> {
    // Verify the method exists and belongs to this scope
    const method = await this.prisma!.paymentMethod.findFirst({
      where: { id, tenantId, legalEntityId },
    });

    if (!method) {
      throw new Error("Payment method not found");
    }

    // Unset other defaults for this legalEntity
    await this.prisma!.paymentMethod.updateMany({
      where: {
        tenantId,
        legalEntityId,
        NOT: { id },
      },
      data: { isDefaultForInvoicing: false },
    });

    // Set this one as default
    await this.prisma!.paymentMethod.update({
      where: { id },
      data: { isDefaultForInvoicing: true },
    });
  }

  async deactivate(tenantId: string, id: string): Promise<PaymentMethod> {
    const method = await this.prisma!.paymentMethod.update({
      where: { id },
      data: { isActive: false, isDefaultForInvoicing: false },
    });
    return this.mapToDomain(method);
  }

  async checkLabelExists(
    tenantId: string,
    legalEntityId: string,
    label: string,
    excludeId?: string
  ): Promise<boolean> {
    const count = await this.prisma!.paymentMethod.count({
      where: {
        tenantId,
        legalEntityId,
        label,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    return count > 0;
  }

  async getBankAccountWithPaymentMethods(
    tenantId: string,
    bankAccountId: string
  ): Promise<PaymentMethod[]> {
    const methods = await this.prisma!.paymentMethod.findMany({
      where: {
        tenantId,
        bankAccountId,
      },
    });
    return methods.map((m) => this.mapToDomain(m));
  }

  private mapToDomain(raw: any): PaymentMethod {
    return {
      id: raw.id,
      workspaceId: raw.tenantId,
      legalEntityId: raw.legalEntityId,
      type: raw.type,
      label: raw.label,
      isActive: raw.isActive,
      isDefaultForInvoicing: raw.isDefaultForInvoicing,
      bankAccountId: raw.bankAccountId,
      instructions: raw.instructions,
      payUrl: raw.payUrl,
      referenceTemplate: raw.referenceTemplate,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
