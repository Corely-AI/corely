import { describe, it, expect } from "vitest";
import {
  normalizeCurrencyCode,
  isValidCurrencyCode,
  sortCurrencyCodes,
  getCurrencySymbol,
  DEFAULT_CURRENCY_CODES,
} from "./currency";

describe("Currency Utilities", () => {
  describe("normalizeCurrencyCode", () => {
    it("converts lowercase to uppercase", () => {
      expect(normalizeCurrencyCode("sgd")).toBe("SGD");
      expect(normalizeCurrencyCode("eur")).toBe("EUR");
    });

    it("trims whitespace", () => {
      expect(normalizeCurrencyCode(" usd ")).toBe("USD");
      expect(normalizeCurrencyCode("gbp")).toBe("GBP");
    });

    it("handles mixed case", () => {
      expect(normalizeCurrencyCode("UpD")).toBe("UPD");
    });
  });

  describe("isValidCurrencyCode", () => {
    it("accepts valid 3-letter codes", () => {
      expect(isValidCurrencyCode("USD")).toBe(true);
      expect(isValidCurrencyCode("EUR")).toBe(true);
      expect(isValidCurrencyCode("sgd")).toBe(true); // normalized internally
    });

    it("rejects invalid formats", () => {
      expect(isValidCurrencyCode("EURO")).toBe(false); // 4 letters
      expect(isValidCurrencyCode("EU")).toBe(false); // 2 letters
      expect(isValidCurrencyCode("€")).toBe(false); // symbol
      expect(isValidCurrencyCode("US1")).toBe(false); // contains number
      expect(isValidCurrencyCode("")).toBe(false); // empty
    });

    it("rejects codes with special characters", () => {
      expect(isValidCurrencyCode("US$")).toBe(false);
      expect(isValidCurrencyCode("EU-")).toBe(false);
    });
  });

  describe("sortCurrencyCodes", () => {
    it("sorts alphabetically", () => {
      const codes = ["USD", "EUR", "GBP", "AUD"];
      const sorted = sortCurrencyCodes(codes);
      expect(sorted).toEqual(["AUD", "EUR", "GBP", "USD"]);
    });

    it("removes duplicates", () => {
      const codes = ["USD", "EUR", "USD", "GBP"];
      const sorted = sortCurrencyCodes(codes);
      expect(sorted).toEqual(["EUR", "GBP", "USD"]);
    });

    it("normalizes to uppercase", () => {
      const codes = ["usd", "eur", "gbp"];
      const sorted = sortCurrencyCodes(codes);
      expect(sorted).toEqual(["EUR", "GBP", "USD"]);
    });

    it("handles mixed case duplicates", () => {
      const codes = ["USD", "usd", "Usd"];
      const sorted = sortCurrencyCodes(codes);
      expect(sorted).toEqual(["USD"]);
    });
  });

  describe("getCurrencySymbol", () => {
    it("derives symbol for common currencies", () => {
      // These should derive symbols (results may vary by environment)
      const usdSymbol = getCurrencySymbol("USD", "en-US");
      expect(usdSymbol).toBeTruthy();

      const eurSymbol = getCurrencySymbol("EUR", "en-US");
      expect(eurSymbol).toBeTruthy();
    });

    it("returns symbol or code for unknown currency", () => {
      const result = getCurrencySymbol("XXX", "en-US");
      // Intl may return generic symbol (¤) or the code itself
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles uppercase normalization", () => {
      const result = getCurrencySymbol("usd", "en-US");
      expect(result).toBeTruthy();
    });
  });

  describe("DEFAULT_CURRENCY_CODES", () => {
    it("contains expected currencies", () => {
      expect(DEFAULT_CURRENCY_CODES).toContain("USD");
      expect(DEFAULT_CURRENCY_CODES).toContain("EUR");
      expect(DEFAULT_CURRENCY_CODES).toContain("VND");
    });

    it("contains exactly 11 currencies", () => {
      expect(DEFAULT_CURRENCY_CODES.length).toBe(11);
    });

    it("all codes are uppercase 3-letter strings", () => {
      DEFAULT_CURRENCY_CODES.forEach((code) => {
        expect(code).toMatch(/^[A-Z]{3}$/);
      });
    });
  });
});
