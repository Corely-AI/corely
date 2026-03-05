import {
  AnnualIncomeSectionPayloadSchema,
  type AnnualIncomeSourceType,
  type AnnualIncomeSectionPayload,
  type TaxFilingReportStatus,
  type TaxFilingReportSummary,
  type TaxReportSectionValidationError,
} from "@corely/contracts";
import type { TaxEricJobEntity } from "../../domain/entities/tax-eric-job.entity";
import type { TaxReportSectionEntity } from "../../domain/entities/tax-report-section.entity";

export const ANNUAL_INCOME_REPORT_TYPE = "annual_income_report" as const;
export const ANNUAL_INCOME_SECTION_KEY = "annualIncome" as const;

export type AnnualIncomeTotals = {
  grossIncome: number;
  taxesWithheld: number;
  socialContributions: number;
  expensesRelated: number;
  taxableIncome: number;
};

export const buildDefaultAnnualIncomePayload = (): AnnualIncomeSectionPayload => ({
  incomeSources: [],
  noIncomeFlag: false,
});

const toNonNegativeNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return 0;
};

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const toRawObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const coerceAnnualIncomePayload = (value: unknown): AnnualIncomeSectionPayload => {
  const raw = toRawObject(value);
  const incomeSourcesValue = Array.isArray(raw.incomeSources) ? raw.incomeSources : [];
  const noIncomeFlag = Boolean(raw.noIncomeFlag);

  const incomeSources = incomeSourcesValue.map((source) => {
    const rawSource = toRawObject(source);
    const rawAmounts = toRawObject(rawSource.amounts);
    const rawPeriod = toRawObject(rawSource.period);
    const rawAttachments = toRawObject(rawSource.attachments);

    const startDate = toOptionalString(rawPeriod.startDate);
    const endDate = toOptionalString(rawPeriod.endDate);
    const attachments = Array.isArray(rawAttachments.documentIds)
      ? {
          documentIds: rawAttachments.documentIds
            .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
            .map((id) => id.trim()),
        }
      : undefined;

    const sourceType: AnnualIncomeSourceType =
      rawSource.type === "employment" ||
      rawSource.type === "self_employed" ||
      rawSource.type === "freelance" ||
      rawSource.type === "capital_gains" ||
      rawSource.type === "rental" ||
      rawSource.type === "pension" ||
      rawSource.type === "other"
        ? rawSource.type
        : "other";

    return {
      type: sourceType,
      label: typeof rawSource.label === "string" ? rawSource.label : "",
      payer: toOptionalString(rawSource.payer),
      country:
        typeof rawSource.country === "string" && rawSource.country.length === 2
          ? rawSource.country
          : "DE",
      amounts: {
        grossIncome: toNonNegativeNumber(rawAmounts.grossIncome),
        taxesWithheld:
          rawAmounts.taxesWithheld === undefined
            ? undefined
            : toNonNegativeNumber(rawAmounts.taxesWithheld),
        socialContributions:
          rawAmounts.socialContributions === undefined
            ? undefined
            : toNonNegativeNumber(rawAmounts.socialContributions),
        expensesRelated:
          rawAmounts.expensesRelated === undefined
            ? undefined
            : toNonNegativeNumber(rawAmounts.expensesRelated),
      },
      period:
        startDate || endDate
          ? {
              startDate,
              endDate,
            }
          : undefined,
      attachments,
    };
  });

  return {
    incomeSources,
    noIncomeFlag,
  };
};

export const calculateAnnualIncomeTotals = (
  payload: AnnualIncomeSectionPayload
): AnnualIncomeTotals => {
  const totals = payload.incomeSources.reduce(
    (acc, source) => {
      acc.grossIncome += source.amounts.grossIncome;
      acc.taxesWithheld += source.amounts.taxesWithheld ?? 0;
      acc.socialContributions += source.amounts.socialContributions ?? 0;
      acc.expensesRelated += source.amounts.expensesRelated ?? 0;
      return acc;
    },
    {
      grossIncome: 0,
      taxesWithheld: 0,
      socialContributions: 0,
      expensesRelated: 0,
      taxableIncome: 0,
    }
  );

  totals.taxableIncome = Math.max(
    0,
    totals.grossIncome - totals.expensesRelated - totals.socialContributions
  );

  return totals;
};

