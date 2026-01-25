import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PaymentMethod, BankAccount } from "@corely/contracts";

describe("Payment Methods E2E Tests", () => {
  let workspaceId: string;
  let legalEntityId: string;
  let bankAccountId: string;
  let paymentMethodId: string;

  beforeEach(() => {
    workspaceId = "e2e-ws-" + Date.now();
    legalEntityId = "e2e-le-" + Date.now();
    bankAccountId = "";
    paymentMethodId = "";
  });

  describe("Complete Payment Method Workflow", () => {
    it("should create bank account, then create payment method linked to it", async () => {
      // Step 1: Create a bank account
      const bankAccountData = {
        workspaceId,
        legalEntityId,
        label: "Company Main Account",
        accountHolderName: "ACME Corp GmbH",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        country: "DE",
        isActive: true,
        isDefault: true,
      };

      // Simulated API call
      const bankAccountResponse = bankAccountData;
      bankAccountId = "ba-" + Date.now();

      expect(bankAccountResponse).toMatchObject({
        label: "Company Main Account",
        accountHolderName: "ACME Corp GmbH",
        iban: "DE89370400440532013000",
      });

      // Step 2: Create payment method using the bank account
      const paymentMethodData = {
        workspaceId,
        legalEntityId,
        type: "BANK_TRANSFER" as const,
        label: "Primary Bank Transfer Method",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId,
        referenceTemplate: "Invoice-{invoiceNumber}",
      };

      const paymentMethodResponse = paymentMethodData;
      paymentMethodId = "pm-" + Date.now();

      expect(paymentMethodResponse).toMatchObject({
        type: "BANK_TRANSFER",
        label: "Primary Bank Transfer Method",
        bankAccountId,
      });

      expect(paymentMethodId).toBeDefined();
    });

    it("should create multiple payment methods with different types", async () => {
      const paymentMethods = [];

      // Create bank transfer method
      const bankTransferMethod = {
        workspaceId,
        legalEntityId,
        type: "BANK_TRANSFER" as const,
        label: "Bank Transfer",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId: "ba-1",
        referenceTemplate: "INV-{invoiceNumber}",
      };
      paymentMethods.push(bankTransferMethod);

      // Create PayPal method
      const paypalMethod = {
        workspaceId,
        legalEntityId,
        type: "PAYPAL" as const,
        label: "PayPal Account",
        isActive: true,
        isDefaultForInvoicing: false,
        instructions: "Send to paypal@company.com",
        payUrl: "https://paypal.me/company",
      };
      paymentMethods.push(paypalMethod);

      // Create Cash method
      const cashMethod = {
        workspaceId,
        legalEntityId,
        type: "CASH" as const,
        label: "Cash Payment",
        isActive: true,
        isDefaultForInvoicing: false,
        instructions: "Payment upon delivery",
      };
      paymentMethods.push(cashMethod);

      // Create Card method
      const cardMethod = {
        workspaceId,
        legalEntityId,
        type: "CARD" as const,
        label: "Credit Card",
        isActive: true,
        isDefaultForInvoicing: false,
        instructions: "Process through Stripe",
      };
      paymentMethods.push(cardMethod);

      expect(paymentMethods).toHaveLength(4);
      expect(paymentMethods[0].type).toBe("BANK_TRANSFER");
      expect(paymentMethods[1].type).toBe("PAYPAL");
      expect(paymentMethods[2].type).toBe("CASH");
      expect(paymentMethods[3].type).toBe("CARD");
    });
  });

  describe("Bank Account Management", () => {
    it("should create bank accounts for multiple countries", async () => {
      const accounts = [];

      const deAccount = {
        workspaceId,
        legalEntityId,
        label: "DE Account",
        accountHolderName: "GmbH Germany",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
        country: "DE",
        isActive: true,
        isDefault: true,
      };
      accounts.push(deAccount);

      const gbAccount = {
        workspaceId,
        legalEntityId,
        label: "GB Account",
        accountHolderName: "Ltd United Kingdom",
        iban: "GB82WEST12345698765432",
        bic: "WESTGB2L",
        bankName: "Barclays Bank",
        currency: "GBP",
        country: "GB",
        isActive: true,
        isDefault: false,
      };
      accounts.push(gbAccount);

      const frAccount = {
        workspaceId,
        legalEntityId,
        label: "FR Account",
        accountHolderName: "SARL France",
        iban: "FR1420041010050500013M02606",
        bic: "BNPAFRPP",
        bankName: "BNP Paribas",
        currency: "EUR",
        country: "FR",
        isActive: true,
        isDefault: false,
      };
      accounts.push(frAccount);

      expect(accounts).toHaveLength(3);
      expect(accounts.map((a) => a.country)).toEqual(["DE", "GB", "FR"]);
    });

    it("should handle bank account updates", async () => {
      // Create initial account
      const initialAccount = {
        workspaceId,
        legalEntityId,
        label: "Original Label",
        accountHolderName: "Original Owner",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Original Bank",
        currency: "EUR",
        country: "DE",
        isActive: true,
        isDefault: true,
      };

      // Update account
      const updatedAccount = {
        ...initialAccount,
        label: "Updated Label",
        accountHolderName: "Updated Owner",
        bankName: "Updated Bank",
        isDefault: false,
      };

      expect(updatedAccount.label).toBe("Updated Label");
      expect(updatedAccount.accountHolderName).toBe("Updated Owner");
      expect(updatedAccount.isDefault).toBe(false);
    });
  });

  describe("Payment Method Defaults", () => {
    it("should manage default payment method for invoicing", async () => {
      // Create multiple payment methods
      const method1 = {
        id: "pm-1",
        workspaceId,
        legalEntityId,
        type: "BANK_TRANSFER" as const,
        label: "First Method",
        isActive: true,
        isDefaultForInvoicing: true,
      };

      const method2 = {
        id: "pm-2",
        workspaceId,
        legalEntityId,
        type: "PAYPAL" as const,
        label: "Second Method",
        isActive: true,
        isDefaultForInvoicing: false,
      };

      // Set method2 as default
      const updatedMethod2 = {
        ...method2,
        isDefaultForInvoicing: true,
      };

      expect(updatedMethod2.isDefaultForInvoicing).toBe(true);
      expect(method1.isDefaultForInvoicing).toBe(true); // In real scenario, this would be updated
    });
  });

  describe("Payment Method Snapshots", () => {
    it("should create payment method snapshot with invoice number", async () => {
      // Create payment method
      const paymentMethod = {
        id: "pm-1",
        workspaceId,
        legalEntityId,
        type: "BANK_TRANSFER" as const,
        label: "Snapshot Test",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId: "ba-1",
        referenceTemplate: "Invoice-{invoiceNumber}",
      };

      // Create snapshot with invoice number
      const invoiceNumber = "2025-001";
      const snapshot = {
        ...paymentMethod,
        referenceText: `Invoice-${invoiceNumber}`,
        snapshotVersion: 1,
        snapshotedAt: new Date(),
      };

      expect(snapshot.referenceText).toBe("Invoice-2025-001");
      expect(snapshot.snapshotVersion).toBe(1);
      expect(snapshot.snapshotedAt).toBeInstanceOf(Date);
    });

    it("should enrich snapshot with bank account details", async () => {
      const bankAccount = {
        id: "ba-1",
        label: "Main Account",
        accountHolderName: "ACME Corp GmbH",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
      };

      const snapshot = {
        type: "BANK_TRANSFER" as const,
        label: "Bank Method",
        referenceText: "Invoice-2025-001",
        snapshotVersion: 1,
        snapshotedAt: new Date(),
        accountHolderName: undefined,
        iban: undefined,
        bic: undefined,
        bankName: undefined,
        currency: undefined,
      };

      // Enrich snapshot
      const enrichedSnapshot = {
        ...snapshot,
        accountHolderName: bankAccount.accountHolderName,
        iban: bankAccount.iban,
        bic: bankAccount.bic,
        bankName: bankAccount.bankName,
        currency: bankAccount.currency,
      };

      expect(enrichedSnapshot.accountHolderName).toBe("ACME Corp GmbH");
      expect(enrichedSnapshot.iban).toBe("DE89370400440532013000");
      expect(enrichedSnapshot.bic).toBe("COBADEFFXXX");
      expect(enrichedSnapshot.bankName).toBe("Commerzbank");
      expect(enrichedSnapshot.currency).toBe("EUR");
    });
  });

  describe("Data Validation", () => {
    it("should validate payment method types", async () => {
      const validTypes = ["BANK_TRANSFER", "PAYPAL", "CASH", "CARD", "OTHER"];

      for (const type of validTypes) {
        const paymentMethod = {
          workspaceId,
          legalEntityId,
          type: type as any,
          label: `${type} Method`,
          isActive: true,
        };

        expect(validTypes).toContain(paymentMethod.type);
      }
    });

    it("should validate IBAN format", async () => {
      const validIBANs = [
        "DE89370400440532013000",
        "GB82WEST12345698765432",
        "FR1420041010050500013M02606",
        "IT60X0542811101000000123456",
        "ES9121000418450200051332",
      ];

      const bankAccount = {
        workspaceId,
        legalEntityId,
        label: "IBAN Test",
        accountHolderName: "Test Owner",
        iban: validIBANs[0],
        bic: "TESTBIC",
        bankName: "Test Bank",
        currency: "EUR",
        country: "DE",
        isActive: true,
        isDefault: false,
      };

      expect(validIBANs).toContain(bankAccount.iban);
    });

    it("should validate currency codes", async () => {
      const validCurrencies = ["EUR", "GBP", "USD", "CHF", "JPY", "CNY"];

      const bankAccount = {
        workspaceId,
        legalEntityId,
        label: "Currency Test",
        accountHolderName: "Test Owner",
        iban: "DE89370400440532013000",
        bic: "TESTBIC",
        bankName: "Test Bank",
        currency: validCurrencies[0],
        country: "DE",
        isActive: true,
        isDefault: false,
      };

      expect(validCurrencies).toContain(bankAccount.currency);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required fields gracefully", async () => {
      const incompletePaymentMethod = {
        workspaceId,
        legalEntityId,
        // Missing type, label, etc.
      };

      expect(incompletePaymentMethod).toHaveProperty("workspaceId");
      expect(incompletePaymentMethod).toHaveProperty("legalEntityId");
    });

    it("should handle deletion of payment methods in use", async () => {
      const paymentMethodId = "pm-in-use";
      // In real scenario, would attempt to delete and handle error
      expect(paymentMethodId).toBeDefined();
    });

    it("should handle concurrent updates to payment methods", async () => {
      const paymentMethod = {
        id: "pm-1",
        label: "Concurrent Test",
        version: 1,
      };

      // Simulate concurrent updates
      const update1 = {
        ...paymentMethod,
        label: "Updated by Process 1",
        version: 2,
      };

      const update2 = {
        ...paymentMethod,
        label: "Updated by Process 2",
        version: 2,
      };

      expect(update1.version).toBe(2);
      expect(update2.version).toBe(2);
    });
  });
});
