import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  PaymentMethod,
  BankAccount,
  CreatePaymentMethodInput,
  CreateBankAccountInput,
  UpdatePaymentMethodInput,
} from "@corely/contracts";
import { PrismaPaymentMethodRepositoryAdapter } from "../infrastructure/adapters/prisma-payment-method-repository.adapter";
import { PrismaBankAccountRepositoryAdapter } from "../infrastructure/adapters/prisma-bank-account-repository.adapter";
import {
  resolveReferenceTemplate,
  snapshotPaymentMethod,
  enrichSnapshotWithBankAccount,
} from "../domain/payment-method-snapshot.helper";

describe("Payment Methods Integration Tests", () => {
  let paymentMethodRepo: PrismaPaymentMethodRepositoryAdapter;
  let bankAccountRepo: PrismaBankAccountRepositoryAdapter;
  let mockPrisma: any;

  beforeEach(() => {
    // Create shared mock for both repositories
    mockPrisma = {
      paymentMethod: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      bankAccount: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    };

    paymentMethodRepo = new PrismaPaymentMethodRepositoryAdapter(mockPrisma);
    bankAccountRepo = new PrismaBankAccountRepositoryAdapter(mockPrisma);
  });

  describe("Complete Payment Method Workflow", () => {
    it("should create bank account and payment method together", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      // Step 1: Create bank account
      const bankAccountInput: CreateBankAccountInput = {
        label: "Main Bank Account",
        accountHolderName: "Acme Inc",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        country: "DE",
        isDefault: true,
      };

      const mockBankAccount: BankAccount = {
        id: "ba-1",
        workspaceId: tenantId,
        legalEntityId,
        label: "Main Bank Account",
        accountHolderName: "Acme Inc",
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

      mockPrisma.bankAccount.create.mockResolvedValue({
        ...mockBankAccount,
        tenantId,
      });
      mockPrisma.bankAccount.updateMany.mockResolvedValue({});

      const createdAccount = await bankAccountRepo.create(
        tenantId,
        legalEntityId,
        bankAccountInput
      );

      expect(createdAccount.id).toBe("ba-1");
      expect(createdAccount.label).toBe("Main Bank Account");

      // Step 2: Create payment method with the bank account
      const paymentMethodInput: CreatePaymentMethodInput = {
        type: "BANK_TRANSFER",
        label: "Invoice Payments",
        isDefaultForInvoicing: true,
        bankAccountId: createdAccount.id,
        referenceTemplate: "INV-{invoiceNumber}",
      };

      const mockPaymentMethod: PaymentMethod = {
        id: "pm-1",
        workspaceId: tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Invoice Payments",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId: "ba-1",
        referenceTemplate: "INV-{invoiceNumber}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.create.mockResolvedValue({
        ...mockPaymentMethod,
        tenantId,
      });
      mockPrisma.paymentMethod.updateMany.mockResolvedValue({});

      const createdPaymentMethod = await paymentMethodRepo.create(
        tenantId,
        legalEntityId,
        paymentMethodInput
      );

      expect(createdPaymentMethod.type).toBe("BANK_TRANSFER");
      expect(createdPaymentMethod.bankAccountId).toBe("ba-1");

      // Step 3: Create snapshot with invoice number
      const snapshot = snapshotPaymentMethod(createdPaymentMethod, "2024-001");
      expect(snapshot.type).toBe("BANK_TRANSFER");
      expect(snapshot.referenceText).toBe("INV-2024-001");

      // Step 4: Enrich snapshot with bank account data
      const enrichedSnapshot = enrichSnapshotWithBankAccount(snapshot, mockBankAccount);
      expect(enrichedSnapshot.iban).toBeDefined();
      expect(enrichedSnapshot.iban).toBe("DE89370400440532013000");
    });

    it("should handle multiple payment methods for same legal entity", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      // Create multiple bank accounts
      const mockBankAccounts: BankAccount[] = [
        {
          id: "ba-1",
          workspaceId: tenantId,
          legalEntityId,
          label: "EUR Account",
          accountHolderName: "Acme Inc",
          iban: "DE89370400440532013000",
          bic: "COBADEFFXXX",
          bankName: "Commerzbank",
          currency: "EUR",
          country: "DE",
          isActive: true,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ba-2",
          workspaceId: tenantId,
          legalEntityId,
          label: "GBP Account",
          accountHolderName: "Acme Inc",
          iban: "GB82WEST12345698765432",
          bic: "WESTGB2L",
          bankName: "Barclays",
          currency: "GBP",
          country: "GB",
          isActive: true,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Create multiple payment methods
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: "pm-1",
          workspaceId: tenantId,
          legalEntityId,
          type: "BANK_TRANSFER",
          label: "EUR Invoices",
          isActive: true,
          isDefaultForInvoicing: true,
          bankAccountId: "ba-1",
          referenceTemplate: "INV-EUR-{invoiceNumber}",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "pm-2",
          workspaceId: tenantId,
          legalEntityId,
          type: "BANK_TRANSFER",
          label: "GBP Invoices",
          isActive: true,
          isDefaultForInvoicing: false,
          bankAccountId: "ba-2",
          referenceTemplate: "INV-GBP-{invoiceNumber}",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.paymentMethod.findMany.mockResolvedValue(
        mockPaymentMethods.map((pm) => ({ ...pm, tenantId }))
      );

      const paymentMethods = await paymentMethodRepo.listByLegalEntity(tenantId, legalEntityId);

      expect(paymentMethods).toHaveLength(2);
      expect(paymentMethods[0].referenceTemplate).toBe("INV-EUR-{invoiceNumber}");
      expect(paymentMethods[1].referenceTemplate).toBe("INV-GBP-{invoiceNumber}");

      // Create snapshots for all payment methods
      const snapshots = paymentMethods.map((pm) => snapshotPaymentMethod(pm, "2024-001"));
      expect(snapshots).toHaveLength(2);

      // Enrich with their respective bank accounts
      const enrichedSnapshots = snapshots.map((snapshot, index) =>
        enrichSnapshotWithBankAccount(snapshot, mockBankAccounts[index])
      );

      expect(enrichedSnapshots[0].currency).toBe("EUR");
      expect(enrichedSnapshots[1].currency).toBe("GBP");
    });
  });

  describe("Payment Method State Management", () => {
    it("should update payment method properties", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      // Get current payment methods
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: "pm-1",
          workspaceId: tenantId,
          legalEntityId,
          type: "BANK_TRANSFER",
          label: "Primary",
          isActive: true,
          isDefaultForInvoicing: true,
          bankAccountId: "ba-1",
          referenceTemplate: "INV-{invoiceNumber}",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "pm-2",
          workspaceId: tenantId,
          legalEntityId,
          type: "PAYPAL",
          label: "Backup",
          isActive: true,
          isDefaultForInvoicing: false,
          referenceTemplate: "PAY-{invoiceNumber}",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.paymentMethod.findMany.mockResolvedValue(
        mockPaymentMethods.map((pm) => ({ ...pm, tenantId }))
      );

      // Update the label
      const updateInput: UpdatePaymentMethodInput = {
        label: "Updated Label",
      };

      const mockUpdated: PaymentMethod = {
        ...mockPaymentMethods[0],
        label: "Updated Label",
      };

      mockPrisma.paymentMethod.update.mockResolvedValue({
        ...mockUpdated,
        tenantId,
      });

      const updated = await paymentMethodRepo.update(tenantId, "pm-1", updateInput);

      expect(updated.label).toBe("Updated Label");
      expect(updated.isDefaultForInvoicing).toBe(true);
    });

    it("should set payment method as default for legal entity", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      const mockMethod: PaymentMethod = {
        id: "pm-2",
        workspaceId: tenantId,
        legalEntityId,
        type: "PAYPAL",
        label: "PayPal",
        isActive: true,
        isDefaultForInvoicing: false,
        referenceTemplate: "PAY-{invoiceNumber}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.findFirst.mockResolvedValue({
        ...mockMethod,
        tenantId,
      });
      mockPrisma.paymentMethod.updateMany.mockResolvedValue({});
      mockPrisma.paymentMethod.update.mockResolvedValue({
        ...mockMethod,
        isDefaultForInvoicing: true,
        tenantId,
      });

      // Call setDefault
      await paymentMethodRepo.setDefault(tenantId, legalEntityId, "pm-2");

      // Verify updateMany was called to unset previous defaults
      expect(mockPrisma.paymentMethod.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalEntityId,
          NOT: { id: "pm-2" },
        },
        data: { isDefaultForInvoicing: false },
      });

      // Verify update was called to set this as default
      expect(mockPrisma.paymentMethod.update).toHaveBeenCalledWith({
        where: { id: "pm-2" },
        data: { isDefaultForInvoicing: true },
      });
    });

    it("should deactivate payment method and handle dependent snapshots", async () => {
      const tenantId = "tenant-1";

      const mockPaymentMethod: PaymentMethod = {
        id: "pm-1",
        workspaceId: tenantId,
        legalEntityId: "le-1",
        type: "BANK_TRANSFER",
        label: "Inactive Payment Method",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId: "ba-1",
        referenceTemplate: "INV-{invoiceNumber}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.update.mockResolvedValue({
        ...mockPaymentMethod,
        isActive: false,
        isDefaultForInvoicing: false,
        tenantId,
      });

      const deactivated = await paymentMethodRepo.deactivate(tenantId, "pm-1");

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.isDefaultForInvoicing).toBe(false);

      // Snapshot should still be creatable from previous state
      const snapshot = snapshotPaymentMethod(mockPaymentMethod, "2024-001");
      expect(snapshot).toBeDefined();
      expect(snapshot.type).toBe("BANK_TRANSFER");
    });
  });

  describe("Reference Template Processing", () => {
    it("should resolve templates with various invoice numbers", async () => {
      const testCases = [
        {
          template: "INV-{invoiceNumber}",
          invoiceNumber: "001",
          expected: "INV-001",
        },
        {
          template: "INV-{invoiceNumber}",
          invoiceNumber: "123",
          expected: "INV-123",
        },
        {
          template: "INV-{invoiceNumber}",
          invoiceNumber: null,
          expected: "INV-DRAFT",
        },
      ];

      for (const testCase of testCases) {
        const resolved = resolveReferenceTemplate(testCase.template, testCase.invoiceNumber);
        expect(resolved).toBe(testCase.expected);
      }
    });

    it("should create snapshots with resolved reference text", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      const paymentMethod: PaymentMethod = {
        id: "pm-1",
        workspaceId: tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Invoice Payments",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId: "ba-1",
        referenceTemplate: "INV-{invoiceNumber}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const snapshot = snapshotPaymentMethod(paymentMethod, "2024-001");
      expect(snapshot.referenceText).toBe("INV-2024-001");
    });
  });

  describe("Bank Account Lifecycle with Payment Methods", () => {
    it("should handle bank account update affecting payment method snapshots", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const bankAccountId = "ba-1";

      // Original bank account
      const originalBankAccount: BankAccount = {
        id: bankAccountId,
        workspaceId: tenantId,
        legalEntityId,
        label: "Original Name",
        accountHolderName: "Original Holder",
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

      // Updated bank account
      const updatedBankAccount: BankAccount = {
        ...originalBankAccount,
        label: "Updated Name",
        accountHolderName: "Updated Holder",
      };

      mockPrisma.bankAccount.update.mockResolvedValue({
        ...updatedBankAccount,
        tenantId,
      });

      const updated = await bankAccountRepo.update(tenantId, bankAccountId, {
        label: "Updated Name",
        accountHolderName: "Updated Holder",
      });

      expect(updated.label).toBe("Updated Name");
      expect(updated.accountHolderName).toBe("Updated Holder");

      // Create payment method
      const paymentMethod: PaymentMethod = {
        id: "pm-1",
        workspaceId: tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Invoice Payments",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId,
        referenceTemplate: "INV-{invoiceNumber}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create snapshots with both versions
      const snapshot1 = snapshotPaymentMethod(paymentMethod, "2024-001");
      const enrichedSnapshot1 = enrichSnapshotWithBankAccount(snapshot1, originalBankAccount);

      const enrichedSnapshot2 = enrichSnapshotWithBankAccount(snapshot1, updatedBankAccount);

      expect(enrichedSnapshot1.accountHolderName).toBe("Original Holder");
      expect(enrichedSnapshot2.accountHolderName).toBe("Updated Holder");
    });

    it("should handle currency defaults when setting bank account as default", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      // Bank accounts for different currencies
      const gbpAccount: BankAccount = {
        id: "ba-2",
        workspaceId: tenantId,
        legalEntityId,
        label: "GBP Account",
        accountHolderName: "Holder",
        iban: "GB82WEST12345698765432",
        bic: "WESTGB2L",
        bankName: "Barclays",
        currency: "GBP",
        country: "GB",
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate finding the GBP account
      mockPrisma.bankAccount.findFirst.mockResolvedValue({
        ...gbpAccount,
        tenantId,
      });

      const found = await bankAccountRepo.getById(tenantId, "ba-2");
      expect(found?.currency).toBe("GBP");

      // When setting as default, updateMany should be called with currency filter
      mockPrisma.bankAccount.updateMany.mockResolvedValue({});
      mockPrisma.bankAccount.update.mockResolvedValue({
        ...gbpAccount,
        isDefault: true,
        tenantId,
      });

      await bankAccountRepo.setDefault(tenantId, legalEntityId, "ba-2", "GBP");

      expect(mockPrisma.bankAccount.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalEntityId,
          currency: "GBP",
          NOT: { id: "ba-2" },
        },
        data: { isDefault: false },
      });
    });
  });

  describe("Data Validation Across Layers", () => {
    it("should validate label uniqueness when creating payment method", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const label = "Invoice Payments";

      mockPrisma.paymentMethod.count.mockResolvedValue(1);

      const exists = await paymentMethodRepo.checkLabelExists(tenantId, legalEntityId, label);

      expect(exists).toBe(true);
    });

    it("should validate label uniqueness excluding specific payment method", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const label = "Invoice Payments";
      const excludeId = "pm-1";

      mockPrisma.paymentMethod.count.mockResolvedValue(0);

      const exists = await paymentMethodRepo.checkLabelExists(
        tenantId,
        legalEntityId,
        label,
        excludeId
      );

      expect(exists).toBe(false);

      expect(mockPrisma.paymentMethod.count).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalEntityId,
          label,
          NOT: { id: excludeId },
        },
      });
    });

    it("should validate bank account label uniqueness", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const label = "Main Account";

      mockPrisma.bankAccount.count.mockResolvedValue(1);

      const exists = await bankAccountRepo.checkLabelExists(tenantId, legalEntityId, label);

      expect(exists).toBe(true);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle payment method not found", async () => {
      const tenantId = "tenant-1";

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);

      const result = await paymentMethodRepo.getById(tenantId, "non-existent");

      expect(result).toBeNull();
    });

    it("should handle bank account not found when setting default", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";
      const accountId = "non-existent";

      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      await expect(bankAccountRepo.setDefault(tenantId, legalEntityId, accountId)).rejects.toThrow(
        "Bank account not found"
      );
    });

    it("should handle empty lists gracefully", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      mockPrisma.paymentMethod.findMany.mockResolvedValue([]);

      const result = await paymentMethodRepo.listByLegalEntity(tenantId, legalEntityId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("Cross-Layer Consistency", () => {
    it("should maintain consistency between payment method and bank account data", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      const bankAccount: BankAccount = {
        id: "ba-1",
        workspaceId: tenantId,
        legalEntityId,
        label: "Primary Account",
        accountHolderName: "Acme Inc",
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

      const paymentMethod: PaymentMethod = {
        id: "pm-1",
        workspaceId: tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Invoice Payments",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId: "ba-1",
        referenceTemplate: "INV-{invoiceNumber}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Verify references point to correct entities
      expect(paymentMethod.bankAccountId).toBe(bankAccount.id);
      expect(paymentMethod.workspaceId).toBe(bankAccount.workspaceId);
      expect(paymentMethod.legalEntityId).toBe(bankAccount.legalEntityId);

      // Create and enrich snapshot
      const snapshot = snapshotPaymentMethod(paymentMethod, "2024-001");
      const enrichedSnapshot = enrichSnapshotWithBankAccount(snapshot, bankAccount);

      // Verify enriched snapshot has consistent data
      expect(enrichedSnapshot.type).toBe(paymentMethod.type);
      expect(enrichedSnapshot.iban).toBe(bankAccount.iban);
      expect(enrichedSnapshot.currency).toBe(bankAccount.currency);
    });

    it("should handle orphaned payment methods gracefully", async () => {
      const tenantId = "tenant-1";
      const legalEntityId = "le-1";

      const orphanedPaymentMethod: PaymentMethod = {
        id: "pm-1",
        workspaceId: tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Orphaned Payment",
        isActive: true,
        isDefaultForInvoicing: false,
        bankAccountId: "deleted-ba-1", // Points to deleted bank account
        referenceTemplate: "INV-{invoiceNumber}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      const bankAccount = await bankAccountRepo.getById(tenantId, "deleted-ba-1");

      // Snapshot can still be created from payment method
      const snapshot = snapshotPaymentMethod(orphanedPaymentMethod, "2024-001");
      expect(snapshot).toBeDefined();

      // But enrichment should handle null gracefully
      if (bankAccount) {
        const enrichedSnapshot = enrichSnapshotWithBankAccount(snapshot, bankAccount);
        expect(enrichedSnapshot).toBeDefined();
      } else {
        expect(bankAccount).toBeNull();
      }
    });
  });
});
