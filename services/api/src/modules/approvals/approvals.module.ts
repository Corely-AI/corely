import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { BookingModule } from "../booking";
import { NotificationsModule } from "../notifications/public/appointment-delivery";
import { WorkspacesModule } from "../workspaces";
import { IdentityModule } from "../identity";
import { ApprovalsPolicyController } from "./adapters/http/approvals-policy.controller";
import { ApprovalsRequestsController } from "./adapters/http/approvals-requests.controller";
import { ApprovalPolicyService } from "./application/approval-policy.service";
import { ApprovalGateService } from "./application/approval-gate.service";
import { ApprovalRequestService } from "./application/approval-request.service";
import { WorkflowModule } from "../workflow";
import { IdempotencyService } from "../../shared/infrastructure/idempotency/idempotency.service";

import { APPROVAL_POLICY_REPOSITORY_TOKEN } from "./application/ports/approval-policy-repository.port";
import { PrismaApprovalPolicyRepository } from "./infrastructure/repositories/prisma-approval-policy-repository";
import { APPROVAL_REQUEST_REPOSITORY_TOKEN } from "./application/ports/approval-request-repository.port";
import { PrismaApprovalRequestRepository } from "./infrastructure/repositories/prisma-approval-request-repository";
import { APPROVAL_TASK_REPOSITORY_TOKEN } from "./application/ports/approval-task-repository.port";
import { PrismaApprovalTaskRepository } from "./infrastructure/repositories/prisma-approval-task-repository";
import { APPROVAL_DOMAIN_EVENT_REPOSITORY_TOKEN } from "./application/ports/approval-domain-event-repository.port";
import { PrismaApprovalsDomainEventRepository } from "./infrastructure/repositories/prisma-approval-domain-event-repository";
import { APPOINTMENT_REVIEW_STORE } from "./application/ports/appointment-review.port";
import { AppointmentReviewUseCase } from "./application/appointment-review.usecase";
import { AppointmentReviewController } from "./adapters/http/appointment-review.controller";
import { CliAppointmentController } from "./adapters/http/cli-appointment.controller";
import { PrismaAppointmentReviewStore } from "./infrastructure/repositories/prisma-appointment-review.store";

@Module({
  imports: [
    DataModule,
    KernelModule,
    WorkflowModule,
    IdentityModule,
    BookingModule,
    NotificationsModule,
    WorkspacesModule,
  ],
  controllers: [
    ApprovalsPolicyController,
    ApprovalsRequestsController,
    AppointmentReviewController,
    CliAppointmentController,
  ],
  providers: [
    ApprovalPolicyService,
    ApprovalGateService,
    ApprovalRequestService,
    IdempotencyService,
    AppointmentReviewUseCase,
    { provide: APPOINTMENT_REVIEW_STORE, useClass: PrismaAppointmentReviewStore },
    {
      provide: APPROVAL_POLICY_REPOSITORY_TOKEN,
      useClass: PrismaApprovalPolicyRepository,
    },
    {
      provide: APPROVAL_REQUEST_REPOSITORY_TOKEN,
      useClass: PrismaApprovalRequestRepository,
    },
    {
      provide: APPROVAL_TASK_REPOSITORY_TOKEN,
      useClass: PrismaApprovalTaskRepository,
    },
    {
      provide: APPROVAL_DOMAIN_EVENT_REPOSITORY_TOKEN,
      useClass: PrismaApprovalsDomainEventRepository,
    },
  ],
  exports: [
    ApprovalGateService,
    ApprovalPolicyService,
    ApprovalRequestService,
    AppointmentReviewUseCase,
  ],
})
export class ApprovalsModule {}
