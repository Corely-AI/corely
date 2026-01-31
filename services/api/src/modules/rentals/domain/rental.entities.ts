export class RentalPropertyEntity {
  id: string;
  tenantId: string;
  workspaceId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  slug: string;
  name: string;
  summary?: string | null;
  descriptionHtml?: string | null;
  maxGuests?: number | null;
  coverImageFileId?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: RentalPropertyEntity) {
    Object.assign(this, data);
  }
}

export class RentalCategoryEntity {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: RentalCategoryEntity) {
    Object.assign(this, data);
  }
}
