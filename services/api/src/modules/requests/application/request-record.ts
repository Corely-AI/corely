import { OperationalRequestSchema, type OperationalRequest } from "@corely/contracts";
import { z } from "zod";

export const OperationalRequestRecordSchema = OperationalRequestSchema.omit({
  canReadPolicy: true,
  actions: true,
  procedure: true,
}).extend({
  procedureId: z.string().uuid().nullable().default(null),
  requesterUserId: z.string(),
  requesterStaffId: z.string(),
  applicationAbsenceId: z.string().nullable().default(null),
  approval: z
    .object({
      policyId: z.string(),
      reviewerUserId: z.string(),
    })
    .nullable(),
});
export type OperationalRequestRecord = Omit<OperationalRequest, "canReadPolicy" | "actions" | "procedure"> & {
  procedureId?: string | null;
  requesterUserId: string;
  requesterStaffId: string;
  applicationAbsenceId: string | null;
  approval: { policyId: string; reviewerUserId: string } | null;
};
