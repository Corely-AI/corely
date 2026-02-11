import { Injectable } from "@nestjs/common";
import type { MenuGroup, MenuItem } from "@corely/contracts";
import { MenuBuilderService } from "./menu-builder.service";

interface ComposeMenuInput {
  tenantId: string;
  userId: string;
  permissions: Set<string>;
  scope: "web" | "pos";
  capabilityFilter?: Set<string>;
  capabilityKeys?: Set<string>;
}

export interface ComposeMenuTreeOutput {
  items: MenuItem[];
  groups: MenuGroup[];
}

/**
 * Menu Composer Service
 * Composes server-driven menu filtered by tenant entitlements, RBAC, and scope
 */
@Injectable()
export class MenuComposerService {
  constructor(private readonly menuBuilder: MenuBuilderService) {}

  /**
   * Compose menu for a user
   */
  async composeMenu(input: ComposeMenuInput): Promise<MenuItem[]> {
    const menu = await this.menuBuilder.build(input);
    return menu.items;
  }

  async composeMenuTree(input: ComposeMenuInput): Promise<ComposeMenuTreeOutput> {
    return this.menuBuilder.build(input);
  }
}
