import { TaskContextController } from "./adapters/http/task-context.controller";
import { TaskContextUseCase } from "./application/task-context.usecase";
import { ExtTaskContextAdapter } from "./infrastructure/ext-task-context.adapter";
import { TASK_CONTEXT_STORE, TASK_SOURCE_READERS } from "./application/ports/task-context.port";
import { DocumentsModule } from "../documents/documents.module";
import { BookingModule } from "../booking/booking.module";
import { BookingSourceAccess } from "../booking/public";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { PUBLISHED_PROCEDURES, type PublishedProcedureReader } from "../knowledge/public";
import { OperationalRequestsModule } from "../requests/requests.module";
import { OperationalRequestsUseCase } from "../requests/public";
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
  imports: [
    KernelModule,
    DataModule,
    IdentityModule,
    PeopleModule,
    PlatformModule,
    DocumentsModule,
    BookingModule,
    KnowledgeModule,
    OperationalRequestsModule,
  ],
  controllers: [RecurringChecklistsController, EmployeeTasksController, TaskContextController],
  exports: [RecurringGenerationUseCase],
  providers: [
    TaskContextUseCase,
    ExtTaskContextAdapter,
    { provide: TASK_CONTEXT_STORE, useExisting: ExtTaskContextAdapter },
    {
      provide: TASK_SOURCE_READERS,
      useFactory: (
        booking: BookingSourceAccess,
        procedure: PublishedProcedureReader,
        request: OperationalRequestsUseCase
      ) => ({ booking, procedure, request }),
      inject: [BookingSourceAccess, PUBLISHED_PROCEDURES, OperationalRequestsUseCase],
    },
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
