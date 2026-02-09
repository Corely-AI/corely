import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { DataModule } from "@corely/data";
import { ExpenseCreatedHandler } from "./handlers/expense-created.handler";
import { TaxReportPdfRequestedHandler } from "./handlers/tax-report-pdf-requested.handler";
import { TaxPdfRenderer } from "./pdf/tax-pdf-renderer";
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from "@corely/kernel";
import { PrismaTaxReportRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-report-repo.adapter";
import { PrismaVatPeriodQueryAdapter } from "@/modules/tax/infrastructure/prisma/prisma-vat-period-query.adapter";
import { PrismaTaxProfileRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-profile-repo.adapter";
import { PrismaWorkspaceRepository } from "@/modules/workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";

@Module({
  imports: [DataModule],
  providers: [
    // Expense snapshots moved to API for immediate consistency
    // ExpenseCreatedHandler
    PrismaTaxReportRepoAdapter,
    PrismaVatPeriodQueryAdapter,
    PrismaTaxProfileRepoAdapter,
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
  ],
  exports: [
    // ExpenseCreatedHandler
    TaxReportPdfRequestedHandler,
  ],
})
export class TaxWorkerModule {}
