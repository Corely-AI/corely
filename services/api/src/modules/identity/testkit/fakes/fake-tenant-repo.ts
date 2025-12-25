import { type ITenantRepository } from "../../application/ports/tenant-repository.port";
import { type Tenant } from "../../domain/entities/tenant.entity";

export class FakeTenantRepository implements ITenantRepository {
  tenants: Tenant[] = [];

  async create(tenant: Tenant): Promise<Tenant> {
    this.tenants.push(tenant);
    return tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.getId() === id) ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.getSlug() === slug) ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    return this.tenants.some((t) => t.getSlug() === slug);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    this.tenants = this.tenants.map((t) => (t.getId() === tenant.getId() ? tenant : t));
    return tenant;
  }
}
