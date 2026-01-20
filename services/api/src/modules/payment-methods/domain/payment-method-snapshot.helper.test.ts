import { describe, it, expect, beforeEach } from "vitest";
import {
  snapshotPaymentMethod,
  resolveReferenceTemplate,
  enrichSnapshotWithBankAccount,
} from "./payment-method-snapshot.helper";
import type { PaymentMethod } from "@corely/contracts";

describe("payment-method-snapshot.helper", () => {
  describe("resolveReferenceTemplate", () => {
    it("should replace {invoiceNumber} placeholder with actual invoice number", () => {
      const template = "INV-{invoiceNumber}";
      const result = resolveReferenceTemplate(template, "12345");
      expect(result).toBe("INV-12345");
    });

    it("should return DRAFT when invoice number is null", () => {
      const template = "INV-{invoiceNumber}";
      const result = resolveReferenceTemplate(template, null);
      expect(result).toBe("INV-DRAFT");
    });

    it("should return DRAFT when invoice number is undefined", () => {
      const template = "INV-{invoiceNumber}";
      const result = resolveReferenceTemplate(template, undefined);
      expect(result).toBe("INV-DRAFT");
    });

    it("should return DRAFT when invoice number is empty string", () => {
      const template = "INV-{invoiceNumber}";
      const result = resolveReferenceTemplate(template, "");
      expect(result).toBe("INV-DRAFT");
    });

    it("should handle templates without placeholder", () => {
      const template = "FIXED-REFERENCE";
      const result = resolveReferenceTemplate(template, "12345");
      expect(result).toBe("FIXED-REFERENCE");
    });

    it("should handle multiple placeholders", () => {
      const template = "{invoiceNumber}-{invoiceNumber}";
      const result = resolveReferenceTemplate(template, "ABC");
      expect(result).toBe("ABC-ABC");
    });

    it("should handle alphanumeric invoice numbers", () => {
      const template = "Order-{invoiceNumber}";
      const result = resolveReferenceTemplate(template, "2025-Q1-001");
      expect(result).toBe("Order-2025-Q1-001");
    });

    it("should handle special characters in invoice number", () => {
      const template = "REF/{invoiceNumber}";
      const result = resolveReferenceTemplate(template, "2025/Q1/001");
      expect(result).toBe("REF/2025/Q1/001");
    });
  });

  describe("snapshotPaymentMethod", () => {
    const mockPaymentMethod: PaymentMethod = {
      id: "pm-1",
      workspaceId: "ws-1",
      legalEntityId: "le-1",
      type: "BANK_TRANSFER",
      label: "Main Bank Account",
      isActive: true,
      isDefaultForInvoicing: true,
      bankAccountId: "ba-1",
      instructions: null,
      payUrl: null,
      referenceTemplate: "INV-{invoiceNumber}",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };

    it("should create a snapshot from BANK_TRANSFER payment method", () => {
      const snapshot = snapshotPaymentMethod(mockPaymentMethod, "001");

      expect(snapshot).toMatchObject({
        type: "BANK_TRANSFER",
        label: "Main Bank Account",
        referenceText: "INV-001",
        snapshotVersion: 1,
      });
      expect(snapshot.snapshotedAt).toBeInstanceOf(Date);
    });

    it("should handle null invoice number", () => {
      const snapshot = snapshotPaymentMethod(mockPaymentMethod, null);

      expect(snapshot.referenceText).toBe("INV-DRAFT");
    });

    it("should handle undefined invoice number", () => {
      const snapshot = snapshotPaymentMethod(mockPaymentMethod, undefined);

      expect(snapshot.referenceText).toBe("INV-DRAFT");
    });

    it("should snapshot PAYPAL type with instructions", () => {
      const paypalMethod: PaymentMethod = {
        ...mockPaymentMethod,
        type: "PAYPAL",
        instructions: "Send payment to paypal@example.com",
        payUrl: "https://paypal.me/example",
      };

      const snapshot = snapshotPaymentMethod(paypalMethod, "002");

      expect(snapshot.type).toBe("PAYPAL");
      expect(snapshot.instructions).toBe("Send payment to paypal@example.com");
      expect(snapshot.payUrl).toBe("https://paypal.me/example");
    });

    it("should snapshot CASH type", () => {
      const cashMethod: PaymentMethod = {
        ...mockPaymentMethod,
        type: "CASH",
        label: "Cash Payment",
        instructions: "Payment upon delivery",
      };

      const snapshot = snapshotPaymentMethod(cashMethod, "003");

      expect(snapshot.type).toBe("CASH");
      expect(snapshot.label).toBe("Cash Payment");
      expect(snapshot.instructions).toBe("Payment upon delivery");
    });

    it("should snapshot CARD type", () => {
      const cardMethod: PaymentMethod = {
        ...mockPaymentMethod,
        type: "CARD",
        label: "Credit Card",
        instructions: "Enter card details at checkout",
      };

      const snapshot = snapshotPaymentMethod(cardMethod, "004");

      expect(snapshot.type).toBe("CARD");
      expect(snapshot.label).toBe("Credit Card");
    });

    it("should snapshot OTHER type", () => {
      const otherMethod: PaymentMethod = {
        ...mockPaymentMethod,
        type: "OTHER",
        label: "Custom Payment",
        instructions: "Follow custom instructions",
      };

      const snapshot = snapshotPaymentMethod(otherMethod, "005");

      expect(snapshot.type).toBe("OTHER");
      expect(snapshot.label).toBe("Custom Payment");
    });

    it("should set current date as snapshotedAt", () => {
      const beforeSnapshot = new Date();
      const snapshot = snapshotPaymentMethod(mockPaymentMethod, "001");
      const afterSnapshot = new Date();

      expect(snapshot.snapshotedAt.getTime()).toBeGreaterThanOrEqual(beforeSnapshot.getTime());
      expect(snapshot.snapshotedAt.getTime()).toBeLessThanOrEqual(afterSnapshot.getTime());
    });

    it("should create unique snapshots with different timestamps", () => {
      const snapshot1 = snapshotPaymentMethod(mockPaymentMethod, "001");
      const snapshot2 = snapshotPaymentMethod(mockPaymentMethod, "001");

      // Same content but potentially different timestamps
      expect(snapshot1.referenceText).toBe(snapshot2.referenceText);
      expect(snapshot1.label).toBe(snapshot2.label);
    });
  });

  describe("enrichSnapshotWithBankAccount", () => {
    const mockSnapshot = {
      type: "BANK_TRANSFER" as const,
      label: "Main Bank",
      accountHolderName: undefined,
      iban: undefined,
      bic: undefined,
      bankName: undefined,
      currency: undefined,
      instructions: undefined,
      payUrl: undefined,
      referenceText: "INV-001",
      snapshotVersion: 1,
      snapshotedAt: new Date("2025-01-20"),
    };

    it("should enrich snapshot with complete bank account details", () => {
      const bankAccount = {
        accountHolderName: "John Doe GmbH",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
      };

      const enriched = enrichSnapshotWithBankAccount(mockSnapshot, bankAccount);

      expect(enriched).toMatchObject({
        accountHolderName: "John Doe GmbH",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
      });
    });

    it("should preserve existing snapshot properties", () => {
      const bankAccount = {
        accountHolderName: "Jane Smith",
        iban: "GB82WEST12345698765432",
        bic: "WESTGB2L",
        bankName: "Barclays",
        currency: "GBP",
      };

      const enriched = enrichSnapshotWithBankAccount(mockSnapshot, bankAccount);

      expect(enriched.referenceText).toBe("INV-001");
      expect(enriched.snapshotVersion).toBe(1);
      expect(enriched.type).toBe("BANK_TRANSFER");
      expect(enriched.label).toBe("Main Bank");
      expect(enriched.snapshotedAt).toEqual(new Date("2025-01-20"));
    });

    it("should handle bank account with nullable bic", () => {
      const bankAccount = {
        accountHolderName: "Account Owner",
        iban: "FR1420041010050500013M02606",
        bic: null,
        bankName: "BNP Paribas",
        currency: "EUR",
      };

      const enriched = enrichSnapshotWithBankAccount(mockSnapshot, bankAccount);

      expect(enriched.accountHolderName).toBe("Account Owner");
      expect(enriched.iban).toBe("FR1420041010050500013M02606");
      expect(enriched.bic).toBeUndefined();
      expect(enriched.bankName).toBe("BNP Paribas");
    });

    it("should handle bank account with nullable bankName", () => {
      const bankAccount = {
        accountHolderName: "Test User",
        iban: "IT60X0542811101000000123456",
        bic: "BCITITMM",
        bankName: null,
        currency: "EUR",
      };

      const enriched = enrichSnapshotWithBankAccount(mockSnapshot, bankAccount);

      expect(enriched.bankName).toBeUndefined();
      expect(enriched.bic).toBe("BCITITMM");
    });

    it("should not mutate original snapshot", () => {
      const bankAccount = {
        accountHolderName: "New Owner",
        iban: "ES9121000418450200051332",
        bic: "BBVAESMMXXX",
        bankName: "BBVA",
        currency: "EUR",
      };

      enrichSnapshotWithBankAccount(mockSnapshot, bankAccount);

      expect(mockSnapshot.accountHolderName).toBeUndefined();
      expect(mockSnapshot.iban).toBeUndefined();
    });
  });

  describe("End-to-end snapshot flow", () => {
    it("should create and enrich a complete payment snapshot", () => {
      const paymentMethod: PaymentMethod = {
        id: "pm-1",
        workspaceId: "ws-1",
        legalEntityId: "le-1",
        type: "BANK_TRANSFER",
        label: "Company Main Account",
        isActive: true,
        isDefaultForInvoicing: true,
        bankAccountId: "ba-1",
        instructions: null,
        payUrl: null,
        referenceTemplate: "Invoice-{invoiceNumber}",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      // Step 1: Create snapshot
      let snapshot = snapshotPaymentMethod(paymentMethod, "2025-001");

      expect(snapshot.type).toBe("BANK_TRANSFER");
      expect(snapshot.referenceText).toBe("Invoice-2025-001");

      // Step 2: Enrich with bank account
      const bankAccount = {
        accountHolderName: "Acme Corp GmbH",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        bankName: "Commerzbank",
        currency: "EUR",
      };

      snapshot = enrichSnapshotWithBankAccount(snapshot, bankAccount);

      // Step 3: Verify complete snapshot
      expect(snapshot.type).toBe("BANK_TRANSFER");
      expect(snapshot.label).toBe("Company Main Account");
      expect(snapshot.accountHolderName).toBe("Acme Corp GmbH");
      expect(snapshot.iban).toBe("DE89370400440532013000");
      expect(snapshot.bic).toBe("COBADEFFXXX");
      expect(snapshot.bankName).toBe("Commerzbank");
      expect(snapshot.currency).toBe("EUR");
      expect(snapshot.referenceText).toBe("Invoice-2025-001");
      expect(snapshot.snapshotVersion).toBe(1);
    });
  });
});
