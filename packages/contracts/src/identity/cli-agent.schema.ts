import { z } from "zod";

export const CliGrantScopeSchema = z
  .object({
    tenantId: z.string().min(1).max(128),
    workspaceId: z.string().min(1).max(128),
  })
  .strict();
export const CliAgentIdSchema = z.string().uuid();
export const CliAgentFingerprintSchema = z.string().regex(/^[0-9a-f]{64}$/);
export const CliOperationIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/)
  .max(80);
export const CliGrantInputSchema = CliGrantScopeSchema.extend({
  agentId: CliAgentIdSchema,
  name: z.string().trim().min(1).max(80),
  fingerprint: CliAgentFingerprintSchema,
  operations: z.array(CliOperationIdSchema).min(1).max(30),
  durationMinutes: z.number().int().min(1).max(60),
}).strict();
export const CliGrantSchema = CliGrantScopeSchema.extend({
  agentId: CliAgentIdSchema,
  name: z.string(),
  delegatorId: z.string(),
  operations: z.array(CliOperationIdSchema),
  expiresAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
}).strict();
export type CliGrantScope = z.infer<typeof CliGrantScopeSchema>;
export type CliGrantInput = z.infer<typeof CliGrantInputSchema>;
export type CliGrant = z.infer<typeof CliGrantSchema>;
export const CliCapabilitySchema = z
  .object({
    id: CliOperationIdSchema,
    description: z.string(),
    inputSchema: z.record(z.unknown()),
  })
  .strict();

export function cliAgentProof(scope: CliGrantScope, agentId: string, secret: string): string {
  return JSON.stringify([scope.tenantId, scope.workspaceId, agentId, secret]);
}