export const evaluateAnnualIncomeSectionCompletion = (params: {
  payload: AnnualIncomeSectionPayload;
  validationErrors: TaxReportSectionValidationError[];
}): { completion: number; isComplete: boolean } => {
  if (params.payload.noIncomeFlag) {
    const isComplete =
      params.payload.incomeSources.length === 0 && params.validationErrors.length === 0;
    return { completion: isComplete ? 1 : 0, isComplete };
  }

  if (params.payload.incomeSources.length === 0) {
    return { completion: 0, isComplete: false };
  }

  const sourceCompleteness = params.payload.incomeSources.map((source) => {
    let score = 0;
    if (source.label.trim().length > 0) {
      score += 0.5;
    }
    if (source.amounts.grossIncome >= 0) {
      score += 0.5;
    }
    return score;
  });

  const average =
    sourceCompleteness.reduce((sum, score) => sum + score, 0) / sourceCompleteness.length;
  const withErrorPenalty =
    params.validationErrors.length > 0 ? Math.max(0, average - 0.25) : average;
  const completion = Math.max(0, Math.min(1, Number(withErrorPenalty.toFixed(2))));
  const isComplete = completion === 1 && params.validationErrors.length === 0;

  return {
    completion,
    isComplete,
  };
};

export const validateAnnualIncomeSectionPayload = (
  payload: unknown
): {
  payload: AnnualIncomeSectionPayload;
  validationErrors: TaxReportSectionValidationError[];
} => {
  const parsed = AnnualIncomeSectionPayloadSchema.safeParse(payload);
  if (parsed.success) {
    return {
      payload: parsed.data,
      validationErrors: [],
    };
  }

  return {
    payload: coerceAnnualIncomePayload(payload),
    validationErrors: parsed.error.issues.map((issue) => ({
      path: issue.path.map((segment) => String(segment)).join("."),
      message: issue.message,
      code: String(issue.code),
    })),
  };
};

export const readAnnualIncomePayloadFromSection = (
  section: Pick<TaxReportSectionEntity, "payload"> | null
): {
  payload: AnnualIncomeSectionPayload;
  validationErrors: TaxReportSectionValidationError[];
} => {
  if (!section) {
    return {
      payload: buildDefaultAnnualIncomePayload(),
      validationErrors: [],
    };
  }

  const annualIncome = toRawObject(section.payload).annualIncome;
  return validateAnnualIncomeSectionPayload(annualIncome);
};

export const readAnnualIncomePayloadFromLegacyMeta = (
  meta: Record<string, unknown> | null | undefined
): {
  payload: AnnualIncomeSectionPayload;
  validationErrors: TaxReportSectionValidationError[];
} => {
  const source = toRawObject(meta).annualIncome;
  if (source) {
    return validateAnnualIncomeSectionPayload(source);
  }

  return {
    payload: buildDefaultAnnualIncomePayload(),
    validationErrors: [],
  };
};

export const deriveAnnualIncomeReportStatus = (params: {
  section: Pick<TaxReportSectionEntity, "isComplete" | "validationErrors"> | null;
  jobs: TaxEricJobEntity[];
}): TaxFilingReportStatus => {
  const latestSubmitSuccess = params.jobs.find(
    (job) => job.action === "submit" && job.status === "succeeded"
  );
  if (latestSubmitSuccess) {
    return "submitted";
  }

  const latestFailure = params.jobs.find((job) => job.status === "failed");
  if (latestFailure) {
    return "failed";
  }

  const latestValidateSuccess = params.jobs.find(
    (job) => job.action === "validate" && job.status === "succeeded"
  );
  if (latestValidateSuccess) {
    return "validated";
  }

  if (params.section?.isComplete && params.section.validationErrors.length === 0) {
    return "ready";
  }

  return "draft";
};

export const buildAnnualIncomeReportSummary = (params: {
  reportId: string;
  section: TaxReportSectionEntity | null;
  jobs: TaxEricJobEntity[];
  fallbackUpdatedAt?: Date;
}): TaxFilingReportSummary => {
  const status = deriveAnnualIncomeReportStatus({
    section: params.section
      ? {
          isComplete: params.section.isComplete,
          validationErrors: params.section.validationErrors,
        }
      : null,
    jobs: params.jobs,
  });

  return {
    id: params.reportId,
    type: ANNUAL_INCOME_REPORT_TYPE,
    status,
    sections: [
      {
        id: params.section?.id ?? `${params.reportId}:annualIncome`,
        sectionKey: ANNUAL_INCOME_SECTION_KEY,
        completion: params.section?.completion ?? 0,
        isComplete: params.section?.isComplete ?? false,
        validationErrors: params.section?.validationErrors ?? [],
        updatedAt: (
          params.section?.updatedAt ??
          params.fallbackUpdatedAt ??
          new Date(0)
        ).toISOString(),
      },
    ],
  };
};
