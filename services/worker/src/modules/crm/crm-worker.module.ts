import { Module } from "@nestjs/common";
import { EnvModule } from "@corely/config";
import { CrmSequenceExecutorService } from "./crm-sequence-executor.service";
import { CrmSequencesInternalController } from "./crm-sequences-internal.controller";
import { SequencesSweeperRunnerService } from "./sequences-sweeper.runner";

@Module({
  imports: [EnvModule],
  controllers: [CrmSequencesInternalController],
  providers: [CrmSequenceExecutorService, SequencesSweeperRunnerService],
  exports: [SequencesSweeperRunnerService],
})
export class CrmWorkerModule {}
