import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { DataModule } from "@corely/data";
import {
  WORKFLOW_ORCHESTRATOR_QUEUE,
  WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
  WORKFLOW_ORCHESTRATOR_QUEUE_ROUTE,
  type WorkflowOrchestratorQueuePayload,
} from "@corely/contracts";
import { WorkflowDefinitionsController } from "./adapters/http/workflow-definitions.controller";
import { WorkflowInstancesController } from "./adapters/http/workflow-instances.controller";
import { WorkflowTasksController } from "./adapters/http/workflow-tasks.controller";
import { WorkflowService } from "./application/workflow.service";
import { WorkflowQueueClient } from "./infrastructure/workflow-queue.client";
import { createWorkflowQueueAdapter } from "./infrastructure/workflow-queue.provider";
import { PlatformModule } from "../platform";
import { IdentityModule } from "../identity";

import { WORKFLOW_DEFINITION_REPOSITORY_TOKEN } from "./application/ports/workflow-definition-repository.port";
import { PrismaWorkflowDefinitionRepository } from "./infrastructure/repositories/prisma-workflow-definition-repository";
import { WORKFLOW_INSTANCE_REPOSITORY_TOKEN } from "./application/ports/workflow-instance-repository.port";
import { PrismaWorkflowInstanceRepository } from "./infrastructure/repositories/prisma-workflow-instance-repository";
import { WORKFLOW_TASK_REPOSITORY_TOKEN } from "./application/ports/workflow-task-repository.port";
import { PrismaWorkflowTaskRepository } from "./infrastructure/repositories/prisma-workflow-task-repository";
import { WORKFLOW_EVENT_REPOSITORY_TOKEN } from "./application/ports/workflow-event-repository.port";
import { PrismaWorkflowEventRepository } from "./infrastructure/repositories/prisma-workflow-event-repository";

@Module({
  imports: [DataModule, IdentityModule, PlatformModule],
  controllers: [
    WorkflowDefinitionsController,
    WorkflowInstancesController,
    WorkflowTasksController,
  ],
  providers: [
    WorkflowService,
    WorkflowQueueClient,
    {
      provide: WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
      useFactory: (env: EnvService) =>
        createWorkflowQueueAdapter<WorkflowOrchestratorQueuePayload>(
          WORKFLOW_ORCHESTRATOR_QUEUE,
          env,
          WORKFLOW_ORCHESTRATOR_QUEUE_ROUTE
        ),
      inject: [EnvService],
    },
    {
      provide: WORKFLOW_DEFINITION_REPOSITORY_TOKEN,
      useClass: PrismaWorkflowDefinitionRepository,
    },
    {
      provide: WORKFLOW_INSTANCE_REPOSITORY_TOKEN,
      useClass: PrismaWorkflowInstanceRepository,
    },
    {
      provide: WORKFLOW_TASK_REPOSITORY_TOKEN,
      useClass: PrismaWorkflowTaskRepository,
    },
    {
      provide: WORKFLOW_EVENT_REPOSITORY_TOKEN,
      useClass: PrismaWorkflowEventRepository,
    },
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
