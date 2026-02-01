import { describe, it, expect } from "vitest";
import { formatMoney, getCurrencySymbol } from "../money";

describe("Money Primitives", () => {
  describe("getCurrencySymbol", () => {
    it("derives symbol for EUR", () => {
      // Note: Results can vary by locale environment, but EUR is usually €
      const symbol = getCurrencySymbol("EUR", "en-US");
      expect(symbol).toBe("€");
    });

    it("derives symbol for USD", () => {
      const symbol = getCurrencySymbol("USD", "en-US");
      expect(symbol).toBe("$");
    });
  });

  describe("formatMoney", () => {
    it("formats EUR in de-DE", () => {
      const result = formatMoney(1234.56, "EUR", "de-DE");
      // Use contains because of non-breaking spaces
      expect(result).toContain("1.234,56");
      expect(result).toContain("€");
    });

    it("formats USD in en-US", () => {
      const result = formatMoney(1234.56, "USD", "en-US");
      expect(result).toContain("1,234.56");
      expect(result).toContain("$");
    });
  });
});
