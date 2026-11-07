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
  imports: [DataModule, IdentityModule, PeopleModule, PlatformModule],
  controllers: [EmployeeTasksController],
  providers: [
    EmployeeTasksUseCase,
    ExtTaskRepositoryAdapter,
    { provide: TASK_REPOSITORY, useExisting: ExtTaskRepositoryAdapter },
  ],
})
export class TasksModule {}
