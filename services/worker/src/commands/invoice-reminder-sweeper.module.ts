import { Module } from "@nestjs/common";
import { EnvModule } from "@corely/config";
import { DataModule } from "@corely/data";
import { InvoiceReminderRunnerService } from "../modules/invoices/invoice-reminder-runner.service";

@Module({
  imports: [EnvModule.forRoot(), DataModule],
  providers: [InvoiceReminderRunnerService],
})
export class InvoiceReminderSweeperModule {}
