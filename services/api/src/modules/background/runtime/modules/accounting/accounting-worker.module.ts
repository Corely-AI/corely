import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { CashEntryCreatedHandler } from "./handlers/cash-entry-created.handler";

@Module({
  imports: [DataModule],
  providers: [CashEntryCreatedHandler],
  exports: [CashEntryCreatedHandler],
})
export class AccountingWorkerModule {}
