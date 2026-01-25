import { type TaxReportType, type TaxProfileDto } from "@corely/contracts";

export interface ReportGenerationContext {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  profile: TaxProfileDto; // Use DTO or Entity? Usually Domain Strategy uses Entity or Port-Data. Let's use DTO for simplicity if Entity is not rich.
}

export interface ReportGenerationResult {
  amountDueCents: number;
  meta: Record<string, any>;
  lines?: any[];
}

export interface ReportStrategy {
  readonly type: TaxReportType;
  readonly countryCode: string;

  /**
   * Determine if this report is required for the given context
   */
  isRequired(ctx: ReportGenerationContext): Promise<boolean>;

  /**
   * Calculate/Generate the report data
   */
  generate(ctx: ReportGenerationContext): Promise<ReportGenerationResult>;

  /**
   * Get submission deadline
   */
  getDueDate(periodEnd: Date, ctx?: ReportGenerationContext): Date;
}
