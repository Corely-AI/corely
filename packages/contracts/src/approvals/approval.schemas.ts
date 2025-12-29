import { z } from "zod";
import { WorkflowDefinitionStatusSchema } from "../workflows/workflow.types";

export const ApprovalRuleOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "contains",
  "exists",
]);

export const ApprovalRuleSchema = z.object({
  field: z.string(),
  operator: ApprovalRuleOperatorSchema,
  value: z.unknown().optional(),
});

export const ApprovalRulesSchema = z.object({
  all: z.array(ApprovalRuleSchema).optional(),
  any: z.array(ApprovalRuleSchema).optional(),
});

export const ApprovalPolicyStepSchema = z.object({
  name: z.string().min(1),
  assigneeUserId: z.string().optional(),
  assigneeRoleId: z.string().optional(),
  assigneePermissionKey: z.string().optional(),
  dueInHours: z.number().int().positive().optional(),
});

export const ApprovalPolicyInputSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: WorkflowDefinitionStatusSchema.optional(),
  rules: ApprovalRulesSchema.optional(),
  steps: z.array(ApprovalPolicyStepSchema).min(1),
});

export const ApprovalDecisionInputSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
});

export const ApprovalPolicySuggestionCardSchema = z.object({
  ok: z.boolean(),
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  rules: ApprovalRulesSchema.optional(),
  steps: z.array(ApprovalPolicyStepSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: z.record(z.unknown()).optional(),
});

export type ApprovalRuleOperator = z.infer<typeof ApprovalRuleOperatorSchema>;
export type ApprovalRule = z.infer<typeof ApprovalRuleSchema>;
export type ApprovalRules = z.infer<typeof ApprovalRulesSchema>;
export type ApprovalPolicyStep = z.infer<typeof ApprovalPolicyStepSchema>;
export type ApprovalPolicyInput = z.infer<typeof ApprovalPolicyInputSchema>;
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionInputSchema>;
export type ApprovalPolicySuggestionCard = z.infer<typeof ApprovalPolicySuggestionCardSchema>;
