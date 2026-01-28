import { ForbiddenException, Injectable, NotFoundException, Inject } from "@nestjs/common";
import { type ApprovalDecisionInput } from "@corely/contracts";
import { AUDIT_PORT, OUTBOX_PORT } from "@corely/kernel";
import type { AuditPort, OutboxPort } from "@corely/kernel";
import { WorkflowService } from "../../workflow/application/workflow.service";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../../identity/application/ports/membership-repository.port";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../../identity/application/ports/role-permission-grant-repository.port";
import { toAllowedPermissionKeys } from "../../../shared/permissions/effective-permissions";
import {
  APPROVAL_REQUEST_REPOSITORY_TOKEN,
  type ApprovalRequestRepositoryPort,
} from "./ports/approval-request-repository.port";
import {
  APPROVAL_TASK_REPOSITORY_TOKEN,
  type ApprovalTaskRepositoryPort,
} from "./ports/approval-task-repository.port";
import {
  APPROVAL_DOMAIN_EVENT_REPOSITORY_TOKEN,
  type ApprovalDomainEventRepositoryPort,
} from "./ports/approval-domain-event-repository.port";

@Injectable()
export class ApprovalRequestService {
  constructor(
    @Inject(APPROVAL_REQUEST_REPOSITORY_TOKEN)
    private readonly instances: ApprovalRequestRepositoryPort,
    @Inject(APPROVAL_TASK_REPOSITORY_TOKEN)
    private readonly tasks: ApprovalTaskRepositoryPort,
    private readonly workflows: WorkflowService,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT)
    private readonly outbox: OutboxPort,
    @Inject(APPROVAL_DOMAIN_EVENT_REPOSITORY_TOKEN)
    private readonly domainEvents: ApprovalDomainEventRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly memberships: MembershipRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grants: RolePermissionGrantRepositoryPort
  ) {}

  async listRequests(tenantId: string, filters: { status?: string; businessKey?: string }) {
    // Cast status to expected type or let adapter handle it
    return this.instances.list(tenantId, {
      ...filters,
      status: filters.status as any,
      definitionType: "APPROVAL",
    });
  }

  async getRequest(tenantId: string, id: string) {
    const instance = await this.instances.getWithDetails(tenantId, id);
    if (!instance || instance.definition.type !== "APPROVAL") {
      throw new NotFoundException("Approval request not found");
    }
    return instance;
  }

  async listInbox(tenantId: string, userId: string) {
    const membership = await this.memberships.findByTenantAndUser(tenantId, userId);
    const roleId = membership?.getRoleId() ?? null;
    const permissionKeys = roleId ? await this.getAllowedPermissions(tenantId, roleId) : [];

    return this.tasks.listInbox({
      tenantId,
      userId,
      roleId,
      permissionKeys,
      status: "PENDING",
    });
  }

  async decideTask(tenantId: string, userId: string, taskId: string, input: ApprovalDecisionInput) {
    const task = await this.tasks.findById(tenantId, taskId);
    if (!task || task.type !== "HUMAN") {
      throw new NotFoundException("Approval task not found");
    }

    await this.assertAssignee(tenantId, userId, task);

    const events = this.extractDecisionEvents(task.input);
    const eventType = input.decision === "APPROVE" ? events.approve : events.reject;

    await this.workflows.completeTask(tenantId, taskId, {
      output: {
        decision: input.decision,
        comment: input.comment ?? null,
      },
      event: { type: eventType, payload: { taskId, decision: input.decision } },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: `approval.${input.decision.toLowerCase()}`,
      entityType: "Task",
      entityId: taskId,
      metadata: { instanceId: task.instanceId },
    });

    await this.domainEvents.append({
      tenantId,
      eventType: `approval.${input.decision.toLowerCase()}`,
      payload: JSON.stringify({ taskId, instanceId: task.instanceId }),
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: `approval.${input.decision.toLowerCase()}`,
      payload: { taskId, instanceId: task.instanceId },
      correlationId: task.instanceId,
    });

    return { ok: true };
  }

  private async assertAssignee(
    tenantId: string,
    userId: string,
    task: {
      assigneeUserId: string | null;
      assigneeRoleId: string | null;
      assigneePermissionKey: string | null;
    }
  ) {
    if (task.assigneeUserId && task.assigneeUserId === userId) {
      return;
    }

    const membership = await this.memberships.findByTenantAndUser(tenantId, userId);
    const roleId = membership?.getRoleId();

    if (task.assigneeRoleId && roleId && task.assigneeRoleId === roleId) {
      return;
    }

    if (task.assigneePermissionKey && roleId) {
      const permissions = await this.getAllowedPermissions(tenantId, roleId);
      if (permissions.includes(task.assigneePermissionKey)) {
        return;
      }
    }

    throw new ForbiddenException("Not authorized to act on this approval task");
  }

  private extractDecisionEvents(input: string | null) {
    if (!input) {
      return { approve: "APPROVE", reject: "REJECT" };
    }

    try {
      const parsed = JSON.parse(input) as { approveEvent?: string; rejectEvent?: string };
      return {
        approve: parsed.approveEvent ?? "APPROVE",
        reject: parsed.rejectEvent ?? "REJECT",
      };
    } catch {
      return { approve: "APPROVE", reject: "REJECT" };
    }
  }

  private async getAllowedPermissions(tenantId: string, roleId: string): Promise<string[]> {
    const grants = await this.grants.listByRoleIdsAndTenant(tenantId, [roleId]);
    return toAllowedPermissionKeys(grants);
  }
}
