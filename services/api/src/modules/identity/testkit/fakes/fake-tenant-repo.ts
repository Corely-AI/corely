import { type TenantRepositoryPort } from "../../application/ports/tenant-repository.port";
import { type Tenant } from "../../domain/entities/tenant.entity";

export class FakeTenantRepository implements TenantRepositoryPort {
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

  async listAll(query: {
    q?: string;
    status?: string;
    page: number;
    pageSize: number;
    sort?: string;
  }): Promise<{ items: Tenant[]; total: number }> {
    let items = [...this.tenants];

    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter(
        (tenant) =>
          tenant.getName().toLowerCase().includes(q) || tenant.getSlug().toLowerCase().includes(q)
      );
    }

    if (query.status) {
      items = items.filter((tenant) => tenant.getStatus() === query.status);
    }

    const [field, direction] = (query.sort ?? "createdAt:desc").split(":");
    const desc = direction?.toLowerCase() !== "asc";
    items.sort((a, b) => {
      const first =
        field === "name"
          ? a.getName()
          : field === "slug"
            ? a.getSlug()
            : field === "status"
              ? a.getStatus()
              : a.getCreatedAt().toISOString();
      const second =
        field === "name"
          ? b.getName()
          : field === "slug"
            ? b.getSlug()
            : field === "status"
              ? b.getStatus()
              : b.getCreatedAt().toISOString();

      const compared = String(first).localeCompare(String(second));
      return desc ? -compared : compared;
    });

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const paged = items.slice(start, start + query.pageSize);
    return { items: paged, total };
  }

  async slugExists(slug: string): Promise<boolean> {
    return this.tenants.some((t) => t.getSlug() === slug);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    this.tenants = this.tenants.map((t) => (t.getId() === tenant.getId() ? tenant : t));
    return tenant;
  }
}
