import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdempotencyService } from "../../shared/infrastructure/idempotency/idempotency.service";
import { ApprovalsModule } from "../approvals";
import { IdentityModule } from "../identity";
import { WorkflowModule } from "../workflow";
import { RestaurantApprovalApplication } from "./application/restaurant-approval.application";
import { RestaurantApplicationSupport } from "./application/restaurant-application.support";
import { RestaurantApplication } from "./application/restaurant.application";
import { RestaurantOrderApplication } from "./application/restaurant-order.application";
import { RESTAURANT_REPOSITORY } from "./application/ports/restaurant-repository.port";
import { RestaurantSetupApplication } from "./application/restaurant-setup.application";
import { RestaurantController } from "./http/restaurant.controller";
import { PrismaRestaurantRepository } from "./infrastructure/prisma-restaurant.repository";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, WorkflowModule, ApprovalsModule],
  controllers: [RestaurantController],
  providers: [
    RestaurantApplication,
    RestaurantApplicationSupport,
    RestaurantSetupApplication,
    RestaurantOrderApplication,
    RestaurantApprovalApplication,
    PrismaRestaurantRepository,
    IdempotencyService,
    {
      provide: RESTAURANT_REPOSITORY,
      useExisting: PrismaRestaurantRepository,
    },
  ],
  exports: [RestaurantApplication],
})
export class RestaurantModule {}
