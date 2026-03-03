/**
 * DE Deductibility Computation Service (pure domain, no I/O)
 *
 * Computes income-tax deductibility for German tax law (EStG).
 * All functions are pure – no side-effects, no DB access.
 */

import type { ExpenseDeductibilityResult } from "@corely/contracts";
import type { ExpenseDeductibilityMeta } from "@corely/contracts";
import {
  DE_GIFT_THRESHOLD_CENTS,
  DE_HOME_OFFICE_ANNUAL_CAP_CENTS,
  DE_HOME_OFFICE_PER_DAY_CENTS,
  DE_TRAVEL_MEAL_FULL_DAY_CENTS,
  DE_TRAVEL_MEAL_MIN_HOURS,
  DE_TRAVEL_MEAL_PARTIAL_DAY_CENTS,
} from "./de-deductibility.constants";
import { DE_CATEGORY_MAP, type DeCategoryMeta } from "./de-category-map";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ComputeDeductibilityInput {
  category: string | null;
  totalAmountCents: number;
  /** Extra fields collected in the form (participants, recipient, etc.) */
  meta: ExpenseDeductibilityMeta | null;
  /**
   * For GiftThresholdRule: cumulative gifts already sent to the same recipient
   * in the current calendar year BEFORE this expense (queried from DB).
   */
  priorGiftCentsThisYear?: number;
}

/**
 * Returns the computed deductibility for a single expense line / header-level expense.
 *
 * Returns `null` fields when required information is missing (category unknown or
 * required metadata absent) – the caller should treat this as "needs info".
 */
export function computeDeDeductibility(
  input: ComputeDeductibilityInput
): ExpenseDeductibilityResult {
  const { category, totalAmountCents, meta, priorGiftCentsThisYear = 0 } = input;

  if (!category) {
    return notComputed("PERCENT");
  }

  const catMeta: DeCategoryMeta | undefined = DE_CATEGORY_MAP[category];
  if (!catMeta) {
    // Unknown category — treat as 100% deductible (conservative default)
    return percentResult(100, totalAmountCents, "PERCENT");
  }

  const rule = catMeta.defaultDeductibilityRule;

  switch (rule.kind) {
    case "PERCENT": {
      const pct = rule.percent; // 0 | 70 | 100
      return percentResult(pct, totalAmountCents, "PERCENT");
    }

    case "GIFT_THRESHOLD_PER_RECIPIENT_YEAR": {
      // Require recipient
      if (!meta?.recipient) {
        return notComputed("GIFT_THRESHOLD_PER_RECIPIENT_YEAR");
      }
      const threshold = rule.thresholdCents ?? DE_GIFT_THRESHOLD_CENTS;
      const totalAfterThis = priorGiftCentsThisYear + totalAmountCents;
      const isOverThreshold = totalAfterThis > threshold;
      const pct = isOverThreshold ? 0 : 100;
      return percentResult(pct, totalAmountCents, "GIFT_THRESHOLD_PER_RECIPIENT_YEAR");
    }

    case "PER_DIEM": {
      if (rule.scheme === "DE_TRAVEL_MEALS") {
        return computeTravelMealPerDiem(totalAmountCents, meta);
      }
      if (rule.scheme === "DE_HOME_OFFICE") {
        return computeHomeOfficePerDiem(totalAmountCents, meta);
      }
      return notComputed("PER_DIEM");
    }

    case "MIXED_USE": {
      if (meta?.businessUsePercent == null) {
        return notComputed("MIXED_USE");
      }
      return percentResult(Math.round(meta.businessUsePercent), totalAmountCents, "MIXED_USE");
    }
  }
}

// ---------------------------------------------------------------------------
// Per-diem helpers
// ---------------------------------------------------------------------------

function computeTravelMealPerDiem(
  totalAmountCents: number,
  meta: ExpenseDeductibilityMeta | null
): ExpenseDeductibilityResult {
  if (!meta?.travelMeta) {
    return notComputed("PER_DIEM");
  }
  const { absenceHours } = meta.travelMeta;
  if (absenceHours == null) {
    return notComputed("PER_DIEM");
  }

  const perDiemCents =
    absenceHours >= 24
      ? DE_TRAVEL_MEAL_FULL_DAY_CENTS
      : absenceHours >= DE_TRAVEL_MEAL_MIN_HOURS
        ? DE_TRAVEL_MEAL_PARTIAL_DAY_CENTS
        : 0;

  if (perDiemCents === 0) {
    return {
      deductiblePercent: 0,
      deductibleAmountCents: 0,
      nonDeductibleAmountCents: totalAmountCents,
      ruleKind: "PER_DIEM",
      meta: { scheme: "DE_TRAVEL_MEALS", perDiemCents: 0 },
    };
  }

  // Deductible is the minimum of the per-diem rate and the actual expense
  const deductibleAmountCents = Math.min(perDiemCents, totalAmountCents);
  const nonDeductibleAmountCents = totalAmountCents - deductibleAmountCents;
  const deductiblePercent =
    totalAmountCents > 0 ? Math.round((deductibleAmountCents / totalAmountCents) * 100) : 0;

  return {
    deductiblePercent,
    deductibleAmountCents,
    nonDeductibleAmountCents,
    ruleKind: "PER_DIEM",
    meta: { scheme: "DE_TRAVEL_MEALS", perDiemCents, absenceHours },
  };
}

function computeHomeOfficePerDiem(
  totalAmountCents: number,
  meta: ExpenseDeductibilityMeta | null
): ExpenseDeductibilityResult {
  if (meta?.homeOfficeDays == null) {
    return notComputed("PER_DIEM");
  }

  const days = Math.max(0, meta.homeOfficeDays);
  const rawDeductible = days * DE_HOME_OFFICE_PER_DAY_CENTS;
  // Apply annual cap
  const deductibleAmountCents = Math.min(rawDeductible, DE_HOME_OFFICE_ANNUAL_CAP_CENTS);
  const nonDeductibleAmountCents = Math.max(0, totalAmountCents - deductibleAmountCents);
  const deductiblePercent =
    totalAmountCents > 0 ? Math.round((deductibleAmountCents / totalAmountCents) * 100) : 100;

  return {
    deductiblePercent,
    deductibleAmountCents,
    nonDeductibleAmountCents,
    ruleKind: "PER_DIEM",
    meta: { scheme: "DE_HOME_OFFICE", homeOfficeDays: days, rawDeductibleCents: rawDeductible },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentResult(
  pct: number,
  totalAmountCents: number,
  ruleKind: ExpenseDeductibilityResult["ruleKind"]
): ExpenseDeductibilityResult {
  const deductibleAmountCents = Math.round((pct / 100) * totalAmountCents);
  return {
    deductiblePercent: pct,
    deductibleAmountCents,
    nonDeductibleAmountCents: totalAmountCents - deductibleAmountCents,
    ruleKind,
    meta: null,
  };
}

function notComputed(ruleKind: ExpenseDeductibilityResult["ruleKind"]): ExpenseDeductibilityResult {
  return {
    deductiblePercent: null,
    deductibleAmountCents: null,
    nonDeductibleAmountCents: null,
    ruleKind,
    meta: null,
  };
}
