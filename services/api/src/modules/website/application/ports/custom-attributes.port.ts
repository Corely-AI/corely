export interface WebsiteCustomAttributesPort {
  getAttributes(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
  }): Promise<Record<string, unknown>>;

  upsertAttributes(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
    attributes: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;

  deleteAttributes(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
    keys: string[];
  }): Promise<void>;
}

export const WEBSITE_CUSTOM_ATTRIBUTES_PORT = "website/custom-attributes-port";
