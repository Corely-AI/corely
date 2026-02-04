import type { DefaultRoleKey } from "../../permissions/default-role-grants";

export class FakeTenantRoleSeeder {
  readonly calls: Array<{ tenantId: string; actorUserId: string }> = [];

  async seed(tenantId: string, actorUserId: string): Promise<Record<DefaultRoleKey, string>> {
    this.calls.push({ tenantId, actorUserId });

    return {
      OWNER: "role-owner",
      ADMIN: "role-admin",
      ACCOUNTANT: "role-accountant",
      STAFF: "role-staff",
      READ_ONLY: "role-readonly",
    };
  }
}
