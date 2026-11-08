import { KernelModule } from "../../shared/kernel/kernel.module";
import { RecurringChecklistsController } from "./adapters/http/recurring-checklists.controller";
import { RecurringChecklistsUseCase } from "./application/recurring-checklists.usecase";
import { RecurringGenerationUseCase } from "./application/recurring-generation.usecase";
import { ChecklistMaterializer } from "./application/checklist-materializer";
import { ExtRecurringChecklistAdapter } from "./infrastructure/ext-recurring-checklist.adapter";
import { RECURRING_CHECKLIST_REPOSITORY } from "./application/ports/recurring-checklist-repository.port";
import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity/identity.module";
import { PeopleModule } from "../people/people.module";
import { PlatformModule } from "../platform/platform.module";
import { EmployeeTasksController } from "./adapters/http/employee-tasks.controller";
import { EmployeeTasksUseCase } from "./application/employee-tasks.usecase";
import { TASK_REPOSITORY } from "./application/ports/task-repository.port";
import { ExtTaskRepositoryAdapter } from "./infrastructure/ext-task-repository.adapter";
@Module({
  imports: [KernelModule, DataModule, IdentityModule, PeopleModule, PlatformModule],
  controllers: [RecurringChecklistsController, EmployeeTasksController],
  exports: [RecurringGenerationUseCase],
  providers: [
    RecurringChecklistsUseCase,
    RecurringGenerationUseCase,
    ChecklistMaterializer,
    ExtRecurringChecklistAdapter,
    { provide: RECURRING_CHECKLIST_REPOSITORY, useExisting: ExtRecurringChecklistAdapter },
    EmployeeTasksUseCase,
    ExtTaskRepositoryAdapter,
    { provide: TASK_REPOSITORY, useExisting: ExtTaskRepositoryAdapter },
  ],
})
export class TasksModule {}
