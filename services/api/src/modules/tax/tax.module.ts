import { Inject, Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { TaxController } from "./tax.controller";

// Use cases
import { GetTaxProfileUseCase } from "./application/use-cases/get-tax-profile.use-case";
import { UpsertTaxProfileUseCase } from "./application/use-cases/upsert-tax-profile.use-case";
import { ListTaxCodesUseCase } from "./application/use-cases/list-tax-codes.use-case";
import { CreateTaxCodeUseCase } from "./application/use-cases/create-tax-code.use-case";
import { CalculateTaxUseCase } from "./application/use-cases/calculate-tax.use-case";
import { LockTaxSnapshotUseCase } from "./application/use-cases/lock-tax-snapshot.use-case";
import { GetTaxSummaryUseCase } from "./application/use-cases/get-tax-summary.use-case";
import { ListTaxReportsUseCase } from "./application/use-cases/list-tax-reports.use-case";
import { GetTaxReportUseCase } from "./application/use-cases/get-tax-report.use-case";
import { MarkTaxReportSubmittedUseCase } from "./application/use-cases/mark-tax-report-submitted.use-case";
import { GetTaxConsultantUseCase } from "./application/use-cases/get-tax-consultant.use-case";
import { UpsertTaxConsultantUseCase } from "./application/use-cases/upsert-tax-consultant.use-case";
import { ListVatPeriodsUseCase } from "./application/use-cases/list-vat-periods.use-case";
import { GetVatPeriodSummaryUseCase } from "./application/use-cases/get-vat-period-summary.use-case";
import { GetVatPeriodDetailsUseCase } from "./application/use-cases/get-vat-period-details.use-case";
import { MarkVatPeriodSubmittedUseCase } from "./application/use-cases/mark-vat-period-submitted.use-case";
import { MarkVatPeriodNilUseCase } from "./application/use-cases/mark-vat-period-nil.use-case";
import { ArchiveVatPeriodUseCase } from "./application/use-cases/archive-vat-period.use-case";
import { GenerateTaxReportPdfUseCase } from "./application/use-cases/generate-tax-report-pdf.use-case";
import { GenerateTaxReportsUseCase } from "./application/services/generate-tax-reports.use-case";
import { GetTaxCenterUseCase } from "./application/use-cases/get-tax-center.use-case";
import { GetTaxCapabilitiesUseCase } from "./application/use-cases/get-tax-capabilities.use-case";
import { ListTaxFilingsUseCase } from "./application/use-cases/list-tax-filings.use-case";
import { ListTaxPaymentsUseCase } from "./application/use-cases/list-tax-payments.use-case";
import { ExportTaxPaymentsUseCase } from "./application/use-cases/export-tax-payments.use-case";
import { GetVatFilingPeriodsUseCase } from "./application/use-cases/get-vat-filing-periods.use-case";
import { CreateTaxFilingUseCase } from "./application/use-cases/create-tax-filing.use-case";
import { GetTaxFilingDetailUseCase } from "./application/use-cases/get-tax-filing-detail.use-case";
import { ListTaxFilingItemsUseCase } from "./application/use-cases/list-tax-filing-items.use-case";
import { ListTaxFilingAttachmentsUseCase } from "./application/use-cases/list-tax-filing-attachments.use-case";
import { AttachTaxFilingDocumentUseCase } from "./application/use-cases/attach-tax-filing-document.use-case";
import { AttachTaxFilingPaymentProofUseCase } from "./application/use-cases/attach-tax-filing-payment-proof.use-case";
import { RemoveTaxFilingAttachmentUseCase } from "./application/use-cases/remove-tax-filing-attachment.use-case";
import { ListTaxFilingActivityUseCase } from "./application/use-cases/list-tax-filing-activity.use-case";
import { RecalculateTaxFilingUseCase } from "./application/use-cases/recalculate-tax-filing.use-case";
import { SubmitTaxFilingUseCase } from "./application/use-cases/submit-tax-filing.use-case";
import { MarkTaxFilingPaidUseCase } from "./application/use-cases/mark-tax-filing-paid.use-case";
import { DeleteTaxFilingUseCase } from "./application/use-cases/delete-tax-filing.use-case";

// Services
import { TaxEngineService } from "./application/services/tax-engine.service";
import { DEPackV1 } from "./application/services/jurisdictions/de-pack.v1";
import { TaxStrategyResolverService } from "./application/services/tax-strategy-resolver.service";
import { PersonalTaxStrategy } from "./application/services/personal-tax-strategy";
import { CompanyTaxStrategy } from "./application/services/company-tax-strategy";
import { TaxCapabilitiesService } from "./application/services/tax-capabilities.service";
import { VatPeriodResolver } from "./domain/services/vat-period.resolver";
import { TaxPdfRenderer } from "./infrastructure/pdf/tax-pdf-renderer";

// Reporting
import { ReportRegistry } from "./domain/reporting/report-registry";
import { VatAdvanceDeStrategy } from "./domain/reporting/strategies/de/vat-advance-de.strategy";
import { EuSalesListDeStrategy } from "./domain/reporting/strategies/de/eu-sales-list-de.strategy";
import { IncomeTaxDeStrategy } from "./domain/reporting/strategies/de/income-tax-de.strategy";

// Repository ports
import {
  TaxProfileRepoPort,
  TaxCodeRepoPort,
  TaxRateRepoPort,
  TaxSnapshotRepoPort,
  VatReportRepoPort,
  TaxConsultantRepoPort,
  TaxReportRepoPort,
  TaxSummaryQueryPort,
  VatPeriodQueryPort,
} from "./domain/ports";

// Repository adapters
import { PrismaTaxProfileRepoAdapter } from "./infrastructure/prisma/prisma-tax-profile-repo.adapter";
import { PrismaTaxCodeRepoAdapter } from "./infrastructure/prisma/prisma-tax-code-repo.adapter";
import { PrismaTaxRateRepoAdapter } from "./infrastructure/prisma/prisma-tax-rate-repo.adapter";
import { PrismaTaxSnapshotRepoAdapter } from "./infrastructure/prisma/prisma-tax-snapshot-repo.adapter";
import { PrismaVatReportRepoAdapter } from "./infrastructure/prisma/prisma-vat-report-repo.adapter";
import { PrismaTaxConsultantRepoAdapter } from "./infrastructure/prisma/prisma-tax-consultant-repo.adapter";
import { PrismaTaxReportRepoAdapter } from "./infrastructure/prisma/prisma-tax-report-repo.adapter";
import { PrismaTaxSummaryQueryAdapter } from "./infrastructure/prisma/prisma-tax-summary-query.adapter";
import { PrismaVatPeriodQueryAdapter } from "./infrastructure/prisma/prisma-vat-period-query.adapter";
import { WORKSPACE_TAX_SETTINGS_PORT } from "./application/ports/workspace-tax-settings.port";
import { PrismaWorkspaceTaxSettingsAdapter } from "./infrastructure/prisma/prisma-workspace-tax-settings.adapter";
import { DocumentsModule } from "../documents/documents.module";

@Module({
  imports: [IdentityModule, WorkspacesModule, DataModule, DocumentsModule],
  controllers: [TaxController],
  providers: [
    // Use cases
    GetTaxProfileUseCase,
    UpsertTaxProfileUseCase,
    ListTaxCodesUseCase,
    CreateTaxCodeUseCase,
    CalculateTaxUseCase,
    LockTaxSnapshotUseCase,
    GetTaxSummaryUseCase,
    ListTaxReportsUseCase,
    GetTaxReportUseCase,
    MarkTaxReportSubmittedUseCase,
    GetTaxConsultantUseCase,
    UpsertTaxConsultantUseCase,
    ListVatPeriodsUseCase,
    GetVatPeriodSummaryUseCase,
    GetVatPeriodDetailsUseCase,
    MarkVatPeriodSubmittedUseCase,
    MarkVatPeriodNilUseCase,
    ArchiveVatPeriodUseCase,
    GenerateTaxReportPdfUseCase,
    GenerateTaxReportPdfUseCase,
    GenerateTaxReportsUseCase,
    GetTaxCenterUseCase,
    GetTaxCapabilitiesUseCase,
    ListTaxFilingsUseCase,
    ListTaxPaymentsUseCase,
    ExportTaxPaymentsUseCase,
    GetVatFilingPeriodsUseCase,
    CreateTaxFilingUseCase,
    GetTaxFilingDetailUseCase,
    ListTaxFilingItemsUseCase,
    ListTaxFilingAttachmentsUseCase,
    AttachTaxFilingDocumentUseCase,
    AttachTaxFilingPaymentProofUseCase,
    RemoveTaxFilingAttachmentUseCase,
    ListTaxFilingActivityUseCase,
    RecalculateTaxFilingUseCase,
    SubmitTaxFilingUseCase,
    MarkTaxFilingPaidUseCase,
    DeleteTaxFilingUseCase,

    // Services
    TaxEngineService,
    DEPackV1,
    TaxStrategyResolverService,
    PersonalTaxStrategy,
    CompanyTaxStrategy,
    TaxCapabilitiesService,
    VatPeriodResolver,
    TaxPdfRenderer,

    // Reporting Registry
    ReportRegistry,
    VatAdvanceDeStrategy,
    EuSalesListDeStrategy,
    IncomeTaxDeStrategy,

    // Repository adapters bound to ports
    {
      provide: TaxProfileRepoPort,
      useClass: PrismaTaxProfileRepoAdapter,
    },
    {
      provide: TaxCodeRepoPort,
      useClass: PrismaTaxCodeRepoAdapter,
    },
    {
      provide: TaxRateRepoPort,
      useClass: PrismaTaxRateRepoAdapter,
    },
    {
      provide: TaxSnapshotRepoPort,
      useClass: PrismaTaxSnapshotRepoAdapter,
    },
    {
      provide: VatReportRepoPort,
      useClass: PrismaVatReportRepoAdapter,
    },
    {
      provide: TaxConsultantRepoPort,
      useClass: PrismaTaxConsultantRepoAdapter,
    },
    {
      provide: TaxReportRepoPort,
      useClass: PrismaTaxReportRepoAdapter,
    },
    {
      provide: TaxSummaryQueryPort,
      useClass: PrismaTaxSummaryQueryAdapter,
    },
    {
      provide: VatPeriodQueryPort,
      useClass: PrismaVatPeriodQueryAdapter,
    },
    {
      provide: WORKSPACE_TAX_SETTINGS_PORT,
      useClass: PrismaWorkspaceTaxSettingsAdapter,
    },
  ],
  exports: [
    // Export use cases so other modules can use them
    CalculateTaxUseCase,
    LockTaxSnapshotUseCase,
    TaxEngineService,
    GenerateTaxReportsUseCase,
  ],
})
export class TaxModule {
  constructor(
    @Inject(ReportRegistry) private readonly registry: ReportRegistry,
    @Inject(VatAdvanceDeStrategy) private readonly vatAdvanceDe: VatAdvanceDeStrategy,
    @Inject(EuSalesListDeStrategy) private readonly euSalesDe: EuSalesListDeStrategy,
    @Inject(IncomeTaxDeStrategy) private readonly incomeTaxDe: IncomeTaxDeStrategy
  ) {
    this.registry.register(vatAdvanceDe);
    this.registry.register(euSalesDe);
    this.registry.register(incomeTaxDe);
  }
}
