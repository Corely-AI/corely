import { Injectable } from "@nestjs/common";
import { CustomAttributesService } from "@/modules/customization/custom-attributes.service";
import type { WebsiteCustomAttributesPort } from "../../application/ports/custom-attributes.port";

const WEBSITE_CUSTOM_ATTRIBUTES_MODULE_ID = "website";

@Injectable()
export class CustomizationWebsiteCustomAttributesAdapter implements WebsiteCustomAttributesPort {
  constructor(private readonly customAttributes: CustomAttributesService) {}

  async getAttributes(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
  }): Promise<Record<string, unknown>> {
    return this.customAttributes.getAttributes({
      tenantId: input.tenantId,
      moduleId: WEBSITE_CUSTOM_ATTRIBUTES_MODULE_ID,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }

  async upsertAttributes(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
    attributes: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    return this.customAttributes.upsertAttributes({
      tenantId: input.tenantId,
      moduleId: WEBSITE_CUSTOM_ATTRIBUTES_MODULE_ID,
      entityType: input.entityType,
      entityId: input.entityId,
      attributes: input.attributes,
    });
  }

  async deleteAttributes(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
    keys: string[];
  }): Promise<void> {
    await this.customAttributes.deleteAttributes({
      tenantId: input.tenantId,
      moduleId: WEBSITE_CUSTOM_ATTRIBUTES_MODULE_ID,
      entityType: input.entityType,
      entityId: input.entityId,
      keys: input.keys,
    });
  }
}
