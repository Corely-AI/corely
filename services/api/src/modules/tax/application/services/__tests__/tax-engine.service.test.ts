import { beforeEach, describe, expect, it } from "vitest";
import { TaxEngineService } from "../tax-engine.service";
import { DEPackV1 } from "../jurisdictions/de-pack.v1";
import { InMemoryTaxProfileRepo } from "../../../testkit/fakes/in-memory-tax-profile-repo";
import { InMemoryTaxCodeRepo } from "../../../testkit/fakes/in-memory-tax-code-repo";
import { InMemoryTaxRateRepo } from "../../../testkit/fakes/in-memory-tax-rate-repo";
import type { CalculateTaxInput } from "@corely/contracts";

describe("TaxEngineService", () => {
  let taxEngine: TaxEngineService;
  let profileRepo: InMemoryTaxProfileRepo;
  let taxCodeRepo: InMemoryTaxCodeRepo;
  let taxRateRepo: InMemoryTaxRateRepo;
  let dePack: DEPackV1;

  const tenantId = "tenant-1";

  beforeEach(async () => {
    profileRepo = new InMemoryTaxProfileRepo();
    taxCodeRepo = new InMemoryTaxCodeRepo();
    taxRateRepo = new InMemoryTaxRateRepo();

    dePack = new DEPackV1(taxCodeRepo, taxRateRepo);
    taxEngine = new TaxEngineService(profileRepo, dePack);

    // Setup default profile
    await profileRepo.upsert({
      tenantId,
      country: "DE",
      regime: "STANDARD_VAT",
      vatId: "DE123456789",
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      effectiveFrom: new Date("2025-01-01T00:00:00Z"),
      effectiveTo: null,
    });

    // Setup tax codes
    const standardCode = await taxCodeRepo.create({
      tenantId,
      code: "STANDARD_19",
      kind: "STANDARD",
      label: "Standard VAT 19%",
      isActive: true,
    });

    await taxRateRepo.create({
      tenantId,
      taxCodeId: standardCode.id,
      rateBps: 1900,
      effectiveFrom: new Date("2025-01-01T00:00:00Z"),
      effectiveTo: null,
    });
  });

  describe("calculate", () => {
    it("calculates tax using active profile", async () => {
      const input: CalculateTaxInput = {
        jurisdiction: "DE",
        documentDate: "2025-01-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "line-1",
            description: "Service",
            qty: 1,
            netAmountCents: 10000,
          },
        ],
      };

      const breakdown = await taxEngine.calculate(input, tenantId);

      expect(breakdown.subtotalAmountCents).toBe(10000);
      expect(breakdown.taxTotalAmountCents).toBe(1900); // 19%
      expect(breakdown.totalAmountCents).toBe(11900);
    });

    it("throws error if no active profile exists", async () => {
      profileRepo.reset();

      const input: CalculateTaxInput = {
        jurisdiction: "DE",
        documentDate: "2025-01-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      await expect(taxEngine.calculate(input, tenantId)).rejects.toThrow(/No active tax profile/i);
    });

    it("throws error if profile is not active for document date", async () => {
      // Profile effective from 2025-01-01, try to calculate for 2024-12-15
      const input: CalculateTaxInput = {
        jurisdiction: "DE",
        documentDate: "2024-12-15T00:00:00Z", // Before effective date
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      await expect(taxEngine.calculate(input, tenantId)).rejects.toThrow(/No active tax profile/i);
    });

    it("uses profile effective at document date", async () => {
      // Add a future profile with different regime
      await profileRepo.upsert({
        tenantId,
        country: "DE",
        regime: "SMALL_BUSINESS", // Different regime
        vatId: null,
        currency: "EUR",
        filingFrequency: "YEARLY",
        effectiveFrom: new Date("2026-01-01T00:00:00Z"),
        effectiveTo: null,
      });

      // Calculate for Jan 2025 (should use STANDARD_VAT)
      const input2025: CalculateTaxInput = {
        jurisdiction: "DE",
        documentDate: "2025-06-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const breakdown2025 = await taxEngine.calculate(input2025, tenantId);
      expect(breakdown2025.taxTotalAmountCents).toBe(1900); // STANDARD_VAT

      // Calculate for Jan 2026 (should use SMALL_BUSINESS)
      const input2026: CalculateTaxInput = {
        jurisdiction: "DE",
        documentDate: "2026-01-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const breakdown2026 = await taxEngine.calculate(input2026, tenantId);
      expect(breakdown2026.taxTotalAmountCents).toBe(0); // SMALL_BUSINESS
      expect(breakdown2026.flags.isSmallBusinessNoVatCharged).toBe(true);
    });

    it("defaults to profile country if jurisdiction not specified", async () => {
      const input = {
        documentDate: "2025-01-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      } as unknown as CalculateTaxInput;

      const breakdown = await taxEngine.calculate(input, tenantId);

      // Should use DE pack from profile
      expect(breakdown.taxTotalAmountCents).toBe(1900);
    });

    it("throws error for unsupported jurisdiction", async () => {
      const input: CalculateTaxInput = {
        jurisdiction: "FR", // Not supported
        documentDate: "2025-01-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      await expect(taxEngine.calculate(input, tenantId)).rejects.toThrow(
        /Jurisdiction pack not found/i
      );
    });
    it("calculates tax for multiple line items", async () => {
      const input: CalculateTaxInput = {
        jurisdiction: "DE",
        documentDate: "2025-01-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [
          { id: "line-1", qty: 1, netAmountCents: 1000 }, // 190 tax
          { id: "line-2", qty: 2, netAmountCents: 2000 }, // 380 tax
        ],
      };

      const breakdown = await taxEngine.calculate(input, tenantId);

      expect(breakdown.subtotalAmountCents).toBe(3000);
      expect(breakdown.taxTotalAmountCents).toBe(570); // 190 + 380 = 570
      expect(breakdown.totalAmountCents).toBe(3570);
      expect(breakdown.lines.length).toBe(2);
    });

    it("calculates using reduced tax rate when specified", async () => {
      // 1. Setup Reduced Tax Code
      const reducedCode = await taxCodeRepo.create({
        tenantId,
        code: "REDUCED_7",
        kind: "REDUCED",
        label: "Reduced VAT 7%",
        isActive: true,
      });
      await taxRateRepo.create({
        tenantId,
        taxCodeId: reducedCode.id,
        rateBps: 700,
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
      });

      // 2. Calculate
      const input: CalculateTaxInput = {
        jurisdiction: "DE",
        documentDate: "2025-01-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "line-1",
            qty: 1,
            netAmountCents: 10000,
            taxCodeId: reducedCode.id,
          },
        ],
      };

      const breakdown = await taxEngine.calculate(input, tenantId);

      expect(breakdown.taxTotalAmountCents).toBe(700); // 7% of 10000
      expect(breakdown.lines[0].kind).toBe("REDUCED");
      expect(breakdown.lines[0].rateBps).toBe(700);
      expect(breakdown.totalsByKind.REDUCED!.taxAmountCents).toBe(700);
    });

    it("handles mixed standard and reduced rates", async () => {
      // 1. Setup Reduced Tax Code
      const reducedCode = await taxCodeRepo.create({
        tenantId,
        code: "REDUCED_7",
        kind: "REDUCED",
        label: "Reduced VAT 7%",
        isActive: true,
      });
      await taxRateRepo.create({
        tenantId,
        taxCodeId: reducedCode.id,
        rateBps: 700,
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
      });

      // 2. Calculate mixed lines
      const input: CalculateTaxInput = {
        jurisdiction: "DE",
        documentDate: "2025-01-15T00:00:00Z",
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "std-line",
            qty: 1,
            netAmountCents: 1000,
            // No taxCodeId -> defaults to STANDARD (19%)
          },
          {
            id: "reduced-line",
            qty: 1,
            netAmountCents: 1000,
            taxCodeId: reducedCode.id, // Reduced (7%)
          },
        ],
      };

      const breakdown = await taxEngine.calculate(input, tenantId);

      expect(breakdown.subtotalAmountCents).toBe(2000);
      const expectedTax = 190 + 70; // 260
      expect(breakdown.taxTotalAmountCents).toBe(expectedTax);

      expect(breakdown.totalsByKind.STANDARD).toBeDefined();
      expect(breakdown.totalsByKind.STANDARD!.taxAmountCents).toBe(190);

      expect(breakdown.totalsByKind.REDUCED).toBeDefined();
      expect(breakdown.totalsByKind.REDUCED!.taxAmountCents).toBe(70);
    });
  });

  describe("getSupportedJurisdictions", () => {
    it("returns list of supported jurisdictions", () => {
      const jurisdictions = taxEngine.getSupportedJurisdictions();

      expect(jurisdictions).toContain("DE");
      expect(jurisdictions.length).toBeGreaterThan(0);
    });
  });
});
