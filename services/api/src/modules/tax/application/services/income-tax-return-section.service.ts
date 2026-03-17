import {
  AdditionalExpensesSectionPayloadSchema,
  AnnualIncomeSectionPayloadSchema,
  ChildrenSectionPayloadSchema,
  createDefaultAdditionalExpensesSectionPayload,
  createDefaultChildrenSectionPayload,
  createDefaultHealthInsuranceSectionPayload,
  createDefaultIncomeSectionPayload,
  createDefaultOtherInsurancesSectionPayload,
  createDefaultPayslipsSectionPayload,
  createDefaultPersonalDetailsSectionPayload,
  createDefaultTaxOfficeInfoSectionPayload,
  HealthInsuranceSectionPayloadSchema,
  IncomeSectionPayloadSchema,
  OtherInsurancesSectionPayloadSchema,
  PayslipsSectionPayloadSchema,
  PersonalDetailsSectionPayloadSchema,
  TaxOfficeInfoSectionPayloadSchema,
  type TaxFilingReportStatus,
  type TaxFilingReportSummary,
  type TaxReportSection,
  type TaxReportSectionKey,
  type TaxReportSectionValidationError,
  type TaxReportSectionValueByKey,
} from "@corely/contracts";
import { type z } from "zod";
import { isFailedTaxEricJobStatus } from "../../domain/entities";
import type { TaxEricJobEntity } from "../../domain/entities/tax-eric-job.entity";
import type { TaxReportSectionEntity } from "../../domain/entities/tax-report-section.entity";
import {
  ANNUAL_INCOME_REPORT_TYPE,
  ANNUAL_INCOME_SECTION_KEY,
  buildDefaultAnnualIncomePayload,
  evaluateAnnualIncomeSectionCompletion,
  readAnnualIncomePayloadFromLegacyMeta,
  readAnnualIncomePayloadFromSection,
  validateAnnualIncomeSectionPayload,
} from "./annual-income-report.service";

type SectionDefinition<K extends TaxReportSectionKey> = {
  key: K;
  schema: z.ZodType<TaxReportSectionValueByKey[K]>;
  createDefault: () => TaxReportSectionValueByKey[K];
};

const toRawObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const toValidationErrors = (issues: z.ZodIssue[]): TaxReportSectionValidationError[] =>
  issues.map((issue) => ({
    path: issue.path.map((segment) => String(segment)).join("."),
    message: issue.message,
    code: String(issue.code),
  }));

const isMeaningfulPayload = (value: unknown, defaultValue: unknown): boolean => {
  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    return JSON.stringify(value) !== JSON.stringify(defaultValue);
  }

  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0 && value !== defaultValue;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value !== defaultValue;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    const rawValue = toRawObject(value);
    const rawDefault = toRawObject(defaultValue);
    return Object.keys(rawValue).some((key) => isMeaningfulPayload(rawValue[key], rawDefault[key]));
  }

  return false;
};

const SECTION_DEFINITIONS: {
  [K in TaxReportSectionKey]: SectionDefinition<K>;
} = {
  annualIncome: {
    key: "annualIncome",
    schema: AnnualIncomeSectionPayloadSchema,
    createDefault: buildDefaultAnnualIncomePayload,
  },
  personalDetails: {
    key: "personalDetails",
    schema: PersonalDetailsSectionPayloadSchema,
    createDefault: createDefaultPersonalDetailsSectionPayload,
  },
  income: {
    key: "income",
    schema: IncomeSectionPayloadSchema,
    createDefault: createDefaultIncomeSectionPayload,
  },
  healthInsurance: {
    key: "healthInsurance",
    schema: HealthInsuranceSectionPayloadSchema,
    createDefault: createDefaultHealthInsuranceSectionPayload,
  },
  otherInsurances: {
    key: "otherInsurances",
    schema: OtherInsurancesSectionPayloadSchema,
    createDefault: createDefaultOtherInsurancesSectionPayload,
  },
  additionalExpenses: {
    key: "additionalExpenses",
    schema: AdditionalExpensesSectionPayloadSchema,
    createDefault: createDefaultAdditionalExpensesSectionPayload,
  },
  taxOfficeInfo: {
    key: "taxOfficeInfo",
    schema: TaxOfficeInfoSectionPayloadSchema,
    createDefault: createDefaultTaxOfficeInfoSectionPayload,
  },
  payslips: {
    key: "payslips",
    schema: PayslipsSectionPayloadSchema,
    createDefault: createDefaultPayslipsSectionPayload,
  },
  children: {
    key: "children",
    schema: ChildrenSectionPayloadSchema,
    createDefault: createDefaultChildrenSectionPayload,
  },
};

