import { ValidationFailedError } from "@corely/domain";
import type {
  ClassBillingBasis,
  ClassBillingMonthStrategy,
  ClassesBillingSettings,
} from "../../domain/entities/classes.entities";

export const DEFAULT_PREPAID_SETTINGS: ClassesBillingSettings = {
  billingMonthStrategy: "PREPAID_CURRENT_MONTH",
  billingBasis: "SCHEDULED_SESSIONS",
  attendanceMode: "MANUAL",
};

export const DEFAULT_ARREARS_SETTINGS: ClassesBillingSettings = {
  billingMonthStrategy: "ARREARS_PREVIOUS_MONTH",
  billingBasis: "ATTENDED_SESSIONS",
  attendanceMode: "MANUAL",
};

export const defaultBasisForStrategy = (strategy: ClassBillingMonthStrategy): ClassBillingBasis =>
  strategy === "PREPAID_CURRENT_MONTH" ? "SCHEDULED_SESSIONS" : "ATTENDED_SESSIONS";

export const isSupportedStrategyBasis = (
  strategy: ClassBillingMonthStrategy,
  basis: ClassBillingBasis
) =>
  (strategy === "PREPAID_CURRENT_MONTH" && basis === "SCHEDULED_SESSIONS") ||
  (strategy === "ARREARS_PREVIOUS_MONTH" && basis === "ATTENDED_SESSIONS");

export const normalizeBillingSettings = (
  settings: ClassesBillingSettings | null | undefined
): ClassesBillingSettings => {
  const strategy = settings?.billingMonthStrategy ?? DEFAULT_PREPAID_SETTINGS.billingMonthStrategy;
  const basis = settings?.billingBasis ?? defaultBasisForStrategy(strategy);
  const attendanceMode = settings?.attendanceMode ?? "MANUAL";

  // Check valid strategy combo, otherwise default
  if (!isSupportedStrategyBasis(strategy, basis)) {
    return {
      billingMonthStrategy: strategy,
      billingBasis: defaultBasisForStrategy(strategy),
      attendanceMode,
    };
  }

  return { billingMonthStrategy: strategy, billingBasis: basis, attendanceMode };
};

export const validateBillingSettings = (settings: ClassesBillingSettings) => {
  if (!isSupportedStrategyBasis(settings.billingMonthStrategy, settings.billingBasis)) {
    throw new ValidationFailedError("Invalid billing settings", [
      {
        message: "Billing basis does not match the selected strategy",
        members: ["billingBasis"],
      },
    ]);
  }
};
