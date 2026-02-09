import { Module } from "@nestjs/common";
import { EnvModule } from "@corely/config";
import { DataModule } from "@corely/data";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";

import { AccountingWorkerModule } from "./modules/accounting/accounting-worker.module";
import { TaxWorkerModule } from "./modules/tax/tax-worker.module";
import { ClassesWorkerModule } from "./modules/classes/classes-worker.module";
import { InvoicesWorkerModule } from "./modules/invoices/invoices-worker.module";
import { FormsWorkerModule } from "./modules/forms/forms-worker.module";

import { TickOrchestrator } from "./application/tick-orchestrator.service";
import { JobLockService } from "./infrastructure/job-lock.service";
import { InternalWorkerController } from "./application/internal-worker.controller";

import { StorageModule } from "./modules/storage/storage.module";

@Module({
  controllers: [InternalWorkerController],
  imports: [
    // Config must be first to validate env before other modules use it
    EnvModule.forRoot(),
    DataModule,
    OutboxModule,
    StorageModule,
    WorkflowsModule,
    AccountingWorkerModule,
    TaxWorkerModule,
    ClassesWorkerModule,
    InvoicesWorkerModule,
    FormsWorkerModule,
  ],
  providers: [TickOrchestrator, JobLockService],
})
export class WorkerModule {}