export const INCOME_TAX_RETURN_SECTION_KEYS = [
  "personalDetails",
  "income",
  "healthInsurance",
  "otherInsurances",
  "additionalExpenses",
  "taxOfficeInfo",
  "payslips",
  "children",
] as const;

export type IncomeTaxReturnSectionKey = (typeof INCOME_TAX_RETURN_SECTION_KEYS)[number];

export const getTaxReportSectionDefinition = <K extends TaxReportSectionKey>(
  key: K
): SectionDefinition<K> => SECTION_DEFINITIONS[key];

export const validateTaxReportSectionPayload = <K extends TaxReportSectionKey>(
  key: K,
  payload: unknown
): {
  payload: TaxReportSectionValueByKey[K];
  validationErrors: TaxReportSectionValidationError[];
  completion: number;
  isComplete: boolean;
} => {
  if (key === ANNUAL_INCOME_SECTION_KEY) {
    const validated = validateAnnualIncomeSectionPayload(payload);
    const completion = evaluateAnnualIncomeSectionCompletion({
      payload: validated.payload,
      validationErrors: validated.validationErrors,
    });

    return {
      payload: validated.payload as TaxReportSectionValueByKey[K],
      validationErrors: validated.validationErrors,
      completion: completion.completion,
      isComplete: completion.isComplete,
    };
  }

  const definition = getTaxReportSectionDefinition(key);
  const parsed = definition.schema.safeParse(payload);
  const finalPayload = parsed.success ? parsed.data : definition.createDefault();
  const validationErrors = parsed.success ? [] : toValidationErrors(parsed.error.issues);
  const completion = isMeaningfulPayload(finalPayload, definition.createDefault()) ? 1 : 0;

  return {
    payload: finalPayload,
    validationErrors,
    completion,
    isComplete: completion === 1 && validationErrors.length === 0,
  };
};

const readAnnualIncomeFromLegacySources = (params: {
  section: TaxReportSectionEntity | null;
  meta: Record<string, unknown> | null | undefined;
}) => {
  const fromSection = readAnnualIncomePayloadFromSection(params.section);
  if (params.section) {
    return fromSection;
  }

  return readAnnualIncomePayloadFromLegacyMeta(params.meta);
};

export const readTaxReportSectionPayload = <K extends TaxReportSectionKey>(params: {
  key: K;
  section: TaxReportSectionEntity | null;
  legacyAnnualIncomeSection?: TaxReportSectionEntity | null;
  reportMeta?: Record<string, unknown> | null | undefined;
}): {
  payload: TaxReportSectionValueByKey[K];
  validationErrors: TaxReportSectionValidationError[];
  completion: number;
  isComplete: boolean;
} => {
  if (params.key === ANNUAL_INCOME_SECTION_KEY) {
    const annualIncome = readAnnualIncomeFromLegacySources({
      section: params.section,
      meta: params.reportMeta,
    });
    const completion = evaluateAnnualIncomeSectionCompletion({
      payload: annualIncome.payload,
      validationErrors: annualIncome.validationErrors,
    });

    return {
      payload: annualIncome.payload as TaxReportSectionValueByKey[K],
      validationErrors: annualIncome.validationErrors,
      completion: completion.completion,
      isComplete: completion.isComplete,
    };
  }

  if (params.key === "income" && !params.section) {
    const defaultIncome = createDefaultIncomeSectionPayload();
    const annualIncome = readAnnualIncomeFromLegacySources({
      section: params.legacyAnnualIncomeSection ?? null,
      meta: params.reportMeta,
    });
    const payload = {
      ...defaultIncome,
      annualIncome: annualIncome.payload,
    };
    const completion = isMeaningfulPayload(payload, createDefaultIncomeSectionPayload()) ? 1 : 0;

    return {
      payload: payload as TaxReportSectionValueByKey[K],
      validationErrors: annualIncome.validationErrors,
      completion,
      isComplete: completion === 1 && annualIncome.validationErrors.length === 0,
    };
  }

  const definition = getTaxReportSectionDefinition(params.key);
  if (!params.section) {
    return {
      payload: definition.createDefault(),
      validationErrors: [],
      completion: 0,
      isComplete: false,
    };
  }

  const rawValue = toRawObject(params.section.payload)[params.key];
  const parsed = definition.schema.safeParse(rawValue);
  const payload = parsed.success ? parsed.data : definition.createDefault();
  const validationErrors = parsed.success ? [] : toValidationErrors(parsed.error.issues);
  const completion = isMeaningfulPayload(payload, definition.createDefault())
    ? params.section.completion || 1
    : 0;

  return {
    payload,
    validationErrors:
      validationErrors.length > 0 ? validationErrors : params.section.validationErrors,
    completion,
    isComplete: completion === 1 && validationErrors.length === 0,
  };
};

