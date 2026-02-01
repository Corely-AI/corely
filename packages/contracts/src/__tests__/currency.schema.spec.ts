import { describe, it, expect } from "vitest";
import { CurrencyCodeSchema } from "../money/currency.schema";

describe("CurrencyCodeSchema", () => {
  it("normalizes lowercase to uppercase", () => {
    const result = CurrencyCodeSchema.parse("eur");
    expect(result).toBe("EUR");
  });

  it("normalizes mixed case to uppercase", () => {
    const result = CurrencyCodeSchema.parse("uSd");
    expect(result).toBe("USD");
  });

  it("trims whitespace", () => {
    const result = CurrencyCodeSchema.parse(" gbp ");
    expect(result).toBe("GBP");
  });

  it("rejects invalid length", () => {
    expect(() => CurrencyCodeSchema.parse("EURO")).toThrow();
    expect(() => CurrencyCodeSchema.parse("EU")).toThrow();
  });

  it("rejects invalid characters", () => {
    expect(() => CurrencyCodeSchema.parse("EU1")).toThrow();
    expect(() => CurrencyCodeSchema.parse("€")).toThrow();
  });
});
