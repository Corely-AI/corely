import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const LineCategorizationSchema = z.object({
  lineId: z.string().optional(),
  lineIndex: z.number().int().nonnegative(),
  category: z.string().optional(),
  glAccountId: z.string().optional(),
  glAccountName: z.string().optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export const LineCategorizationCardSchema = z.object({
  ok: z.literal(true),
  lines: z.array(LineCategorizationSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type LineCategorizationCard = z.infer<typeof LineCategorizationCardSchema>;
