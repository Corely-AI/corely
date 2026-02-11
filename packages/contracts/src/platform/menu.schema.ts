import { z } from "zod";

/**
 * Menu Scope
 */
export const MenuScopeSchema = z.enum(["web", "pos"]);

export type MenuScope = z.infer<typeof MenuScopeSchema>;

/**
 * Menu Item - Resolved menu item with all filters applied
 */
export const MenuItemSchema = z.object({
  id: z.string(),
  section: z.string(),
  label: z.string().describe("Resolved label (after i18n and overrides)"),
  labelKey: z.string().optional(),
  route: z.string().optional(),
  screen: z.string().optional(),
  icon: z.string(),
  order: z.number(),
  pinned: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  requiredCapabilities: z.array(z.string()).optional(),
  exact: z.boolean().optional(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

/**
 * Menu Section - Grouped menu items
 */
export const MenuSectionSchema = z.object({
  section: z.string(),
  items: z.array(MenuItemSchema),
  order: z.number(),
});

export type MenuSection = z.infer<typeof MenuSectionSchema>;

/**
 * Menu Group - App-level grouped menu items
 */
export const MenuGroupSchema = z.object({
  appId: z.string(),
  labelKey: z.string().optional(),
  defaultLabel: z.string(),
  icon: z.string().optional(),
  items: z.array(MenuItemSchema),
});

export type MenuGroup = z.infer<typeof MenuGroupSchema>;

/**
 * Menu Tree - App-grouped menu structure
 */
export const MenuTreeSchema = z.object({
  groups: z.array(MenuGroupSchema),
});

export type MenuTree = z.infer<typeof MenuTreeSchema>;

/**
 * Composed Menu - Complete menu tree
 */
export const ComposedMenuSchema = z.object({
  scope: MenuScopeSchema,
  sections: z.array(MenuSectionSchema),
  computedAt: z.string().describe("ISO timestamp"),
});

export type ComposedMenu = z.infer<typeof ComposedMenuSchema>;

/**
 * Menu Overrides - Tenant customizations to menu
 */
export const MenuOverridesSchema = z.object({
  hidden: z.array(z.string()).optional().describe("Menu item IDs to hide"),
  order: z.record(z.number()).optional().describe("Custom order overrides by menu item ID"),
  renames: z.record(z.string()).optional().describe("Custom labels by menu item ID"),
  pins: z.array(z.string()).optional().describe("Menu item IDs to pin"),
});

export type MenuOverrides = z.infer<typeof MenuOverridesSchema>;

/**
 * Tenant Menu Override - Stored tenant menu customization
 */
export const TenantMenuOverrideSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  scope: MenuScopeSchema,
  overridesJson: z.string().describe("Serialized MenuOverrides"),
  updatedByUserId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TenantMenuOverride = z.infer<typeof TenantMenuOverrideSchema>;

/**
 * Update Menu Overrides Input
 */
export const UpdateMenuOverridesInputSchema = z.object({
  scope: MenuScopeSchema,
  overrides: MenuOverridesSchema,
});

export type UpdateMenuOverridesInput = z.infer<typeof UpdateMenuOverridesInputSchema>;

/**
 * Get Menu Query Params
 */
export const GetMenuQuerySchema = z.object({
  scope: MenuScopeSchema.default("web"),
});

export type GetMenuQuery = z.infer<typeof GetMenuQuerySchema>;
