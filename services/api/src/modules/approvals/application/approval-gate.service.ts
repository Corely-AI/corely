import { BadRequestException, Injectable, Inject } from "@nestjs/common";
import { type ApprovalPolicyInput, type ApprovalRules } from "@corely/contracts";
import { AUDIT_PORT, OUTBOX_PORT } from "@corely/kernel";
import type { AuditPort, OutboxPort } from "@corely/kernel";
import { WorkflowService } from "../../workflow/application/workflow.service";
import { IdempotencyService } from "../../../shared/infrastructure/idempotency/idempotency.service";
import { ApprovalPolicyService } from "./approval-policy.service";
import { ApprovalWorkflowEvents } from "./approval-spec.builder";
import {
  APPROVAL_DOMAIN_EVENT_REPOSITORY_TOKEN,
  type ApprovalDomainEventRepositoryPort,
} from "./ports/approval-domain-event-repository.port";

interface ApprovalGateRequest {
  tenantId: string;
  userId: string;
  actionKey: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

type ApprovalGateResult = {
  status: "APPROVED" | "PENDING" | "REJECTED";
  reason?: string;
  instanceId?: string;
  policyId?: string;
};

@Injectable()
export class ApprovalGateService {
  constructor(
    private readonly policies: ApprovalPolicyService,
    private readonly workflows: WorkflowService,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT)
    private readonly outbox: OutboxPort,
    @Inject(APPROVAL_DOMAIN_EVENT_REPOSITORY_TOKEN)
    private readonly domainEvents: ApprovalDomainEventRepositoryPort,
    private readonly idempotency: IdempotencyService
  ) {}

  async requireApproval(input: ApprovalGateRequest): Promise<ApprovalGateResult> {
    const start = await this.idempotency.startOrReplay({
      actionKey: `approvalGate:${input.actionKey}`,
      tenantId: input.tenantId,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      requestHash: JSON.stringify({
        actionKey: input.actionKey,
        entityId: input.entityId,
        payload: input.payload,
      }),
    });

    if (start.mode === "REPLAY") {
      return start.responseBody as ApprovalGateResult;
    }

    if (start.mode === "FAILED") {
      return start.responseBody as ApprovalGateResult;
    }

    if (start.mode === "IN_PROGRESS") {
      return { status: "PENDING", reason: "idempotency_in_progress" };
    }

    if (start.mode === "MISMATCH") {
      throw new BadRequestException("Idempotency key reuse with different payload");
    }

    const policy = await this.policies.findActivePolicyByKey(input.tenantId, input.actionKey);
    if (!policy) {
      await this.audit.log({
        tenantId: input.tenantId,
        userId: input.userId,
        action: "approval.gate.skipped",
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: { actionKey: input.actionKey, reason: "no_policy" },
      });

      const approvedResult: ApprovalGateResult = { status: "APPROVED", reason: "no_policy" };
      await this.idempotency.complete({
        actionKey: `approvalGate:${input.actionKey}`,
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        responseStatus: 200,
        responseBody: approvedResult,
      });

      return approvedResult;
    }

    const spec = JSON.parse(policy.spec) as { meta?: { policy?: ApprovalPolicyInput } };
    const rules = (spec.meta?.policy?.rules ?? null) as ApprovalRules | null;

    if (rules && !evaluateRules(rules, input.payload)) {
      await this.audit.log({
        tenantId: input.tenantId,
        userId: input.userId,
        action: "approval.gate.skipped",
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: { actionKey: input.actionKey, reason: "rules_not_matched" },
      });

      const approvedResult: ApprovalGateResult = {
        status: "APPROVED",
        reason: "rules_not_matched",
      };
      await this.idempotency.complete({
        actionKey: `approvalGate:${input.actionKey}`,
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        responseStatus: 200,
        responseBody: approvedResult,
      });

      return approvedResult;
    }

    const instance = await this.workflows.startInstance(input.tenantId, {
      definitionId: policy.id,
      businessKey: `${input.actionKey}:${input.entityId}`,
      context: {
        actionKey: input.actionKey,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload,
        requestedBy: input.userId,
      },
      startEvent: {
        type: ApprovalWorkflowEvents.REQUESTED,
        payload: {
          actionKey: input.actionKey,
          entityId: input.entityId,
          payload: input.payload,
        },
      },
    });

    const normalized = normalizeApprovalInstance(instance.status, instance.currentState ?? null);
    if (normalized.status === "APPROVED" || normalized.status === "REJECTED") {
      const completedResult: ApprovalGateResult = {
        ...normalized,
        instanceId: instance.id,
        policyId: policy.id,
      };
      await this.idempotency.complete({
        actionKey: `approvalGate:${input.actionKey}`,
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        responseStatus: normalized.status === "APPROVED" ? 200 : 409,
        responseBody: completedResult,
      });
      return completedResult;
    }

    // Only emit "requested" side effects once, right after workflow creation.
    if ((instance.currentState ?? "start") === "start") {
      await this.audit.log({
        tenantId: input.tenantId,
        userId: input.userId,
        action: "approval.requested",
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: { actionKey: input.actionKey, instanceId: instance.id },
      });

      await this.domainEvents.append({
        tenantId: input.tenantId,
        eventType: "approval.requested",
        payload: JSON.stringify({
          actionKey: input.actionKey,
          instanceId: instance.id,
          entityId: input.entityId,
        }),
      });

      await this.outbox.enqueue({
        tenantId: input.tenantId,
        eventType: "approval.requested",
        payload: {
          actionKey: input.actionKey,
          instanceId: instance.id,
          entityId: input.entityId,
        },
        correlationId: instance.id,
      });
    }

    const pendingResult: ApprovalGateResult = {
      status: "PENDING",
      instanceId: instance.id,
      policyId: policy.id,
    };

    await this.idempotency.complete({
      actionKey: `approvalGate:${input.actionKey}`,
      tenantId: input.tenantId,
      idempotencyKey: input.idempotencyKey,
      responseStatus: 202,
      responseBody: pendingResult,
    });

    return pendingResult;
  }
}

