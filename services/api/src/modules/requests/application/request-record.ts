import { OperationalRequestSchema, type OperationalRequest } from "@corely/contracts";
import { z } from "zod";

export const OperationalRequestRecordSchema = OperationalRequestSchema.omit({
  canReadPolicy: true,
  procedure: true,
}).extend({
  procedureId: z.string().uuid().nullable().default(null),
  requesterUserId: z.string(),
  requesterStaffId: z.string(),
  approval: z
    .object({
      policyId: z.string(),
      reviewerUserId: z.string(),
    })
    .nullable(),
});
export type OperationalRequestRecord = Omit<OperationalRequest, "canReadPolicy" | "procedure"> & {
  procedureId?: string | null;
  requesterUserId: string;
  requesterStaffId: string;
  approval: { policyId: string; reviewerUserId: string } | null;
};
