import { Inject, Injectable } from "@nestjs/common";
import {
  AUDIT_PORT,
  ConflictError,
  NotFoundError,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  type AuditPort,
  type OutboxPort,
  type UnitOfWorkPort,
  type UseCaseContext,
  ValidationError,
} from "@corely/kernel";
import { IdempotencyService } from "../../../shared/infrastructure/idempotency/idempotency.service";
import { ApprovalGateService } from "../../approvals/application/approval-gate.service";
import { ApprovalRequestService } from "../../approvals/application/approval-request.service";
import { WorkflowService } from "../../workflow/application/workflow.service";
import { assertRestaurantContext } from "../policies/restaurant.policy";
import {
  RESTAURANT_REPOSITORY,
  type RestaurantOrderAggregateRecord,
  type RestaurantRepositoryPort,
} from "./ports/restaurant-repository.port";

export type RestaurantScope = {
  tenantId: string;
  workspaceId: string;
  userId: string;
};

@Injectable()
export class RestaurantApplicationSupport {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    public readonly repo: RestaurantRepositoryPort,
    @Inject(UNIT_OF_WORK)
    public readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT)
    public readonly audit: AuditPort,
    @Inject(OUTBOX_PORT)
    public readonly outbox: OutboxPort,
    public readonly idempotency: IdempotencyService,
    public readonly approvalGate: ApprovalGateService,
    public readonly approvalRequests: ApprovalRequestService,
    public readonly workflows: WorkflowService
  ) {}

  async requireAggregate(
    tenantId: string,
    workspaceId: string,
    orderId: string
  ): Promise<RestaurantOrderAggregateRecord> {
    const aggregate = await this.repo.findOrderById(tenantId, workspaceId, orderId);
    if (!aggregate) {
      throw new NotFoundError("RESTAURANT_ORDER_NOT_FOUND", "Restaurant order not found");
    }
    return aggregate;
  }

  async requireAggregateForOrderItem(
    tenantId: string,
    workspaceId: string,
    orderItemId: string
  ): Promise<RestaurantOrderAggregateRecord> {
    const aggregate = await this.repo.findOrderByOrderItemId(tenantId, workspaceId, orderItemId);
    if (!aggregate) {
      throw new NotFoundError("RESTAURANT_ORDER_ITEM_NOT_FOUND", "Restaurant order item not found");
    }
    return aggregate;
  }

  async withWrite<TPayload extends Record<string, unknown>, TResult>(
    ctx: UseCaseContext,
    actionKey: string,
    idempotencyKey: string,
    payload: TPayload,
    handler: (scope: RestaurantScope) => Promise<TResult>
  ): Promise<TResult> {
    if (!idempotencyKey) {
      throw new ValidationError("Idempotency key is required");
    }
    const scope = assertRestaurantContext(ctx);
    const requestHash = JSON.stringify(payload);
    const start = await this.idempotency.startOrReplay({
      actionKey,
      tenantId: scope.tenantId,
      userId: scope.userId,
      idempotencyKey,
      requestHash,
    });

    if (start.mode === "REPLAY" || start.mode === "FAILED") {
      return start.responseBody as TResult;
    }
    if (start.mode === "IN_PROGRESS") {
      throw new ConflictError(
        "RESTAURANT_REQUEST_IN_PROGRESS",
        "Identical request is already in progress"
      );
    }
    if (start.mode === "MISMATCH") {
      throw new ValidationError("Idempotency key reuse with a different payload");
    }

    try {
      const result = await handler(scope);
      await this.idempotency.complete({
        actionKey,
        tenantId: scope.tenantId,
        idempotencyKey,
        responseStatus: 200,
        responseBody: result,
      });
      return result;
    } catch (error) {
      await this.idempotency.fail({
        actionKey,
        tenantId: scope.tenantId,
        idempotencyKey,
        responseStatus: 409,
        responseBody: {
          message: error instanceof Error ? error.message : "Restaurant mutation failed",
        },
      });
      throw error;
    }
  }
}