export const createTaxReportSectionPayloadEnvelope = <K extends TaxReportSectionKey>(
  key: K,
  payload: TaxReportSectionValueByKey[K]
): Record<K, TaxReportSectionValueByKey[K]> =>
  ({ [key]: payload }) as Record<K, TaxReportSectionValueByKey[K]>;

export const toTaxReportSectionDto = <K extends TaxReportSectionKey>(params: {
  key: K;
  section: Pick<
    TaxReportSectionEntity,
    | "id"
    | "filingId"
    | "reportId"
    | "reportType"
    | "sectionKey"
    | "completion"
    | "isComplete"
    | "validationErrors"
    | "createdAt"
    | "updatedAt"
  >;
  payload: TaxReportSectionValueByKey[K];
  validationErrors?: TaxReportSectionValidationError[];
}): TaxReportSection => ({
  id: params.section.id,
  filingId: params.section.filingId,
  reportId: params.section.reportId,
  reportType: params.section.reportType,
  sectionKey: params.section.sectionKey,
  completion: params.section.completion,
  isComplete: params.section.isComplete,
  validationErrors: params.validationErrors ?? params.section.validationErrors,
  payload: createTaxReportSectionPayloadEnvelope(params.key, params.payload),
  createdAt: params.section.createdAt.toISOString(),
  updatedAt: params.section.updatedAt.toISOString(),
});

const deriveIncomeTaxReturnReportStatus = (params: {
  sections: TaxReportSectionEntity[];
  jobs: TaxEricJobEntity[];
}): TaxFilingReportStatus => {
  const latestSubmitSuccess = params.jobs.find(
    (job) =>
      job.action === "submit" &&
      (job.status === "succeeded" || job.status === "succeeded_with_warnings")
  );
  if (latestSubmitSuccess) {
    return "submitted";
  }

  const latestFailure = params.jobs.find((job) => isFailedTaxEricJobStatus(job.status));
  if (latestFailure) {
    return "failed";
  }

  const latestValidateSuccess = params.jobs.find(
    (job) =>
      job.action === "validate" &&
      (job.status === "succeeded" || job.status === "succeeded_with_warnings")
  );
  if (latestValidateSuccess) {
    return "validated";
  }

  if (
    params.sections.length > 0 &&
    params.sections.every((section) => section.isComplete && section.validationErrors.length === 0)
  ) {
    return "ready";
  }

  return "draft";
};

export const buildIncomeTaxReturnReportSummary = (params: {
  reportId: string;
  sectionsByKey: Partial<Record<IncomeTaxReturnSectionKey, TaxReportSectionEntity>>;
  jobs: TaxEricJobEntity[];
  fallbackUpdatedAt?: Date;
}): TaxFilingReportSummary => {
  const sections = INCOME_TAX_RETURN_SECTION_KEYS.map((key) => {
    const section = params.sectionsByKey[key];
    return {
      id: section?.id ?? `${params.reportId}:${key}`,
      sectionKey: key,
      completion: section?.completion ?? 0,
      isComplete: section?.isComplete ?? false,
      validationErrors: section?.validationErrors ?? [],
      updatedAt: (section?.updatedAt ?? params.fallbackUpdatedAt ?? new Date(0)).toISOString(),
    };
  });

  return {
    id: params.reportId,
    type: ANNUAL_INCOME_REPORT_TYPE,
    status: deriveIncomeTaxReturnReportStatus({
      sections: Object.values(params.sectionsByKey).filter(
        (section): section is TaxReportSectionEntity => Boolean(section)
      ),
      jobs: params.jobs,
    }),
    sections,
  };
};
