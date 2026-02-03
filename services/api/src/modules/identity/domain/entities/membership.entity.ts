/**
 * Membership Entity
 * Represents a user's membership in a tenant with an assigned role
 */
export class Membership {
  private constructor(
    private readonly id: string,
    private readonly tenantId: string | null,
    private readonly userId: string,
    private readonly roleId: string,
    private readonly createdAt: Date
  ) {}

  static create(
    id: string,
    tenantId: string | null,
    userId: string,
    roleId: string,
    createdAt: Date = new Date()
  ): Membership {
    if (!userId || !roleId) {
      throw new Error("User ID and Role ID are required");
    }

    return new Membership(id, tenantId, userId, roleId, createdAt);
  }

  static restore(data: {
    id: string;
    tenantId: string | null;
    userId: string;
    roleId: string;
    createdAt: Date;
  }): Membership {
    return new Membership(data.id, data.tenantId, data.userId, data.roleId, data.createdAt);
  }

  getId(): string {
    return this.id;
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  getUserId(): string {
    return this.userId;
  }

  getRoleId(): string {
    return this.roleId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
