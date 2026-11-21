import { z } from "zod";

export const TenantAdminSessionSchema = z.object({
  accessToken: z.string().min(1),
  tenantId: z.string().min(1),
  tenantName: z.string().min(1),
});

export type TenantAdminSession = z.infer<typeof TenantAdminSessionSchema>;
