import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { InvoiceReminderRunnerService } from "./invoice-reminder-runner.service";

@Module({
  imports: [DataModule],
  providers: [InvoiceReminderRunnerService],
})
export class InvoicesWorkerModule {}
