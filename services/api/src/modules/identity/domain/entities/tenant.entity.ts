/**
 * Tenant Entity (Bounded Context root aggregate)
 * Represents a tenant/workspace/company
 */
export class Tenant {
  private constructor(
    private readonly id: string,
    private name: string,
    private slug: string,
    private status: string,
    private readonly createdAt: Date,
    private readonly timeZone: string,
    private plan?: string | null,
    private planStatus?: string | null,
    private billingMethod?: string | null,
    private billingNote?: string | null,
    private planUpdatedAt?: Date | null,
    private planUpdatedBy?: string | null
  ) {}

  static create(
    id: string,
    name: string,
    slug: string,
    status: string = "ACTIVE",
    createdAt: Date = new Date(),
    timeZone: string = "UTC"
  ): Tenant {
    if (!name || name.trim().length === 0) {
      throw new Error("Tenant name cannot be empty");
    }

    if (!slug || slug.trim().length === 0) {
      throw new Error("Tenant slug cannot be empty");
    }

    const normalizedSlug = this.normalizeSlug(slug);
    return new Tenant(id, name.trim(), normalizedSlug, status, createdAt, timeZone);
  }

  static restore(data: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: Date;
    timeZone: string;
    plan?: string | null;
    planStatus?: string | null;
    billingMethod?: string | null;
    billingNote?: string | null;
    planUpdatedAt?: Date | null;
    planUpdatedBy?: string | null;
  }): Tenant {
    return new Tenant(
      data.id,
      data.name,
      data.slug,
      data.status,
      data.createdAt,
      data.timeZone,
      data.plan,
      data.planStatus,
      data.billingMethod,
      data.billingNote,
      data.planUpdatedAt,
      data.planUpdatedBy
    );
  }

  private static normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getSlug(): string {
    return this.slug;
  }

  getStatus(): string {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getTimeZone(): string {
    return this.timeZone;
  }

  getPlan(): string | null {
    return this.plan ?? null;
  }

  getPlanStatus(): string | null {
    return this.planStatus ?? null;
  }

  getBillingMethod(): string | null {
    return this.billingMethod ?? null;
  }

  getBillingNote(): string | null {
    return this.billingNote ?? null;
  }

  getPlanUpdatedAt(): Date | null {
    return this.planUpdatedAt ?? null;
  }

  getPlanUpdatedBy(): string | null {
    return this.planUpdatedBy ?? null;
  }

  isActive(): boolean {
    return this.status === "ACTIVE";
  }

  updateDetails(name?: string, slug?: string, status?: string) {
    if (name) {
      this.name = name.trim();
    }
    if (slug) {
      this.slug = Tenant.normalizeSlug(slug);
    }
    if (status) {
      this.status = status;
    }
  }

  updateManualPlan(
    plan: string | null,
    planStatus: string | null,
    billingMethod: string | null,
    billingNote: string | null,
    updatedByUserId: string
  ) {
    this.plan = plan;
    this.planStatus = planStatus;
    this.billingMethod = billingMethod;
    this.billingNote = billingNote;
    this.planUpdatedAt = new Date();
    this.planUpdatedBy = updatedByUserId;
  }
}
