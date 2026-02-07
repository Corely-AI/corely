import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { MonthlyBillingRunnerService } from "./monthly-billing-runner.service";

@Module({
  imports: [DataModule],
  providers: [MonthlyBillingRunnerService],
})
export class ClassesWorkerModule {}
