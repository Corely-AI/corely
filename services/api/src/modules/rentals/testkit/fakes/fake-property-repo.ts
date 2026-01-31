import { type PropertyRepoPort } from "../../application/ports/property-repository.port";
import { type RentalProperty, type RentalStatus } from "@corely/contracts";

export class FakePropertyRepo implements PropertyRepoPort {
  public properties: (RentalProperty & { tenantId: string; workspaceId: string })[] = [];

  async findById(tenantId: string, id: string): Promise<RentalProperty | null> {
    return this.properties.find((p) => p.id === id && p.tenantId === tenantId) || null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<RentalProperty | null> {
    return this.properties.find((p) => p.slug === slug && p.tenantId === tenantId) || null;
  }

  async findBySlugPublic(
    tenantId: string,
    workspaceId: string,
    slug: string
  ): Promise<RentalProperty | null> {
    return (
      this.properties.find(
        (p) =>
          p.slug === slug &&
          p.status === "PUBLISHED" &&
          p.tenantId === tenantId &&
          p.workspaceId === workspaceId
      ) || null
    );
  }

  async list(
    tenantId: string,
    filters: { status?: RentalStatus; categoryId?: string; q?: string }
  ): Promise<RentalProperty[]> {
    let result = this.properties.filter((p) => p.tenantId === tenantId);
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }
    return result;
  }

  async listPublic(
    tenantId: string,
    workspaceId: string,
    filters: { categorySlug?: string; q?: string }
  ): Promise<RentalProperty[]> {
    let result = this.properties.filter(
      (p) => p.status === "PUBLISHED" && p.tenantId === tenantId && p.workspaceId === workspaceId
    );
    if (filters.q) {
      const q = filters.q.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }

  async save(
    tenantId: string,
    workspaceId: string,
    property: Partial<RentalProperty> & { id?: string }
  ): Promise<RentalProperty> {
    const existingIndex = property.id ? this.properties.findIndex((p) => p.id === property.id) : -1;

    const now = new Date().toISOString();
    const newProperty: RentalProperty & { tenantId: string; workspaceId: string } = {
      id: property.id || `prop-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      workspaceId,
      status: property.status || "DRAFT",
      name: property.name || (existingIndex >= 0 ? this.properties[existingIndex].name : "Unnamed"),
      slug: property.slug || (existingIndex >= 0 ? this.properties[existingIndex].slug : "unnamed"),
      createdAt: existingIndex >= 0 ? this.properties[existingIndex].createdAt : now,
      updatedAt: now,
      summary:
        property.summary || (existingIndex >= 0 ? this.properties[existingIndex].summary : ""),
      descriptionHtml:
        property.descriptionHtml ||
        (existingIndex >= 0 ? this.properties[existingIndex].descriptionHtml : ""),
      maxGuests:
        property.maxGuests || (existingIndex >= 0 ? this.properties[existingIndex].maxGuests : 2),
      coverImageFileId:
        property.coverImageFileId ||
        (existingIndex >= 0 ? this.properties[existingIndex].coverImageFileId : ""),
      images: property.images || (existingIndex >= 0 ? this.properties[existingIndex].images : []),
      publishedAt:
        property.publishedAt ||
        (existingIndex >= 0 ? this.properties[existingIndex].publishedAt : undefined),
    } as any;

    if (existingIndex >= 0) {
      this.properties[existingIndex] = newProperty;
    } else {
      this.properties.push(newProperty);
    }

    return newProperty;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.properties = this.properties.filter((p) => p.id !== id || p.tenantId !== tenantId);
  }
}
