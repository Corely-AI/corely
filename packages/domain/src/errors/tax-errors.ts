import { AppError } from "./app-error";

/**
 * Thrown when a tenant tries to use tax features but has no active tax profile.
 * Code: Tax:ProfileMissing  Status: 422
 */
export class TaxProfileMissingError extends AppError {
  constructor(tenantId: string) {
    super({
      code: "Tax:ProfileMissing",
      message: `No active tax profile for tenant ${tenantId}`,
      publicMessage:
        "Tax profile is not configured. Please complete your tax settings before using this feature.",
      status: 422,
      logLevel: "warn",
      data: { tenantId },
    });
  }
}

/**
 * Thrown when a filing state transition is not allowed by the state machine.
 * Code: Tax:FilingInvalidTransition  Status: 422
 */
export class TaxFilingInvalidTransitionError extends AppError {
  constructor(from: string, to: string, filingId?: string) {
    super({
      code: "Tax:FilingInvalidTransition",
      message: `Cannot transition filing from ${from} to ${to}`,
      publicMessage: `This action is not allowed in the current filing status (${from}).`,
      status: 422,
      logLevel: "warn",
      data: { from, to, ...(filingId ? { filingId } : {}) },
    });
  }
}

/**
 * Thrown when a global kill-switch or workspace capability flag disables a tax feature.
 * Code: Tax:CapabilityDisabled  Status: 403
 */
export class TaxCapabilityDisabledError extends AppError {
  constructor(capability: string) {
    super({
      code: "Tax:CapabilityDisabled",
      message: `Tax capability '${capability}' is disabled`,
      publicMessage: "This tax feature is not available for your current plan or region.",
      status: 403,
      logLevel: "info",
      data: { capability },
    });
  }
}

/**
 * Thrown when no jurisdiction pack exists for a given country code.
 * Code: Tax:JurisdictionUnsupported  Status: 422
 */
export class TaxJurisdictionUnsupportedError extends AppError {
  constructor(jurisdiction: string) {
    super({
      code: "Tax:JurisdictionUnsupported",
      message: `No jurisdiction pack found for: ${jurisdiction}`,
      publicMessage: `Tax calculations for jurisdiction '${jurisdiction}' are not yet supported.`,
      status: 422,
      logLevel: "warn",
      data: { jurisdiction },
    });
  }
}

/**
 * Thrown when a tax filing ID cannot be found for the given tenant.
 * Code: Tax:FilingNotFound  Status: 404
 */
export class TaxFilingNotFoundError extends AppError {
  constructor(filingId: string) {
    super({
      code: "Tax:FilingNotFound",
      message: `Tax filing ${filingId} not found`,
      // publicMessage intentionally absent — detail is sanitized in production
      status: 404,
      logLevel: "info",
      data: { filingId },
    });
  }
}

/**
 * Thrown when creating a filing that would duplicate an existing one for the same period.
 * Code: Tax:FilingConflict  Status: 409
 */
export class TaxFilingConflictError extends AppError {
  constructor(periodKey: string, existingFilingId?: string) {
    super({
      code: "Tax:FilingConflict",
      message: `A filing already exists for period ${periodKey}`,
      publicMessage: "A filing already exists for this period.",
      status: 409,
      logLevel: "warn",
      data: { periodKey, ...(existingFilingId ? { existingFilingId } : {}) },
    });
  }
}

/**
 * Thrown when a filing cannot be deleted because it is in a non-deletable state.
 * Code: Tax:FilingNotDeletable  Status: 422
 */
export class TaxFilingNotDeletableError extends AppError {
  constructor(filingId: string, status: string) {
    super({
      code: "Tax:FilingNotDeletable",
      message: `Filing ${filingId} in status ${status} cannot be deleted`,
      publicMessage: `Filings in status '${status}' cannot be deleted.`,
      status: 422,
      logLevel: "warn",
      data: { filingId, status },
    });
  }
}
