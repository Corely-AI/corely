import type { TaxRegime, VatFilingFrequency, VatAccountingMethod } from "@corely/contracts";

export interface TaxProfileEntity {
  id: string;
  tenantId: string;
  country: string;
  regime: TaxRegime;
  vatEnabled: boolean;
  vatId: string | null;
  currency: string;
  filingFrequency: VatFilingFrequency;
  vatAccountingMethod?: VatAccountingMethod;
  taxYearStartMonth?: number | null;
  localTaxOfficeName?: string | null;
  vatExemptionParagraph?: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TaxProfile {
  /**
   * Check if profile can be used for calculation at a given date
   */
  static canCalculate(profile: TaxProfileEntity | null, at: Date): boolean {
    if (!profile) {
      return false;
    }

    const isAfterStart = at >= profile.effectiveFrom;
    const isBeforeEnd = !profile.effectiveTo || at <= profile.effectiveTo;

    return isAfterStart && isBeforeEnd;
  }

  /**
   * Check if profile is active for small business regime
   */
  static isSmallBusiness(profile: TaxProfileEntity): boolean {
    return profile.regime === "SMALL_BUSINESS";
  }

  /**
   * Check if profile requires VAT calculation
   */
  static requiresVatCalculation(profile: TaxProfileEntity): boolean {
    return profile.regime === "STANDARD_VAT";
  }
}
