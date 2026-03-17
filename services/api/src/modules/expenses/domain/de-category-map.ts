/**
 * Germany v1 Default Category → Deductibility Rule Map
 *
 * This file is the single source of truth for which rule applies per category
 * and which extra fields are required.
 */

import type { DeductibilityRule, ExpenseCategoryRequiredFields } from "@corely/contracts";

export interface DeCategoryMeta {
  labelI18nKey: string;
  defaultDeductibilityRule: DeductibilityRule;
  requiresFields: ExpenseCategoryRequiredFields;
  /** Optional UI note key (e.g. VAT warning for meals) */
  notesI18nKey?: string;
}

export const DE_CATEGORY_MAP: Record<string, DeCategoryMeta> = {
  // -------------------------------------------------------------------------
  // Meals
  // -------------------------------------------------------------------------
  MEALS_CLIENT_ENTERTAINMENT: {
    labelI18nKey: "expenses.category.meals_client_entertainment",
    defaultDeductibilityRule: {
      kind: "PERCENT",
      percent: 70,
      notesI18nKey: "expenses.deductibility.note.meals_vat_diff",
    },
    requiresFields: { participants: true, occasion: true },
    notesI18nKey: "expenses.deductibility.note.meals_vat_diff",
  },
  MEALS_TEAM_EMPLOYEE: {
    labelI18nKey: "expenses.category.meals_team_employee",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },

  // -------------------------------------------------------------------------
  // Gifts
  // -------------------------------------------------------------------------
  GIFTS_BUSINESS_PARTNER: {
    labelI18nKey: "expenses.category.gifts_business_partner",
    defaultDeductibilityRule: {
      kind: "GIFT_THRESHOLD_PER_RECIPIENT_YEAR",
      thresholdCents: 5000,
      currency: "EUR",
      withinThresholdPercent: 100,
      overThresholdPercent: 0,
      requiresRecipient: true,
    },
    requiresFields: { recipient: true },
  },
  GIFTS_PROMO_STREUARTIKEL: {
    labelI18nKey: "expenses.category.gifts_promo_streuartikel",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },

  // -------------------------------------------------------------------------
  // Non-deductible
  // -------------------------------------------------------------------------
  FINES_PENALTIES: {
    labelI18nKey: "expenses.category.fines_penalties",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 0 },
    requiresFields: {},
  },

  // -------------------------------------------------------------------------
  // Clothing
  // -------------------------------------------------------------------------
  CLOTHING_PROTECTIVE_UNIFORM: {
    labelI18nKey: "expenses.category.clothing_protective_uniform",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },
  CLOTHING_CIVILIAN: {
    labelI18nKey: "expenses.category.clothing_civilian",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 0 },
    requiresFields: {},
  },

  // -------------------------------------------------------------------------
  // Per-diem
  // -------------------------------------------------------------------------
  TRAVEL_MEALS_PER_DIEM: {
    labelI18nKey: "expenses.category.travel_meals_per_diem",
    defaultDeductibilityRule: {
      kind: "PER_DIEM",
      scheme: "DE_TRAVEL_MEALS",
      computedBy: "app",
    },
    requiresFields: { travelMeta: true },
  },
  HOME_OFFICE_FLAT_RATE: {
    labelI18nKey: "expenses.category.home_office_flat_rate",
    defaultDeductibilityRule: {
      kind: "PER_DIEM",
      scheme: "DE_HOME_OFFICE",
      computedBy: "app",
    },
    requiresFields: { homeOfficeDays: true },
  },

  // -------------------------------------------------------------------------
  // Mixed-use
  // -------------------------------------------------------------------------
  PHONE_INTERNET: {
    labelI18nKey: "expenses.category.phone_internet",
    defaultDeductibilityRule: { kind: "MIXED_USE", requiresBusinessUsePercent: true },
    requiresFields: { businessUsePercent: true },
  },
  CAR: {
    labelI18nKey: "expenses.category.car",
    defaultDeductibilityRule: { kind: "MIXED_USE", requiresBusinessUsePercent: true },
    requiresFields: { businessUsePercent: true },
  },
  HOME_INTERNET: {
    labelI18nKey: "expenses.category.home_internet",
    defaultDeductibilityRule: { kind: "MIXED_USE", requiresBusinessUsePercent: true },
    requiresFields: { businessUsePercent: true },
  },

  // -------------------------------------------------------------------------
  // Legacy / generic category keys (from the existing FE form)
  // mapped to reasonable defaults
  // -------------------------------------------------------------------------
  office_supplies: {
    labelI18nKey: "expenses.category.office_supplies",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },
  software: {
    labelI18nKey: "expenses.category.software",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },
  travel: {
    labelI18nKey: "expenses.category.travel",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },
  meals: {
    labelI18nKey: "expenses.category.meals",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 70 },
    requiresFields: { participants: true, occasion: true },
  },
  home_office: {
    labelI18nKey: "expenses.category.home_office",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },
  education: {
    labelI18nKey: "expenses.category.education",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },
  hardware: {
    labelI18nKey: "expenses.category.hardware",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },
  phone_internet: {
    labelI18nKey: "expenses.category.phone_internet",
    defaultDeductibilityRule: { kind: "MIXED_USE", requiresBusinessUsePercent: true },
    requiresFields: { businessUsePercent: true },
  },
  other: {
    labelI18nKey: "expenses.category.other",
    defaultDeductibilityRule: { kind: "PERCENT", percent: 100 },
    requiresFields: {},
  },
};