function normalizeApprovalInstance(
  workflowStatus: string,
  currentState: string | null
): Pick<ApprovalGateResult, "status" | "reason"> {
  const state = (currentState ?? "").toLowerCase();
  if (workflowStatus === "COMPLETED") {
    if (state === "approved") {
      return { status: "APPROVED", reason: "already_approved" };
    }
    if (state === "rejected") {
      return { status: "REJECTED", reason: "already_rejected" };
    }
  }

  if (workflowStatus === "FAILED" || workflowStatus === "CANCELLED") {
    return { status: "REJECTED", reason: "workflow_not_active" };
  }

  return { status: "PENDING" };
}

function evaluateRules(rules: ApprovalRules, payload: Record<string, unknown>): boolean {
  const allRules = rules.all ?? [];
  const anyRules = rules.any ?? [];

  const allMatch = allRules.length === 0 || allRules.every((rule) => matchRule(rule, payload));
  const anyMatch = anyRules.length === 0 || anyRules.some((rule) => matchRule(rule, payload));

  return allMatch && anyMatch;
}

function matchRule(rule: ApprovalRules["all"][number], payload: Record<string, unknown>): boolean {
  const value = getValueByPath(payload, rule.field);

  switch (rule.operator) {
    case "exists":
      return value !== undefined && value !== null;
    case "eq":
      return value === rule.value;
    case "neq":
      return value !== rule.value;
    case "gt":
      return typeof value === "number" && typeof rule.value === "number" && value > rule.value;
    case "gte":
      return typeof value === "number" && typeof rule.value === "number" && value >= rule.value;
    case "lt":
      return typeof value === "number" && typeof rule.value === "number" && value < rule.value;
    case "lte":
      return typeof value === "number" && typeof rule.value === "number" && value <= rule.value;
    case "in":
      return Array.isArray(rule.value) && rule.value.includes(value);
    case "contains":
      if (Array.isArray(value)) {
        return value.includes(rule.value);
      }
      if (typeof value === "string" && typeof rule.value === "string") {
        return value.includes(rule.value);
      }
      return false;
    default:
      return false;
  }
}

function getValueByPath(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, payload);
}
