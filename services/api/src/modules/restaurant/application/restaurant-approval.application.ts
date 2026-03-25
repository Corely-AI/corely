import { Injectable } from "@nestjs/common";
import type {
  DecideRestaurantApprovalInput,
  RequestRestaurantDiscountInput,
  RequestRestaurantVoidInput,
  RestaurantApprovalMutationOutput,
} from "@corely/contracts";
import { ConflictError, NotFoundError, type UseCaseContext } from "@corely/kernel";
import { RestaurantOrderAggregate } from "../domain/restaurant-order.aggregate";
import { assertApprovalPending } from "../policies/restaurant.policy";
import { RestaurantApplicationSupport } from "./restaurant-application.support";

@Injectable()
export class RestaurantApprovalApplication {
  constructor(private readonly support: RestaurantApplicationSupport) {}

  async requestVoid(
    input: RequestRestaurantVoidInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.requestApproval("VOID", input, ctx);
  }

  async requestDiscount(
    input: RequestRestaurantDiscountInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.requestApproval("DISCOUNT", input, ctx);
  }

  async approveApproval(
    input: DecideRestaurantApprovalInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.decideApproval("APPROVE", input, ctx);
  }

  async rejectApproval(
    input: DecideRestaurantApprovalInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.decideApproval("REJECT", input, ctx);
  }

