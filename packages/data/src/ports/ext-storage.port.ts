/**
 * Extension Storage Ports
 *
 * Provides typed interfaces for the extension storage primitives (KV, EntityAttr, EntityLink).
 * These ports allow modules to persist data without creating dedicated database tables.
 *
 * See: docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md
 */

// ===========================
// KV Storage Port
// ===========================

export interface KvGetInput {
  tenantId: string;
  moduleId: string;
  scope: string;
  key: string;
}

export interface KvSetInput {
  tenantId: string;
  moduleId: string;
  scope: string;
  key: string;
  value: unknown; // JSONB value
}

export interface KvDeleteInput {
  tenantId: string;
  moduleId: string;
  scope: string;
  key: string;
}

export interface KvListInput {
  tenantId: string;
  moduleId: string;
  scope?: string; // Optional filter
}

export interface KvEntry {
  id: string;
  tenantId: string;
  moduleId: string;
  scope: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtKvPort {
  get(input: KvGetInput): Promise<KvEntry | null>;
  set(input: KvSetInput): Promise<KvEntry>;
  delete(input: KvDeleteInput): Promise<void>;
  list(input: KvListInput): Promise<KvEntry[]>;
}

export const EXT_KV_PORT = Symbol("EXT_KV_PORT");

// ===========================
// Entity Attribute Port
// ===========================

export interface EntityAttrGetInput {
  tenantId: string;
  moduleId: string;
  entityType: string;
  entityId: string;
  attrKey: string;
}

export interface EntityAttrSetInput {
  tenantId: string;
  moduleId: string;
  entityType: string;
  entityId: string;
  attrKey: string;
  attrValue: unknown; // JSONB value
}

export interface EntityAttrDeleteInput {
  tenantId: string;
  moduleId: string;
  entityType: string;
  entityId: string;
  attrKey: string;
}

export interface EntityAttrListInput {
  tenantId: string;
  moduleId?: string; // Optional: filter by module
  entityType: string;
  entityId: string;
}

export interface EntityAttr {
  id: string;
  tenantId: string;
  moduleId: string;
  entityType: string;
  entityId: string;
  attrKey: string;
  attrValue: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtEntityAttrPort {
  get(input: EntityAttrGetInput): Promise<EntityAttr | null>;
  set(input: EntityAttrSetInput): Promise<EntityAttr>;
  delete(input: EntityAttrDeleteInput): Promise<void>;
  list(input: EntityAttrListInput): Promise<EntityAttr[]>;
}

export const EXT_ENTITY_ATTR_PORT = Symbol("EXT_ENTITY_ATTR_PORT");

// ===========================
// Entity Link Port
// ===========================

export interface EntityLinkCreateInput {
  tenantId: string;
  moduleId: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  linkType: string;
  metadata?: unknown; // Optional JSONB metadata
}

export interface EntityLinkDeleteInput {
  tenantId: string;
  moduleId: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  linkType: string;
}

export interface EntityLinkListInput {
  tenantId: string;
  moduleId?: string; // Optional filter
  fromEntityType?: string;
  fromEntityId?: string;
  toEntityType?: string;
  toEntityId?: string;
  linkType?: string;
}

export interface EntityLink {
  id: string;
  tenantId: string;
  moduleId: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  linkType: string;
  metadata?: unknown;
  createdAt: Date;
}

export interface ExtEntityLinkPort {
  create(input: EntityLinkCreateInput): Promise<EntityLink>;
  delete(input: EntityLinkDeleteInput): Promise<void>;
  list(input: EntityLinkListInput): Promise<EntityLink[]>;
}

export const EXT_ENTITY_LINK_PORT = Symbol("EXT_ENTITY_LINK_PORT");
