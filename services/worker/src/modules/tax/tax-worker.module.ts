import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { DataModule } from "@corely/data";
import { ExpenseCreatedHandler } from "./handlers/expense-created.handler";
import { TaxReportPdfRequestedHandler } from "./handlers/tax-report-pdf-requested.handler";
import { TaxPdfRenderer } from "./pdf/tax-pdf-renderer";
import { createGcsClient } from "@/modules/documents/infrastructure/storage/gcs/gcs.client";
import { GcsObjectStorageAdapter } from "@/modules/documents/infrastructure/storage/gcs/gcs-object-storage.adapter";
import { PrismaTaxReportRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-report-repo.adapter";
import { PrismaVatPeriodQueryAdapter } from "@/modules/tax/infrastructure/prisma/prisma-vat-period-query.adapter";
import { PrismaTaxProfileRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-profile-repo.adapter";
import { PrismaWorkspaceRepositoryAdapter } from "@/modules/workspaces/infrastructure/prisma/prisma-workspace-repository.adapter";

@Module({
  imports: [DataModule],
  providers: [
    // Expense snapshots moved to API for immediate consistency
    // ExpenseCreatedHandler
    PrismaTaxReportRepoAdapter,
    PrismaVatPeriodQueryAdapter,
    PrismaTaxProfileRepoAdapter,
    PrismaWorkspaceRepositoryAdapter,
    TaxPdfRenderer,
    {
      provide: GcsObjectStorageAdapter,
      useFactory: (env: EnvService) => {
        const client = createGcsClient({
          projectId: env.GOOGLE_CLOUD_PROJECT,
          keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        return new GcsObjectStorageAdapter(client, env.STORAGE_BUCKET);
      },
      inject: [EnvService],
    },
    {
      provide: TaxReportPdfRequestedHandler,
      useFactory: (
        reportRepo: PrismaTaxReportRepoAdapter,
        vatPeriodQuery: PrismaVatPeriodQueryAdapter,
        taxProfileRepo: PrismaTaxProfileRepoAdapter,
        pdfRenderer: TaxPdfRenderer,
        storage: GcsObjectStorageAdapter,
        workspaceRepo: PrismaWorkspaceRepositoryAdapter
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
        GcsObjectStorageAdapter,
        PrismaWorkspaceRepositoryAdapter,
      ],
    },
  ],
  exports: [
    // ExpenseCreatedHandler
    TaxReportPdfRequestedHandler,
  ],
})
export class TaxWorkerModule {}
