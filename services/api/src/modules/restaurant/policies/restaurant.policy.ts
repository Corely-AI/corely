import { ConflictError, ValidationError, type UseCaseContext } from "@corely/kernel";
import type { KitchenTicketStatus, RestaurantApprovalRequest } from "@corely/contracts";

export function assertRestaurantContext(ctx: UseCaseContext): {
  tenantId: string;
  workspaceId: string;
  userId: string;
} {
  const tenantId = ctx.tenantId ?? null;
  const workspaceId = ctx.workspaceId ?? ctx.tenantId ?? null;
  const userId = ctx.userId ?? null;

  if (!tenantId || !workspaceId || !userId) {
    throw new ValidationError("Missing tenant, workspace, or user context");
  }

  return { tenantId, workspaceId, userId };
}

export function assertKitchenStatusTransition(
  current: KitchenTicketStatus,
  next: KitchenTicketStatus
): void {
  const allowed: Record<KitchenTicketStatus, KitchenTicketStatus[]> = {
    NEW: ["IN_PROGRESS", "DONE", "BUMPED"],
    IN_PROGRESS: ["DONE", "BUMPED"],
    DONE: ["BUMPED"],
    BUMPED: [],
  };

  if (!allowed[current].includes(next)) {
    throw new ConflictError(
      "RESTAURANT_KITCHEN_STATUS_INVALID",
      `Cannot move kitchen ticket from ${current} to ${next}`
    );
  }
}

export function assertApprovalPending(request: RestaurantApprovalRequest): void {
  if (request.status !== "PENDING") {
    throw new ConflictError(
      "RESTAURANT_APPROVAL_ALREADY_DECIDED",
      "Approval request is no longer pending"
    );
  }
}
