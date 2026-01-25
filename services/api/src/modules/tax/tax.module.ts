import { Module } from "@nestjs/common";
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

// Services
import { TaxEngineService } from "./application/services/tax-engine.service";
import { DEPackV1 } from "./application/services/jurisdictions/de-pack.v1";
import { TaxStrategyResolverService } from "./application/services/tax-strategy-resolver.service";
import { PersonalTaxStrategy } from "./application/services/personal-tax-strategy";
import { CompanyTaxStrategy } from "./application/services/company-tax-strategy";
import { VatPeriodResolver } from "./domain/services/vat-period.resolver";
import { TaxPdfRenderer } from "./infrastructure/pdf/tax-pdf-renderer";

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

    // Services
    TaxEngineService,
    DEPackV1,
    TaxStrategyResolverService,
    PersonalTaxStrategy,
    CompanyTaxStrategy,
    VatPeriodResolver,
    TaxPdfRenderer,

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
  ],
  exports: [
    // Export use cases so other modules can use them
    CalculateTaxUseCase,
    LockTaxSnapshotUseCase,
    TaxEngineService,
  ],
})
export class TaxModule {}
