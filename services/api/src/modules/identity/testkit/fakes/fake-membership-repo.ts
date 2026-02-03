import { type MembershipRepositoryPort } from "../../application/ports/membership-repository.port";
import { type Membership } from "../../domain/entities/membership.entity";

export class FakeMembershipRepository implements MembershipRepositoryPort {
  memberships: Membership[] = [];

  async create(membership: Membership): Promise<Membership> {
    this.memberships.push(membership);
    return membership;
  }

  async findById(id: string): Promise<Membership | null> {
    return this.memberships.find((m) => m.getId() === id) ?? null;
  }

  async findByUserId(userId: string): Promise<Membership[]> {
    return this.memberships.filter((m) => m.getUserId() === userId);
  }

  async findHostMembership(userId: string): Promise<Membership | null> {
    return (
      this.memberships.find((m) => m.getUserId() === userId && m.getTenantId() === null) ?? null
    );
  }

  async findByTenantId(tenantId: string): Promise<Membership[]> {
    return this.memberships.filter((m) => m.getTenantId() === tenantId);
  }

  async findByTenantAndUser(tenantId: string, userId: string): Promise<Membership | null> {
    return (
      this.memberships.find((m) => m.getTenantId() === tenantId && m.getUserId() === userId) ?? null
    );
  }

  async existsByTenantAndUser(tenantId: string, userId: string): Promise<boolean> {
    return this.memberships.some((m) => m.getTenantId() === tenantId && m.getUserId() === userId);
  }

  async existsByRole(tenantId: string, roleId: string): Promise<boolean> {
    return this.memberships.some((m) => m.getTenantId() === tenantId && m.getRoleId() === roleId);
  }

  async update(membership: Membership): Promise<Membership> {
    this.memberships = this.memberships.map((m) =>
      m.getId() === membership.getId() ? membership : m
    );
    return membership;
  }

  async delete(id: string): Promise<void> {
    this.memberships = this.memberships.filter((m) => m.getId() !== id);
  }
}
