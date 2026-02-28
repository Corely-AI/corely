import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { DocumentsModule } from "../documents/documents.module";
import { DocumentsApplication } from "../documents/application/documents.application";
import { CashManagementController } from "./http/cash-management.controller";
import {
  CASH_ATTACHMENT_REPO,
  CASH_DAY_CLOSE_REPO,
  CASH_DOCUMENTS_PORT,
  CASH_ENTRY_REPO,
  CASH_EXPORT_PORT,
  CASH_EXPORT_REPO,
  CASH_REGISTER_REPO,
} from "./application/ports/cash-management.ports";
import { PrismaCashRepository } from "./infrastructure/adapters/prisma-cash-repository.adapter";
import { CashDocumentsPortAdapter } from "./infrastructure/documents/documents-port.adapter";
import { CashExportAdapter } from "./infrastructure/exports/cash-export.adapter";
import { ListCashRegistersQueryUseCase } from "./application/use-cases/list-cash-registers.query";
import { GetCashRegisterQueryUseCase } from "./application/use-cases/get-cash-register.query";
import { CreateCashRegisterUseCase } from "./application/use-cases/create-cash-register.usecase";
import { UpdateCashRegisterUseCase } from "./application/use-cases/update-cash-register.usecase";
import { ListCashEntriesQueryUseCase } from "./application/use-cases/list-cash-entries.query";
import { CreateCashEntryUseCase } from "./application/use-cases/create-cash-entry.usecase";
import { ReverseCashEntryUseCase } from "./application/use-cases/reverse-cash-entry.usecase";
import { GetCashDayCloseQueryUseCase } from "./application/use-cases/get-cash-day-close.query";
import { SubmitCashDayCloseUseCase } from "./application/use-cases/submit-cash-day-close.usecase";
import { ListCashDayClosesQueryUseCase } from "./application/use-cases/list-cash-day-closes.query";
import { AttachBelegToCashEntryUseCase } from "./application/use-cases/attach-beleg-to-cash-entry.usecase";
import { ListCashEntryAttachmentsQueryUseCase } from "./application/use-cases/list-cash-entry-attachments.query";
import { ExportCashBookUseCase } from "./application/use-cases/export-cash-book.usecase";
import { GetCashExportArtifactQueryUseCase } from "./application/use-cases/get-cash-export-artifact.query";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, DocumentsModule],
  controllers: [CashManagementController],
  providers: [
    PrismaCashRepository,
    { provide: CASH_REGISTER_REPO, useExisting: PrismaCashRepository },
    { provide: CASH_ENTRY_REPO, useExisting: PrismaCashRepository },
    { provide: CASH_DAY_CLOSE_REPO, useExisting: PrismaCashRepository },
    { provide: CASH_ATTACHMENT_REPO, useExisting: PrismaCashRepository },
    { provide: CASH_EXPORT_REPO, useExisting: PrismaCashRepository },
    {
      provide: CASH_DOCUMENTS_PORT,
      useFactory: (documentsApp: DocumentsApplication) =>
        new CashDocumentsPortAdapter(documentsApp),
      inject: [DocumentsApplication],
    },
    {
      provide: CASH_EXPORT_PORT,
      useClass: CashExportAdapter,
    },
    ListCashRegistersQueryUseCase,
    GetCashRegisterQueryUseCase,
    CreateCashRegisterUseCase,
    UpdateCashRegisterUseCase,
    ListCashEntriesQueryUseCase,
    CreateCashEntryUseCase,
    ReverseCashEntryUseCase,
    GetCashDayCloseQueryUseCase,
    SubmitCashDayCloseUseCase,
    ListCashDayClosesQueryUseCase,
    AttachBelegToCashEntryUseCase,
    ListCashEntryAttachmentsQueryUseCase,
    ExportCashBookUseCase,
    GetCashExportArtifactQueryUseCase,
  ],
  exports: [CreateCashEntryUseCase, CreateCashRegisterUseCase, SubmitCashDayCloseUseCase],
})
export class CashManagementModule {}
