import { UseCaseContext } from "@corely/kernel";
import { type RentalProperty, type RentalStatus } from "@corely/contracts";

export type RentalPropertyImageInput = {
  id?: string;
  fileId: string;
  altText?: string | null;
  sortOrder?: number;
};

export type SaveRentalPropertyInput = Partial<Omit<RentalProperty, "images">> & {
  id?: string;
  images?: RentalPropertyImageInput[];
};

export interface PropertyRepoPort {
  findById(tenantId: string, id: string): Promise<RentalProperty | null>;
  findBySlug(tenantId: string, slug: string): Promise<RentalProperty | null>;
  findBySlugPublic(tenantId: string, slug: string): Promise<RentalProperty | null>;
  list(
    tenantId: string,
    filters: { status?: RentalStatus; categoryId?: string; q?: string }
  ): Promise<RentalProperty[]>;
  listPublic(
    tenantId: string,
    filters: { categorySlug?: string; q?: string }
  ): Promise<RentalProperty[]>;
  save(
    tenantId: string,
    workspaceId: string,
    property: SaveRentalPropertyInput
  ): Promise<RentalProperty>;
  delete(tenantId: string, id: string): Promise<void>;
}

export const PROPERTY_REPO_PORT = Symbol("PROPERTY_REPO_PORT");
