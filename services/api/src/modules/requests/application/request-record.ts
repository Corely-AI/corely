import { OperationalRequestSchema, type OperationalRequest } from "@corely/contracts";
import { z } from "zod";

export const OperationalRequestRecordSchema = OperationalRequestSchema.omit({
  canReadPolicy: true,
}).extend({
  requesterUserId: z.string(),
  requesterStaffId: z.string(),
  approval: z
    .object({
      policyId: z.string(),
      reviewerUserId: z.string(),
    })
    .nullable(),
});
export type OperationalRequestRecord = Omit<OperationalRequest, "canReadPolicy"> & {
  requesterUserId: string;
  requesterStaffId: string;
  approval: { policyId: string; reviewerUserId: string } | null;
};
