import { Module } from "@nestjs/common";
import { EnvModule } from "@corely/config";
import { DataModule } from "@corely/data";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";

import { AccountingWorkerModule } from "./modules/accounting/accounting-worker.module";
import { TaxWorkerModule } from "./modules/tax/tax-worker.module";
import { ClassesWorkerModule } from "./modules/classes/classes-worker.module";
import { InvoicesWorkerModule } from "./modules/invoices/invoices-worker.module";

@Module({
  imports: [
    // Config must be first to validate env before other modules use it
    EnvModule.forRoot(),
    DataModule,
    OutboxModule,
    WorkflowsModule,
    AccountingWorkerModule,
    TaxWorkerModule,
    ClassesWorkerModule,
    InvoicesWorkerModule,
  ],
})
export class WorkerModule {}
