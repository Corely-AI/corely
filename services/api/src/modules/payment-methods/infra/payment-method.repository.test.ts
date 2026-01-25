import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaPaymentMethodRepositoryAdapter } from "../infrastructure/adapters/prisma-payment-method-repository.adapter";
import type {
  PaymentMethod,
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from "@corely/contracts";

describe("PrismaPaymentMethodRepositoryAdapter Unit Tests", () => {
  let repository: PrismaPaymentMethodRepositoryAdapter;
  let mockPrisma: any;
  const tenantId = "test-tenant";
  const legalEntityId = "test-le";

  beforeEach(() => {
    mockPrisma = {
      paymentMethod: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    };

    repository = new PrismaPaymentMethodRepositoryAdapter(mockPrisma);
  });

  describe("create", () => {
    it("should create a BANK_TRANSFER payment method", async () => {
      const mockPaymentMethod = {
        id: "pm-1",
        tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Test Bank Account",
        bankAccountId: "test-ba",
        referenceTemplate: "INV-{invoiceNumber}",
        isActive: true,
        isDefaultForInvoicing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.create.mockResolvedValue(mockPaymentMethod);
      mockPrisma.paymentMethod.updateMany.mockResolvedValue({ count: 0 });

      const input: CreatePaymentMethodInput = {
        type: "BANK_TRANSFER",
        label: "Test Bank Account",
        isDefaultForInvoicing: false,
        bankAccountId: "test-ba",
        referenceTemplate: "INV-{invoiceNumber}",
      };

      const created = await repository.create(tenantId, legalEntityId, input);

      expect(created.type).toBe("BANK_TRANSFER");
      expect(created.label).toBe("Test Bank Account");
      expect(mockPrisma.paymentMethod.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          legalEntityId,
          type: "BANK_TRANSFER",
          label: "Test Bank Account",
        }),
      });
    });

    it("should create PAYPAL payment method with instructions", async () => {
      const mockPaymentMethod = {
        id: "pm-2",
        tenantId,
        legalEntityId,
        type: "PAYPAL",
        label: "PayPal Account",
        instructions: "Send to paypal@example.com",
        payUrl: "https://paypal.me/example",
        isActive: true,
        isDefaultForInvoicing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.create.mockResolvedValue(mockPaymentMethod);
      mockPrisma.paymentMethod.updateMany.mockResolvedValue({ count: 0 });

      const input: CreatePaymentMethodInput = {
        type: "PAYPAL",
        label: "PayPal Account",
        isDefaultForInvoicing: false,
        instructions: "Send to paypal@example.com",
        payUrl: "https://paypal.me/example",
      };

      const created = await repository.create(tenantId, legalEntityId, input);

      expect(created.type).toBe("PAYPAL");
      expect(created.instructions).toBe("Send to paypal@example.com");
    });

    it("should set payment method as default and unset others", async () => {
      const mockPaymentMethod = {
        id: "pm-3",
        tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Default Method",
        bankAccountId: "ba-1",
        isActive: true,
        isDefaultForInvoicing: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.create.mockResolvedValue(mockPaymentMethod);
      mockPrisma.paymentMethod.updateMany.mockResolvedValue({ count: 1 });

      const input: CreatePaymentMethodInput = {
        type: "BANK_TRANSFER",
        label: "Default Method",
        isDefaultForInvoicing: true,
        bankAccountId: "ba-1",
      };

      const created = await repository.create(tenantId, legalEntityId, input);

      expect(created.isDefaultForInvoicing).toBe(true);
      expect(mockPrisma.paymentMethod.updateMany).toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("should find payment method by id", async () => {
      const mockPaymentMethod = {
        id: "pm-1",
        tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Find Test",
        bankAccountId: "test-ba",
        isActive: true,
        isDefaultForInvoicing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(mockPaymentMethod);

      const found = await repository.getById(tenantId, "pm-1");

      expect(found?.type).toBe("BANK_TRANSFER");
      expect(mockPrisma.paymentMethod.findFirst).toHaveBeenCalledWith({
        where: { id: "pm-1", tenantId },
      });
    });

    it("should return null for non-existent id", async () => {
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);

      const found = await repository.getById(tenantId, "non-existent-id");

      expect(found).toBeNull();
    });
  });

  describe("listByLegalEntity", () => {
    it("should list payment methods for legal entity", async () => {
      const mockMethods = [
        {
          id: "pm-1",
          tenantId,
          legalEntityId,
          type: "BANK_TRANSFER",
          label: "Method 1",
          bankAccountId: "ba-1",
          isActive: true,
          isDefaultForInvoicing: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "pm-2",
          tenantId,
          legalEntityId,
          type: "PAYPAL",
          label: "Method 2",
          payUrl: "https://paypal.me",
          isActive: true,
          isDefaultForInvoicing: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.paymentMethod.findMany.mockResolvedValue(mockMethods);

      const found = await repository.listByLegalEntity(tenantId, legalEntityId);

      expect(found).toHaveLength(2);
      expect(found[0].label).toBe("Method 1");
      expect(mockPrisma.paymentMethod.findMany).toHaveBeenCalledWith({
        where: { tenantId, legalEntityId, isActive: true },
        orderBy: expect.any(Array),
      });
    });

    it("should return empty array for legal entity with no methods", async () => {
      mockPrisma.paymentMethod.findMany.mockResolvedValue([]);

      const found = await repository.listByLegalEntity(tenantId, "new-le");

      expect(found).toHaveLength(0);
    });
  });

  describe("getDefault", () => {
    it("should return default payment method", async () => {
      const mockMethod = {
        id: "pm-1",
        tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Default",
        isActive: true,
        isDefaultForInvoicing: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(mockMethod);

      const found = await repository.getDefault(tenantId, legalEntityId);

      expect(found?.isDefaultForInvoicing).toBe(true);
    });

    it("should return null if no default", async () => {
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);

      const found = await repository.getDefault(tenantId, legalEntityId);

      expect(found).toBeNull();
    });
  });

  describe("update", () => {
    it("should update payment method", async () => {
      const mockUpdated = {
        id: "pm-1",
        tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Updated Label",
        bankAccountId: "test-ba",
        referenceTemplate: "INV-{invoiceNumber}",
        isActive: true,
        isDefaultForInvoicing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.update.mockResolvedValue(mockUpdated);

      const input: UpdatePaymentMethodInput = {
        label: "Updated Label",
      };

      const updated = await repository.update(tenantId, "pm-1", input);

      expect(updated.label).toBe("Updated Label");
      expect(mockPrisma.paymentMethod.update).toHaveBeenCalledWith({
        where: { id: "pm-1" },
        data: expect.objectContaining({ label: "Updated Label" }),
      });
    });
  });

  describe("setDefault", () => {
    it("should set payment method as default", async () => {
      mockPrisma.paymentMethod.findFirst.mockResolvedValue({ id: "pm-1" });
      mockPrisma.paymentMethod.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.paymentMethod.update.mockResolvedValue({ id: "pm-1" });

      await repository.setDefault(tenantId, legalEntityId, "pm-1");

      expect(mockPrisma.paymentMethod.updateMany).toHaveBeenCalled();
      expect(mockPrisma.paymentMethod.update).toHaveBeenCalled();
    });

    it("should throw if payment method not found", async () => {
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);

      await expect(
        repository.setDefault(tenantId, legalEntityId, "non-existent")
      ).rejects.toThrow();
    });
  });

  describe("deactivate", () => {
    it("should deactivate payment method", async () => {
      const mockDeactivated = {
        id: "pm-1",
        tenantId,
        legalEntityId,
        type: "BANK_TRANSFER",
        label: "Test",
        isActive: false,
        isDefaultForInvoicing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.paymentMethod.update.mockResolvedValue(mockDeactivated);

      const deactivated = await repository.deactivate(tenantId, "pm-1");

      expect(deactivated.isActive).toBe(false);
      expect(mockPrisma.paymentMethod.update).toHaveBeenCalledWith({
        where: { id: "pm-1" },
        data: { isActive: false, isDefaultForInvoicing: false },
      });
    });
  });

  describe("checkLabelExists", () => {
    it("should return true if label exists", async () => {
      mockPrisma.paymentMethod.count.mockResolvedValue(1);

      const exists = await repository.checkLabelExists(tenantId, legalEntityId, "Unique Label");

      expect(exists).toBe(true);
    });

    it("should return false if label does not exist", async () => {
      mockPrisma.paymentMethod.count.mockResolvedValue(0);

      const exists = await repository.checkLabelExists(tenantId, legalEntityId, "Non Existent");

      expect(exists).toBe(false);
    });
  });

  describe("getBankAccountWithPaymentMethods", () => {
    it("should return payment methods for bank account", async () => {
      const mockMethods = [
        {
          id: "pm-1",
          tenantId,
          legalEntityId,
          type: "BANK_TRANSFER",
          label: "Method 1",
          bankAccountId: "ba-1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.paymentMethod.findMany.mockResolvedValue(mockMethods);

      const methods = await repository.getBankAccountWithPaymentMethods(tenantId, "ba-1");

      expect(methods).toHaveLength(1);
      expect(methods[0].bankAccountId).toBe("ba-1");
    });

    it("should return empty array if no methods for bank account", async () => {
      mockPrisma.paymentMethod.findMany.mockResolvedValue([]);

      const methods = await repository.getBankAccountWithPaymentMethods(
        tenantId,
        "non-existent-ba"
      );

      expect(methods).toHaveLength(0);
    });
  });
});
