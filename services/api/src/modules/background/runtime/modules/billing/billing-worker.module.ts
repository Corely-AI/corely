import { Module } from "@nestjs/common";
import { BillingModule } from "../../../../billing";
import { TrialExpiryRunnerService } from "./trial-expiry-runner.service";

@Module({
  imports: [BillingModule],
  providers: [TrialExpiryRunnerService],
  exports: [TrialExpiryRunnerService],
})
export class BillingWorkerModule {}
