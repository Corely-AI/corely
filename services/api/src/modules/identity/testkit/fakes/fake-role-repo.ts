import { type IRoleRepository } from "../../application/ports/role-repository.port";

export class FakeRoleRepository implements IRoleRepository {
  roles: Array<{ id: string; tenantId: string; name: string; systemKey: string | null }> = [];

  async create(data: {
    id: string;
    tenantId: string;
    name: string;
    systemKey?: string | undefined;
  }): Promise<void> {
    this.roles.push({ ...data, systemKey: data.systemKey ?? null });
  }

  async findById(
    id: string
  ): Promise<{ id: string; tenantId: string; name: string; systemKey: string | null } | null> {
    return this.roles.find((r) => r.id === id) ?? null;
  }

  async findBySystemKey(
    tenantId: string,
    systemKey: string
  ): Promise<{ id: string; tenantId: string; name: string; systemKey: string | null } | null> {
    return this.roles.find((r) => r.tenantId === tenantId && r.systemKey === systemKey) ?? null;
  }

  async listByTenant(
    tenantId: string
  ): Promise<{ id: string; tenantId: string; name: string; systemKey: string | null }[]> {
    return this.roles.filter((r) => r.tenantId === tenantId);
  }

  async getPermissions(roleId: string): Promise<string[]> {
    const role = this.roles.find((r) => r.id === roleId);
    if (!role) {return [];}
    return role.systemKey === "OWNER" ? ["*"] : [];
  }
}