  private async requestApproval(
    type: "VOID" | "DISCOUNT",
    input: RequestRestaurantVoidInput | RequestRestaurantDiscountInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.support.withWrite(
      ctx,
      `restaurant.approval.request.${type.toLowerCase()}`,
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const voidInput = type === "VOID" ? (input as RequestRestaurantVoidInput) : null;
        const discountInput =
          type === "DISCOUNT" ? (input as RequestRestaurantDiscountInput) : null;
        const aggregate =
          type === "VOID"
            ? await this.support.requireAggregateForOrderItem(
                tenantId,
                workspaceId,
                voidInput!.orderItemId
              )
            : await this.support.requireAggregate(tenantId, workspaceId, discountInput!.orderId);

        const approval = await this.support.approvalGate.requireApproval({
          tenantId,
          userId,
          actionKey: type === "VOID" ? "restaurant.void" : "restaurant.discount",
          entityType: type === "VOID" ? "RestaurantOrderItem" : "RestaurantOrder",
          entityId: type === "VOID" ? voidInput!.orderItemId : discountInput!.orderId,
          payload:
            type === "VOID"
              ? {
                  reason: voidInput!.reason,
                  orderId: aggregate.order.id,
                  orderItemId: voidInput!.orderItemId,
                }
              : {
                  reason: discountInput!.reason,
                  orderId: discountInput!.orderId,
                  amountCents: discountInput!.amountCents,
                },
          idempotencyKey: input.idempotencyKey,
        });

        const nowIso = new Date().toISOString();
        const domain = new RestaurantOrderAggregate(aggregate.session, aggregate.order);

        const saved = await this.support.uow.withinTransaction(async (tx) => {
          const approvalRequest = await this.support.repo.createApprovalRequest(
            tenantId,
            workspaceId,
            {
              tenantId,
              workspaceId,
              orderId: aggregate.order.id,
              orderItemId: type === "VOID" ? voidInput!.orderItemId : null,
              type,
              status:
                approval.status === "APPROVED"
                  ? "APPLIED"
                  : approval.status === "REJECTED"
                    ? "REJECTED"
                    : "PENDING",
              reason: type === "VOID" ? voidInput!.reason : discountInput!.reason,
              amountCents: type === "DISCOUNT" ? discountInput!.amountCents : null,
              workflowInstanceId: approval.instanceId ?? null,
              requestedByUserId: userId,
              decidedByUserId:
                approval.status === "APPROVED" || approval.status === "REJECTED" ? userId : null,
              decidedAt:
                approval.status === "APPROVED" || approval.status === "REJECTED" ? nowIso : null,
            },
            tx
          );

          const eventType =
            type === "VOID" ? "restaurant.void-requested" : "restaurant.discount-requested";

          if (approval.status === "APPROVED") {
            if (type === "VOID") {
              domain.applyVoid(voidInput!.orderItemId, nowIso);
            } else {
              domain.applyDiscount(discountInput!.amountCents, nowIso);
            }
            const persisted = await this.support.repo.saveAggregate(
              tenantId,
              workspaceId,
              { session: domain.session, order: domain.order },
              tx
            );
            await this.support.audit.log(
              {
                tenantId,
                userId,
                action: type === "VOID" ? "restaurant.void.applied" : "restaurant.discount.applied",
                entityType: "RestaurantOrder",
                entityId: persisted.order.id,
                metadata: { approvalRequestId: approvalRequest.id },
              },
              tx
            );
            await this.support.outbox.enqueue(
              {
                tenantId,
                eventType,
                payload: {
                  orderId: persisted.order.id,
                  approvalRequestId: approvalRequest.id,
                  status: approvalRequest.status,
                },
                correlationId: persisted.order.id,
              },
              tx
            );
            return { approvalRequest, aggregate: persisted };
          }

          await this.support.audit.log(
            {
              tenantId,
              userId,
              action:
                type === "VOID" ? "restaurant.void.requested" : "restaurant.discount.requested",
              entityType: "RestaurantOrder",
              entityId: aggregate.order.id,
              metadata: {
                approvalRequestId: approvalRequest.id,
                workflowInstanceId: approval.instanceId ?? null,
              },
            },
            tx
          );
          await this.support.outbox.enqueue(
            {
              tenantId,
              eventType,
              payload: {
                orderId: aggregate.order.id,
                approvalRequestId: approvalRequest.id,
                status: approvalRequest.status,
              },
              correlationId: aggregate.order.id,
            },
            tx
          );
          return { approvalRequest, aggregate };
        });

        return { approvalRequest: saved.approvalRequest, order: saved.aggregate.order };
      }
    );
  }

  private async decideApproval(
    decision: "APPROVE" | "REJECT",
    input: DecideRestaurantApprovalInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.support.withWrite(
      ctx,
      `restaurant.approval.${decision.toLowerCase()}`,
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const approvalRequest = await this.support.repo.findApprovalRequestById(
          tenantId,
          workspaceId,
          input.approvalRequestId
        );
        if (!approvalRequest) {
          throw new NotFoundError("RESTAURANT_APPROVAL_NOT_FOUND", "Approval request not found");
        }
        assertApprovalPending(approvalRequest);
        if (!approvalRequest.workflowInstanceId) {
          throw new ConflictError(
            "RESTAURANT_APPROVAL_WORKFLOW_MISSING",
            "Approval request is not tied to a workflow instance"
          );
        }

        const tasks = await this.support.workflows.listTasks(
          tenantId,
          approvalRequest.workflowInstanceId
        );
        const pendingTask = tasks.find(
          (task) => task.status === "PENDING" && task.type === "HUMAN"
        );
        if (!pendingTask) {
          throw new ConflictError(
            "RESTAURANT_APPROVAL_TASK_MISSING",
            "No pending approval task could be found"
          );
        }

        await this.support.approvalRequests.decideTask(tenantId, userId, pendingTask.id, {
          decision,
          comment: input.comment,
        });

        const aggregate = await this.support.requireAggregate(
          tenantId,
          workspaceId,
          approvalRequest.orderId
        );
        const domain = new RestaurantOrderAggregate(aggregate.session, aggregate.order);
        const nowIso = new Date().toISOString();
        if (decision === "APPROVE") {
          if (approvalRequest.type === "VOID") {
            if (!approvalRequest.orderItemId) {
              throw new ConflictError(
                "RESTAURANT_APPROVAL_TARGET_INVALID",
                "Void approval is missing order item target"
              );
            }
            domain.applyVoid(approvalRequest.orderItemId, nowIso);
          } else {
            domain.applyDiscount(approvalRequest.amountCents ?? 0, nowIso);
          }
        }

        const saved = await this.support.uow.withinTransaction(async (tx) => {
          const nextApproval = await this.support.repo.updateApprovalRequest(
            tenantId,
            workspaceId,
            approvalRequest.id,
            {
              status: decision === "APPROVE" ? "APPLIED" : "REJECTED",
              decidedAt: nowIso,
              decidedByUserId: userId,
            },
            tx
          );
          if (!nextApproval) {
            throw new NotFoundError("RESTAURANT_APPROVAL_NOT_FOUND", "Approval request not found");
          }

          const nextAggregate =
            decision === "APPROVE"
              ? await this.support.repo.saveAggregate(
                  tenantId,
                  workspaceId,
                  { session: domain.session, order: domain.order },
                  tx
                )
              : aggregate;

          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: `restaurant.approval.${decision.toLowerCase()}`,
              entityType: "RestaurantApprovalRequest",
              entityId: nextApproval.id,
              metadata: { orderId: nextApproval.orderId, type: nextApproval.type },
            },
            tx
          );
          return { nextApproval, nextAggregate };
        });

        return { approvalRequest: saved.nextApproval, order: saved.nextAggregate.order };
      }
    );
  }
}
