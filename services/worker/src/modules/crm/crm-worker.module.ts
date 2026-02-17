import { Module } from "@nestjs/common";
import { EnvModule } from "@corely/config";
import { SequenceRunnerService } from "./sequence-runner.service";

@Module({
  imports: [EnvModule],
  providers: [SequenceRunnerService],
  exports: [SequenceRunnerService],
})
export class CrmWorkerModule {}
