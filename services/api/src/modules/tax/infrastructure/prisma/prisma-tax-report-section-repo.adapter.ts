import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { TaxFilingReportType, TaxReportSectionKey } from "@corely/contracts";
import { TaxReportSectionRepoPort } from "../../domain/ports/tax-report-section-repo.port";
import type {
  TaxReportSectionEntity,
  TaxReportSectionValidationErrorEntity,
} from "../../domain/entities/tax-report-section.entity";

const parseValidationErrors = (value: unknown): TaxReportSectionValidationErrorEntity[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: TaxReportSectionValidationErrorEntity[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const path = "path" in item ? item.path : undefined;
    const message = "message" in item ? item.message : undefined;
    const code = "code" in item ? item.code : undefined;
    if (typeof path !== "string" || typeof message !== "string") {
      continue;
    }

    parsed.push({
      path,
      message,
      code: typeof code === "string" ? code : undefined,
    });
  }

  return parsed;
};

@Injectable()
export class PrismaTaxReportSectionRepoAdapter extends TaxReportSectionRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByReportAndSection(params: {
    tenantId: string;
    reportId: string;
    sectionKey: TaxReportSectionKey;
  }): Promise<TaxReportSectionEntity | null> {
    const row = await this.prisma.taxReportSection.findFirst({
      where: {
        tenantId: params.tenantId,
        reportId: params.reportId,
        sectionKey: params.sectionKey,
      },
    });

    return row ? this.toEntity(row) : null;
  }

  async listByReport(params: {
    tenantId: string;
    reportId: string;
  }): Promise<TaxReportSectionEntity[]> {
    const rows = await this.prisma.taxReportSection.findMany({
      where: {
        tenantId: params.tenantId,
        reportId: params.reportId,
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => this.toEntity(row));
  }

  async upsert(params: {
    tenantId: string;
    filingId: string;
    reportId: string;
    reportType: TaxFilingReportType;
    sectionKey: TaxReportSectionKey;
    payload: Record<string, unknown>;
    completion: number;
    isComplete: boolean;
    validationErrors: TaxReportSectionValidationErrorEntity[];
  }): Promise<TaxReportSectionEntity> {
    const row = await this.prisma.taxReportSection.upsert({
      where: {
        tenantId_reportId_sectionKey: {
          tenantId: params.tenantId,
          reportId: params.reportId,
          sectionKey: params.sectionKey,
        },
      },
      create: {
        tenantId: params.tenantId,
        filingId: params.filingId,
        reportId: params.reportId,
        reportType: params.reportType,
        sectionKey: params.sectionKey,
        payload: params.payload as object,
        completion: params.completion,
        isComplete: params.isComplete,
        validationErrors: params.validationErrors as object[],
      },
      update: {
        filingId: params.filingId,
        reportType: params.reportType,
        payload: params.payload as object,
        completion: params.completion,
        isComplete: params.isComplete,
        validationErrors: params.validationErrors as object[],
        updatedAt: new Date(),
      },
    });

    return this.toEntity(row);
  }

  private toEntity(row: {
    id: string;
    tenantId: string;
    filingId: string;
    reportId: string;
    reportType: string;
    sectionKey: string;
    payload: unknown;
    completion: number;
    isComplete: boolean;
    validationErrors: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): TaxReportSectionEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      filingId: row.filingId,
      reportId: row.reportId,
      reportType: row.reportType as TaxFilingReportType,
      sectionKey: row.sectionKey as TaxReportSectionKey,
      payload:
        row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : {},
      completion: row.completion,
      isComplete: row.isComplete,
      validationErrors: parseValidationErrors(row.validationErrors),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
