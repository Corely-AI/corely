import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { TaxReportPdfRequestedHandler } from "./handlers/tax-report-pdf-requested.handler";
import { TaxReportEricJobRequestedHandler } from "./handlers/tax-report-eric-job-requested.handler";
import { TaxPdfRenderer } from "./pdf/tax-pdf-renderer";
import {
  AUDIT_PORT,
  OBJECT_STORAGE_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type ObjectStoragePort,
  type OutboxPort,
} from "@corely/kernel";
import { PrismaTaxReportRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-report-repo.adapter";
import { PrismaVatPeriodQueryAdapter } from "@/modules/tax/infrastructure/prisma/prisma-vat-period-query.adapter";
import { PrismaTaxProfileRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-profile-repo.adapter";
import { PrismaTaxEricJobRepoAdapter } from "@/modules/tax/infrastructure/prisma/prisma-tax-eric-job-repo.adapter";
import { HttpTaxElsterGatewayAdapter } from "@/modules/tax/infrastructure/eric/http-tax-elster-gateway.adapter";
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
    HttpTaxElsterGatewayAdapter,
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
        reportRepo: PrismaTaxReportRepoAdapter,
        gateway: HttpTaxElsterGatewayAdapter,
        storage: ObjectStoragePort,
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        audit: AuditPort,
        outbox: OutboxPort
      ) =>
        new TaxReportEricJobRequestedHandler(
          ericJobRepo,
          reportRepo,
          gateway,
          storage,
          documentRepo,
          fileRepo,
          audit,
          outbox
        ),
      inject: [
        PrismaTaxEricJobRepoAdapter,
        PrismaTaxReportRepoAdapter,
        HttpTaxElsterGatewayAdapter,
        OBJECT_STORAGE_PORT,
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        AUDIT_PORT,
        OUTBOX_PORT,
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
