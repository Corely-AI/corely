import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { TaxReportPdfRequestedHandler } from "./handlers/tax-report-pdf-requested.handler";
import { TaxReportEricJobRequestedHandler } from "./handlers/tax-report-eric-job-requested.handler";
import { TaxPdfRenderer } from "./pdf/tax-pdf-renderer";
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from "@corely/kernel";
import { PrismaTaxReportRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-report-repo.adapter";
import { PrismaVatPeriodQueryAdapter } from "@/modules/tax/infrastructure/prisma/prisma-vat-period-query.adapter";
import { PrismaTaxProfileRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-profile-repo.adapter";
import { PrismaTaxEricJobRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-eric-job-repo.adapter";
import { PrismaWorkspaceRepository } from "@/modules/workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { PrismaDocumentRepoAdapter, PrismaFileRepoAdapter } from "@corely/data";

@Module({
  imports: [DataModule],
  providers: [
    // Expense snapshots moved to API for immediate consistency
    // ExpenseCreatedHandler
    PrismaTaxReportRepoAdapter,
    PrismaVatPeriodQueryAdapter,
    PrismaTaxProfileRepoAdapter,
    PrismaTaxEricJobRepoAdapter,
    PrismaDocumentRepoAdapter,
    PrismaFileRepoAdapter,
    PrismaWorkspaceRepository,
    TaxPdfRenderer,
    {
      provide: TaxReportPdfRequestedHandler,
      useFactory: (
        reportRepo: PrismaTaxReportRepoAdapter,
        vatPeriodQuery: PrismaVatPeriodQueryAdapter,
        taxProfileRepo: PrismaTaxProfileRepoAdapter,
        pdfRenderer: TaxPdfRenderer,
        storage: ObjectStoragePort,
        workspaceRepo: PrismaWorkspaceRepository
      ) =>
        new TaxReportPdfRequestedHandler(
          reportRepo,
          vatPeriodQuery,
          taxProfileRepo,
          pdfRenderer,
          storage,
          workspaceRepo
        ),
      inject: [
        PrismaTaxReportRepoAdapter,
        PrismaVatPeriodQueryAdapter,
        PrismaTaxProfileRepoAdapter,
        TaxPdfRenderer,
        OBJECT_STORAGE_PORT,
        PrismaWorkspaceRepository,
      ],
    },
    {
      provide: TaxReportEricJobRequestedHandler,
      useFactory: (
        ericJobRepo: PrismaTaxEricJobRepoAdapter,
        storage: ObjectStoragePort,
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter
      ) => new TaxReportEricJobRequestedHandler(ericJobRepo, storage, documentRepo, fileRepo),
      inject: [
        PrismaTaxEricJobRepoAdapter,
        OBJECT_STORAGE_PORT,
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
      ],
    },
  ],
  exports: [
    // ExpenseCreatedHandler
    TaxReportPdfRequestedHandler,
    TaxReportEricJobRequestedHandler,
  ],
})
export class TaxWorkerModule {}
