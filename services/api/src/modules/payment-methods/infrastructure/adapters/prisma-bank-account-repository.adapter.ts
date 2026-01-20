import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { BankAccountRepositoryPort } from "../../application/ports/bank-account-repository.port";
import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from "@corely/contracts";

@Injectable()
export class PrismaBankAccountRepositoryAdapter implements BankAccountRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | null) {}

  async create(
    tenantId: string,
    legalEntityId: string,
    input: CreateBankAccountInput
  ): Promise<BankAccount> {
    const account = await this.prisma!.bankAccount.create({
      data: {
        tenantId,
        legalEntityId,
        label: input.label,
        accountHolderName: input.accountHolderName,
        iban: input.iban,
        bic: input.bic || null,
        bankName: input.bankName || null,
        currency: input.currency || "EUR",
        country: input.country || null,
        isActive: true,
        isDefault: input.isDefault || false,
      },
    });

    // If this is set as default, unset other defaults for this legalEntity and currency
    if (input.isDefault) {
      await this.prisma!.bankAccount.updateMany({
        where: {
          tenantId,
          legalEntityId,
          currency: input.currency || "EUR",
          NOT: { id: account.id },
        },
        data: { isDefault: false },
      });
    }

    return this.mapToDomain(account);
  }

  async getById(tenantId: string, id: string): Promise<BankAccount | null> {
    const account = await this.prisma!.bankAccount.findFirst({
      where: { id, tenantId },
    });
    return account ? this.mapToDomain(account) : null;
  }

  async listByLegalEntity(tenantId: string, legalEntityId: string): Promise<BankAccount[]> {
    const accounts = await this.prisma!.bankAccount.findMany({
      where: { tenantId, legalEntityId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return accounts.map((acc) => this.mapToDomain(acc));
  }

  async update(tenantId: string, id: string, input: UpdateBankAccountInput): Promise<BankAccount> {
    const account = await this.prisma!.bankAccount.update({
      where: { id },
      data: {
        label: input.label,
        accountHolderName: input.accountHolderName,
        iban: input.iban,
        bic: input.bic,
        bankName: input.bankName,
        currency: input.currency,
        country: input.country,
      },
    });
    return this.mapToDomain(account);
  }

  async setDefault(
    tenantId: string,
    legalEntityId: string,
    id: string,
    currency?: string
  ): Promise<void> {
    const account = await this.prisma!.bankAccount.findFirst({
      where: { id, tenantId, legalEntityId },
    });

    if (!account) {
      throw new Error("Bank account not found");
    }

    // Unset other defaults for same currency
    const currencyFilter = currency || account.currency;
    await this.prisma!.bankAccount.updateMany({
      where: {
        tenantId,
        legalEntityId,
        currency: currencyFilter,
        NOT: { id },
      },
      data: { isDefault: false },
    });

    // Set this one as default
    await this.prisma!.bankAccount.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async deactivate(tenantId: string, id: string): Promise<BankAccount> {
    const account = await this.prisma!.bankAccount.update({
      where: { id },
      data: { isActive: false, isDefault: false },
    });
    return this.mapToDomain(account);
  }

  async checkLabelExists(
    tenantId: string,
    legalEntityId: string,
    label: string,
    excludeId?: string
  ): Promise<boolean> {
    const count = await this.prisma!.bankAccount.count({
      where: {
        tenantId,
        legalEntityId,
        label,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    return count > 0;
  }

  private mapToDomain(raw: any): BankAccount {
    return {
      id: raw.id,
      workspaceId: raw.tenantId, // API uses workspaceId in contracts, DB uses tenantId
      legalEntityId: raw.legalEntityId,
      label: raw.label,
      accountHolderName: raw.accountHolderName,
      iban: raw.iban,
      bic: raw.bic,
      bankName: raw.bankName,
      currency: raw.currency,
      country: raw.country,
      isActive: raw.isActive,
      isDefault: raw.isDefault,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
