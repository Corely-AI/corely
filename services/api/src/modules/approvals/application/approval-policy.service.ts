import { BadRequestException, Injectable, Logger, NotFoundException, Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  type ApprovalPolicyInput,
  ApprovalPolicyInputSchema,
  OperationalRequestApprovalKeyPrefix,
  type OperationalRequestKind,
  WorkflowDefinitionStatusSchema,
} from "@corely/contracts";
import {
  APPROVAL_POLICY_REPOSITORY_TOKEN,
  type ApprovalPolicyRepositoryPort,
} from "./ports/approval-policy-repository.port";
import { buildApprovalWorkflowSpec } from "./approval-spec.builder";
import type { TransactionContext } from "@corely/kernel";

const APPROVAL_KEY_PREFIX = "approval.";

@Injectable()
export class ApprovalPolicyService {
  private readonly logger = new Logger(ApprovalPolicyService.name);

  constructor(
    @Inject(APPROVAL_POLICY_REPOSITORY_TOKEN)
    private readonly definitions: ApprovalPolicyRepositoryPort
  ) {}

  async createPolicy(tenantId: string, input: ApprovalPolicyInput, createdBy?: string) {
    const key = input.key.startsWith(APPROVAL_KEY_PREFIX)
      ? input.key
      : `${APPROVAL_KEY_PREFIX}${input.key}`;
    if (key.startsWith(OperationalRequestApprovalKeyPrefix)) {
      throw new BadRequestException("Use workspace request routing to configure this policy");
    }
    return this.persistPolicy(tenantId, input, createdBy);
  }

  createOperationalReviewPolicy(
    tenantId: string,
    kind: OperationalRequestKind,
    reviewerUserId: string,
    createdBy: string,
    tx: TransactionContext
  ) {
    return this.persistPolicy(
      tenantId,
      {
        key: `${OperationalRequestApprovalKeyPrefix}${randomUUID()}`,
        name: `Operational request reviewer: ${kind}`,
        steps: [{ name: "Review request", assigneeUserId: reviewerUserId }],
      },
      createdBy,
      tx
    );
  }

  private async persistPolicy(
    tenantId: string,
    input: ApprovalPolicyInput,
    createdBy?: string,
    tx?: TransactionContext
  ) {
    const policy = ApprovalPolicyInputSchema.parse(input);
    const key = policy.key.startsWith(APPROVAL_KEY_PREFIX)
      ? policy.key
      : `${APPROVAL_KEY_PREFIX}${policy.key}`;

    const latest = await this.definitions.findLatestByKey(tenantId, key, tx);
    const nextVersion = latest ? latest.version + 1 : 1;
    const spec = buildApprovalWorkflowSpec({ ...policy, key });

    const definition = await this.definitions.create(
      {
        tenantId,
        key,
        version: nextVersion,
        name: policy.name,
        description: policy.description ?? null,
        type: "APPROVAL",
        status: policy.status ?? "ACTIVE",
        spec: JSON.stringify(spec),
        createdBy: createdBy ?? null,
      },
      tx
    );

    this.logger.log(
      JSON.stringify({
        message: "approval.policy.created",
        tenantId,
        policyKey: key,
        definitionId: definition.id,
      })
    );

    return definition;
  }

  async listPolicies(tenantId: string, status?: string, key?: string) {
    const prefix = key
      ? key.startsWith(APPROVAL_KEY_PREFIX)
        ? key
        : `${APPROVAL_KEY_PREFIX}${key}`
      : APPROVAL_KEY_PREFIX;
    const normalizedStatus = status ? WorkflowDefinitionStatusSchema.parse(status) : undefined;
    const policies = await this.definitions.listByKeyPrefix(
      tenantId,
      prefix,
      normalizedStatus,
      "APPROVAL"
    );
    return policies.filter(({ key }) => !key.startsWith(OperationalRequestApprovalKeyPrefix));
  }

  async getPolicy(tenantId: string, id: string) {
    const definition = await this.definitions.findById(tenantId, id);
    if (!definition || definition.key.startsWith(OperationalRequestApprovalKeyPrefix)) {
      throw new NotFoundException("Approval policy not found");
    }
    return definition;
  }

  async setPolicyStatus(tenantId: string, id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    await this.getPolicy(tenantId, id);
    const result = await this.definitions.updateStatus(tenantId, id, status);
    if (result.count === 0) {
      throw new NotFoundException("Approval policy not found");
    }
    return result;
  }

  async findActiveOperationalReviewPolicy(tenantId: string, id: string, tx?: TransactionContext) {
    const definition = await this.definitions.findById(tenantId, id, tx);
    return definition?.type === "APPROVAL" &&
      definition.status === "ACTIVE" &&
      definition.key.startsWith(OperationalRequestApprovalKeyPrefix)
      ? definition
      : null;
  }

  async findActivePolicyByKey(tenantId: string, key: string) {
    const lookupKey = key.startsWith(APPROVAL_KEY_PREFIX) ? key : `${APPROVAL_KEY_PREFIX}${key}`;
    return lookupKey.startsWith(OperationalRequestApprovalKeyPrefix)
      ? null
      : this.definitions.findActiveByKey(tenantId, lookupKey);
  }
}
