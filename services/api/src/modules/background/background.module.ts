import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { StorageModule as BackgroundStorageModule } from "./runtime/modules/storage/storage.module";
import { OutboxModule as BackgroundOutboxModule } from "./runtime/modules/outbox/outbox.module";
import { WorkflowsModule as BackgroundWorkflowsModule } from "./runtime/modules/workflows/workflows.module";
import { InvoicesWorkerModule as BackgroundInvoicesModule } from "./runtime/modules/invoices/invoices-worker.module";
import { BillingWorkerModule as BackgroundBillingModule } from "./runtime/modules/billing/billing-worker.module";
import { CoachingWorkerModule as BackgroundCoachingModule } from "./runtime/modules/coaching/coaching-worker.module";
import { BackgroundInternalController } from "./background-internal.controller";
import { BackgroundInternalGuard } from "./background-internal.guard";

@Module({
  imports: [
    DataModule,
    BackgroundStorageModule,
    BackgroundOutboxModule,
    BackgroundWorkflowsModule,
    BackgroundInvoicesModule,
    BackgroundBillingModule,
    BackgroundCoachingModule,
  ],
  controllers: [BackgroundInternalController],
  providers: [BackgroundInternalGuard],
})
export class BackgroundModule {}
