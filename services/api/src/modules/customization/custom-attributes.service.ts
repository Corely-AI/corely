import { Inject, Injectable } from "@nestjs/common";
import { EXT_ENTITY_ATTR_PORT, type ExtEntityAttrPort } from "@corely/data";

type AttributeScope = {
  tenantId: string;
  moduleId: string;
  entityType: string;
  entityId: string;
};

@Injectable()
export class CustomAttributesService {
  constructor(
    @Inject(EXT_ENTITY_ATTR_PORT) private readonly extEntityAttr: ExtEntityAttrPort
  ) {}

  async getAttributes(scope: AttributeScope): Promise<Record<string, unknown>> {
    const rows = await this.extEntityAttr.list(scope);
    return rows.reduce<Record<string, unknown>>((acc, row) => {
      acc[row.attrKey] = row.attrValue;
      return acc;
    }, {});
  }

  async upsertAttributes(
    input: AttributeScope & { attributes: Record<string, unknown> }
  ): Promise<Record<string, unknown>> {
    const entries = Object.entries(input.attributes)
      .map(([key, value]) => ({ key: this.normalizeKey(key), value }))
      .filter((entry): entry is { key: string; value: unknown } => Boolean(entry.key))
      .filter((entry) => entry.value !== undefined);

    await Promise.all(
      entries.map((entry) =>
        this.extEntityAttr.set({
          tenantId: input.tenantId,
          moduleId: input.moduleId,
          entityType: input.entityType,
          entityId: input.entityId,
          attrKey: entry.key,
          attrValue: entry.value,
        })
      )
    );

    return this.getAttributes(input);
  }

  async deleteAttributes(input: AttributeScope & { keys: string[] }): Promise<void> {
    const targetKeys = input.keys
      .map((key) => this.normalizeKey(key))
      .filter((key): key is string => Boolean(key));

    if (targetKeys.length === 0) {
      return;
    }

    const existing = await this.extEntityAttr.list(input);
    const existingKeys = new Set(existing.map((entry) => entry.attrKey));

    await Promise.all(
      targetKeys
        .filter((key) => existingKeys.has(key))
        .map((attrKey) =>
          this.extEntityAttr.delete({
            tenantId: input.tenantId,
            moduleId: input.moduleId,
            entityType: input.entityType,
            entityId: input.entityId,
            attrKey,
          })
        )
    );
  }

  private normalizeKey(key: string): string | null {
    const trimmed = key.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
