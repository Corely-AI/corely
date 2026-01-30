import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { ExpenseCreatedHandler } from "./handlers/expense-created.handler";

@Module({
  imports: [DataModule],
  providers: [
    // Expense snapshots moved to API for immediate consistency
    // ExpenseCreatedHandler
  ],
  exports: [
    // ExpenseCreatedHandler
  ],
})
export class TaxWorkerModule {}
