import { TaxFilingInvalidTransitionError, TaxFilingNotDeletableError } from "@corely/domain";

/**
 * Canonical filing status enum aligned with DB values (lowercase matches contract type).
 * These are the domain-level canonical values; adapt when mapping from DB TaxReportStatus.
 */
export const TaxFilingStatus = {
  DRAFT: "DRAFT",
  NEEDS_FIX: "NEEDS_FIX",
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  SUBMITTED: "SUBMITTED",
  PAID: "PAID",
  ARCHIVED: "ARCHIVED",
} as const;

export type TaxFilingStatus = (typeof TaxFilingStatus)[keyof typeof TaxFilingStatus];

/**
 * Map of DB TaxReportStatus values to domain TaxFilingStatus.
 * The TaxReport model uses uppercase DB enums; the new domain type is more expressive.
 */
export const DB_STATUS_TO_FILING_STATUS: Record<string, TaxFilingStatus> = {
  UPCOMING: TaxFilingStatus.DRAFT,
  OPEN: TaxFilingStatus.DRAFT,
  OVERDUE: TaxFilingStatus.NEEDS_FIX,
  SUBMITTED: TaxFilingStatus.SUBMITTED,
  PAID: TaxFilingStatus.PAID,
  NIL: TaxFilingStatus.ARCHIVED, // NIL is a terminal state
  ARCHIVED: TaxFilingStatus.ARCHIVED,
};

/**
 * Reverse mapping: domain TaxFilingStatus → DB TaxReportStatus string.
 */
export const FILING_STATUS_TO_DB_STATUS: Record<TaxFilingStatus, string> = {
  [TaxFilingStatus.DRAFT]: "OPEN",
  [TaxFilingStatus.NEEDS_FIX]: "OVERDUE",
  [TaxFilingStatus.READY_FOR_REVIEW]: "OPEN",
  [TaxFilingStatus.SUBMITTED]: "SUBMITTED",
  [TaxFilingStatus.PAID]: "PAID",
  [TaxFilingStatus.ARCHIVED]: "ARCHIVED",
};

/**
 * Explicit transition map: maps each status to the set of statuses it can move to.
 * Any transition not listed here is forbidden.
 */
export const FILING_TRANSITIONS: Readonly<Record<TaxFilingStatus, ReadonlyArray<TaxFilingStatus>>> =
  {
    [TaxFilingStatus.DRAFT]: [
      TaxFilingStatus.NEEDS_FIX,
      TaxFilingStatus.READY_FOR_REVIEW,
      TaxFilingStatus.SUBMITTED, // direct submit (bypass review)
      TaxFilingStatus.ARCHIVED,
    ],
    [TaxFilingStatus.NEEDS_FIX]: [
      TaxFilingStatus.DRAFT,
      TaxFilingStatus.READY_FOR_REVIEW,
      TaxFilingStatus.ARCHIVED,
    ],
    [TaxFilingStatus.READY_FOR_REVIEW]: [
      TaxFilingStatus.DRAFT,
      TaxFilingStatus.NEEDS_FIX,
      TaxFilingStatus.SUBMITTED,
      TaxFilingStatus.ARCHIVED,
    ],
    [TaxFilingStatus.SUBMITTED]: [TaxFilingStatus.PAID, TaxFilingStatus.ARCHIVED],
    [TaxFilingStatus.PAID]: [TaxFilingStatus.ARCHIVED],
    [TaxFilingStatus.ARCHIVED]: [], // terminal state
  } as const;

/**
 * States from which a filing can be permanently deleted.
 */
export const DELETABLE_STATUSES: ReadonlyArray<TaxFilingStatus> = [TaxFilingStatus.DRAFT];

/**
 * Guard: asserts that a status transition is allowed.
 *
 * @throws {TaxFilingInvalidTransitionError} if the transition is not permitted.
 *
 * @example
 * ```ts
 * // Throws TaxFilingInvalidTransitionError
 * assertFilingTransition('SUBMITTED', 'DRAFT');
 *
 * // Succeeds silently
 * assertFilingTransition('DRAFT', 'SUBMITTED');
 * ```
 */
export function assertFilingTransition(
  from: TaxFilingStatus,
  to: TaxFilingStatus,
  filingId?: string
): void {
  const allowed = FILING_TRANSITIONS[from] ?? ([] as ReadonlyArray<TaxFilingStatus>);
  if (!allowed.includes(to)) {
    throw new TaxFilingInvalidTransitionError(from, to, filingId);
  }
}

/**
 * Guard: asserts that a filing in the given status can be deleted.
 *
 * @throws {TaxFilingNotDeletableError} if deletion is not permitted.
 */
export function assertFilingDeletable(status: TaxFilingStatus, filingId: string): void {
  if (!DELETABLE_STATUSES.includes(status)) {
    throw new TaxFilingNotDeletableError(filingId, status);
  }
}

/**
 * Map a raw DB status string to the domain TaxFilingStatus enum.
 * Falls back to DRAFT for unknown values.
 */
export function dbStatusToFilingStatus(dbStatus: string): TaxFilingStatus {
  return DB_STATUS_TO_FILING_STATUS[dbStatus] ?? TaxFilingStatus.DRAFT;
}

/**
 * Returns whether a given transition is allowed (non-throwing version).
 */
export function isTransitionAllowed(from: TaxFilingStatus, to: TaxFilingStatus): boolean {
  return (FILING_TRANSITIONS[from] ?? []).includes(to);
}
