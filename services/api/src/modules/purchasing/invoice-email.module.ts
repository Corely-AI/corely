import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { EnvService } from "@corely/config";
import {
  AUDIT_PORT,
  UNIT_OF_WORK,
  type AuditPort,
  type ClockPort,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { DocumentsModule } from "../documents";
import { VENDOR_BILL_DOCUMENTS, type VendorBillDocumentsPort } from "../documents/public";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { WorkspacesModule } from "../workspaces";
import { WORKSPACE_REPOSITORY_PORT, type WorkspaceRepositoryPort } from "../workspaces/public";
import { InvoiceEmailController } from "./adapters/http/invoice-email.controller";
import { InvoiceEmailWebhookController } from "./adapters/http/invoice-email-webhook.controller";
import { InvoiceEmailIntake } from "./application/invoice-email-intake";
import { InvoiceEmailSettingsAdapter } from "./infrastructure/adapters/invoice-email-settings.adapter";
import { PrismaVendorBillRepository } from "./infrastructure/adapters/prisma-vendor-bill-repository.adapter";
import { ResendInvoiceAttachmentAdapter } from "./infrastructure/adapters/resend-invoice-attachment.adapter";

@Module({
  imports: [
    DataModule,
    KernelModule,
    IdentityModule,
    PlatformModule,
    DocumentsModule,
    WorkspacesModule,
  ],
  controllers: [InvoiceEmailController, InvoiceEmailWebhookController],
  providers: [
    PrismaVendorBillRepository,
    InvoiceEmailSettingsAdapter,
    ResendInvoiceAttachmentAdapter,
    {
      provide: InvoiceEmailIntake,
      useFactory: (
        bills: PrismaVendorBillRepository,
        documents: VendorBillDocumentsPort,
        settings: InvoiceEmailSettingsAdapter,
        workspaces: Pick<WorkspaceRepositoryPort, "findActiveTenantForWorkspace">,
        provider: ResendInvoiceAttachmentAdapter,
        unitOfWork: UnitOfWorkPort,
        audit: AuditPort,
        clock: ClockPort,
        env: EnvService
      ) =>
        new InvoiceEmailIntake({
          bills,
          documents,
          settings,
          findActiveTenant: (id) => workspaces.findActiveTenantForWorkspace(id),
          download: (emailId, attachmentId) => provider.download(emailId, attachmentId),
          unitOfWork,
          audit,
          clock,
          logger: new NestLoggerAdapter(),
          domain:
            env.INVOICE_EMAIL_RESEND_WEBHOOK_SECRET && env.RESEND_API_KEY
              ? env.INVOICE_EMAIL_DOMAIN
              : undefined,
        }),
      inject: [
        PrismaVendorBillRepository,
        VENDOR_BILL_DOCUMENTS,
        InvoiceEmailSettingsAdapter,
        WORKSPACE_REPOSITORY_PORT,
        ResendInvoiceAttachmentAdapter,
        UNIT_OF_WORK,
        AUDIT_PORT,
        CLOCK_PORT_TOKEN,
        EnvService,
      ],
    },
  ],
})
export class InvoiceEmailModule {}
