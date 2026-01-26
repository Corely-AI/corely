import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from "@corely/contracts";
import { PrismaBankAccountRepositoryAdapter } from "../infrastructure/adapters/prisma-bank-account-repository.adapter";

describe("PrismaBankAccountRepositoryAdapter Unit Tests", () => {
  let repository: PrismaBankAccountRepositoryAdapter;
  let mockPrisma: any;

  beforeEach(() => {
    // Create comprehensive mock for all Prisma operations
    mockPrisma = {
      bankAccount: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    };

    repository = new PrismaBankAccountRepositoryAdapter(mockPrisma);
  });

  describe("create", () => {
    it("should create a bank account with all fields", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const input: CreateBankAccountInput = {
        label: "Main Account",
        accountHolderName: "John Doe GmbH",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        country: "DE",
        isDefault: true,
      };

      const mockAccount = {
        id: "ba-1",
        tenantId,
        legalEntityId,
        ...input,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.create.mockResolvedValue(mockAccount);
      mockPrisma.bankAccount.updateMany.mockResolvedValue({});

      const result = await repository.create(tenantId, legalEntityId, input);

      expect(result).toMatchObject({
        workspaceId: tenantId,
        label: "Main Account",
        accountHolderName: "John Doe GmbH",
        iban: "DE89370400440532013000",
      });
      expect(mockPrisma.bankAccount.create).toHaveBeenCalled();
    });

    it("should handle null BIC field", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const input: CreateBankAccountInput = {
        label: "Account without BIC",
        accountHolderName: "Jane Smith",
        iban: "GB82WEST12345698765432",
        bic: null,
        bankName: "Barclays",
        currency: "GBP",
        country: "GB",
      };

      const mockAccount = {
        id: "ba-2",
        tenantId,
        legalEntityId,
        label: input.label,
        accountHolderName: input.accountHolderName,
        iban: input.iban,
        bic: null,
        bankName: input.bankName,
        currency: input.currency,
        country: input.country,
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.create.mockResolvedValue(mockAccount);

      const result = await repository.create(tenantId, legalEntityId, input);

      expect(result.bic).toBeNull();
    });

    it("should unset other defaults when setting isDefault=true", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const input: CreateBankAccountInput = {
        label: "New Default",
        accountHolderName: "Account Holder",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        isDefault: true,
      };

      const mockAccount = {
        id: "ba-3",
        tenantId,
        legalEntityId,
        ...input,
        isActive: true,
        country: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.create.mockResolvedValue(mockAccount);
      mockPrisma.bankAccount.updateMany.mockResolvedValue({});

      await repository.create(tenantId, legalEntityId, input);

      expect(mockPrisma.bankAccount.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalEntityId,
          currency: "EUR",
          NOT: { id: "ba-3" },
        },
        data: { isDefault: false },
      });
    });
  });

  describe("getById", () => {
    it("should retrieve bank account by ID", async () => {
      const tenantId = "tenant-1";
      const accountId = "ba-1";
      const mockAccount = {
        id: accountId,
        tenantId,
        legalEntityId: "le-1",
        label: "Main Account",
        accountHolderName: "John Doe",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        country: "DE",
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(mockAccount);

      const result = await repository.getById(tenantId, accountId);

      expect(result).toMatchObject({
        id: accountId,
        workspaceId: tenantId,
        label: "Main Account",
      });
      expect(mockPrisma.bankAccount.findFirst).toHaveBeenCalledWith({
        where: { id: accountId, tenantId },
      });
    });

    it("should return null for non-existent account", async () => {
      const tenantId = "tenant-1";
      const accountId = "non-existent";

      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      const result = await repository.getById(tenantId, accountId);

      expect(result).toBeNull();
    });
  });

  describe("listByLegalEntity", () => {
    it("should list all active accounts for legal entity", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const mockAccounts = [
        {
          id: "ba-1",
          tenantId,
          legalEntityId,
          label: "Account 1",
          isDefault: true,
          isActive: true,
          currency: "EUR",
          iban: "DE89370400440532013000",
          accountHolderName: "Owner",
          bic: null,
          bankName: null,
          country: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ba-2",
          tenantId,
          legalEntityId,
          label: "Account 2",
          isDefault: false,
          isActive: true,
          currency: "GBP",
          iban: "GB82WEST12345698765432",
          accountHolderName: "Owner",
          bic: null,
          bankName: null,
          country: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.bankAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await repository.listByLegalEntity(tenantId, legalEntityId);

      expect(result).toHaveLength(2);
      expect(result[0].label).toBe("Account 1");
      expect(mockPrisma.bankAccount.findMany).toHaveBeenCalledWith({
        where: { tenantId, legalEntityId, isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
    });

    it("should return empty list for legal entity with no accounts", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-2";

      mockPrisma.bankAccount.findMany.mockResolvedValue([]);

      const result = await repository.listByLegalEntity(tenantId, legalEntityId);

      expect(result).toEqual([]);
    });

    it("should only return active accounts", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      mockPrisma.bankAccount.findMany.mockResolvedValue([]);

      await repository.listByLegalEntity(tenantId, legalEntityId);

      expect(mockPrisma.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  describe("update", () => {
    it("should update bank account label", async () => {
      const tenantId = "tenant-1";
      const accountId = "ba-1";
      const input: UpdateBankAccountInput = {
        label: "Updated Label",
      };

      const mockUpdated = {
        id: accountId,
        tenantId,
        legalEntityId: "le-1",
        label: "Updated Label",
        accountHolderName: "John Doe",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        country: "DE",
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.update.mockResolvedValue(mockUpdated);

      const result = await repository.update(tenantId, accountId, input);

      expect(result.label).toBe("Updated Label");
      expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: accountId },
        })
      );
    });

    it("should update multiple fields", async () => {
      const tenantId = "tenant-1";
      const accountId = "ba-1";
      const input: UpdateBankAccountInput = {
        label: "New Label",
        accountHolderName: "New Owner",
        bankName: "New Bank",
      };

      const mockUpdated = {
        id: accountId,
        tenantId,
        legalEntityId: "le-1",
        label: "New Label",
        accountHolderName: "New Owner",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "New Bank",
        currency: "EUR",
        country: "DE",
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.update.mockResolvedValue(mockUpdated);

      const result = await repository.update(tenantId, accountId, input);

      expect(result.accountHolderName).toBe("New Owner");
      expect(result.bankName).toBe("New Bank");
    });

    it("should handle partial updates", async () => {
      const tenantId = "tenant-1";
      const accountId = "ba-1";
      const input: UpdateBankAccountInput = {
        label: "Partial Update",
      };

      const mockUpdated = {
        id: accountId,
        tenantId,
        legalEntityId: "le-1",
        label: "Partial Update",
        accountHolderName: "John Doe",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        country: "DE",
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.update.mockResolvedValue(mockUpdated);

      const result = await repository.update(tenantId, accountId, input);

      expect(result).toBeDefined();
      expect(mockPrisma.bankAccount.update).toHaveBeenCalled();
    });
  });

  describe("setDefault", () => {
    it("should set bank account as default for legal entity and currency", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const accountId = "ba-2";
      const currency = "EUR";

      const mockAccount = {
        id: accountId,
        tenantId,
        legalEntityId,
        currency,
        label: "Account 2",
        accountHolderName: "Owner",
        iban: "GB82WEST12345698765432",
        bic: null,
        bankName: null,
        country: null,
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.bankAccount.updateMany.mockResolvedValue({});
      mockPrisma.bankAccount.update.mockResolvedValue({
        ...mockAccount,
        isDefault: true,
      });

      await repository.setDefault(tenantId, legalEntityId, accountId, currency);

      expect(mockPrisma.bankAccount.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalEntityId,
          currency,
          NOT: { id: accountId },
        },
        data: { isDefault: false },
      });

      expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { isDefault: true },
      });
    });

    it("should throw error if account not found", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const accountId = "non-existent";

      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      await expect(repository.setDefault(tenantId, legalEntityId, accountId)).rejects.toThrow(
        "Bank account not found"
      );
    });

    it("should use account currency if not specified", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const accountId = "ba-2";

      const mockAccount = {
        id: accountId,
        tenantId,
        legalEntityId,
        currency: "GBP",
        label: "Account 2",
        accountHolderName: "Owner",
        iban: "GB82WEST12345698765432",
        bic: null,
        bankName: null,
        country: null,
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.bankAccount.updateMany.mockResolvedValue({});
      mockPrisma.bankAccount.update.mockResolvedValue({
        ...mockAccount,
        isDefault: true,
      });

      await repository.setDefault(tenantId, legalEntityId, accountId);

      expect(mockPrisma.bankAccount.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalEntityId,
          currency: "GBP",
          NOT: { id: accountId },
        },
        data: { isDefault: false },
      });
    });
  });

  describe("deactivate", () => {
    it("should deactivate bank account and unset default", async () => {
      const tenantId = "tenant-1";
      const accountId = "ba-1";

      const mockUpdated = {
        id: accountId,
        tenantId,
        legalEntityId: "le-1",
        label: "Main Account",
        accountHolderName: "John Doe",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        country: "DE",
        isActive: false,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.update.mockResolvedValue(mockUpdated);

      const result = await repository.deactivate(tenantId, accountId);

      expect(result.isActive).toBe(false);
      expect(result.isDefault).toBe(false);
      expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { isActive: false, isDefault: false },
      });
    });
  });

  describe("checkLabelExists", () => {
    it("should return true if label exists", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const label = "Main Account";

      mockPrisma.bankAccount.count.mockResolvedValue(1);

      const exists = await repository.checkLabelExists(tenantId, legalEntityId, label);

      expect(exists).toBe(true);
      expect(mockPrisma.bankAccount.count).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalEntityId,
          label,
        },
      });
    });

    it("should return false if label does not exist", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const label = "Non-existent Account";

      mockPrisma.bankAccount.count.mockResolvedValue(0);

      const exists = await repository.checkLabelExists(tenantId, legalEntityId, label);

      expect(exists).toBe(false);
    });

    it("should exclude specified account ID from check", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const label = "Account Label";
      const excludeId = "ba-1";

      mockPrisma.bankAccount.count.mockResolvedValue(0);

      const exists = await repository.checkLabelExists(tenantId, legalEntityId, label, excludeId);

      expect(exists).toBe(false);
      expect(mockPrisma.bankAccount.count).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalEntityId,
          label,
          NOT: { id: excludeId },
        },
      });
    });

    it("should handle label existence check without exclusion", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const label = "Update Label Test";

      mockPrisma.bankAccount.count.mockResolvedValue(0);

      const exists = await repository.checkLabelExists(
        tenantId,
        legalEntityId,
        "Update Label Test",
        "ba-1"
      );

      expect(exists).toBe(false);
    });
  });
});
