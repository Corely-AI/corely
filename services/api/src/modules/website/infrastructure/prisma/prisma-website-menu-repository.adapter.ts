import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { WebsiteMenu } from "@corely/contracts";
import type { WebsiteMenuRepositoryPort } from "../../application/ports/menu-repository.port";

const mapMenu = (row: any): WebsiteMenu => ({
  id: row.id,
  tenantId: row.tenantId,
  siteId: row.siteId,
  name: row.name,
  locale: row.locale,
  itemsJson: row.itemsJson,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class PrismaWebsiteMenuRepository implements WebsiteMenuRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(menu: WebsiteMenu, tx?: TransactionContext): Promise<WebsiteMenu> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteMenu.upsert({
      where: {
        tenantId_siteId_name_locale: {
          tenantId: menu.tenantId,
          siteId: menu.siteId,
          name: menu.name,
          locale: menu.locale,
        },
      },
      update: {
        itemsJson: menu.itemsJson as any,
      },
      create: {
        id: menu.id,
        tenantId: menu.tenantId,
        siteId: menu.siteId,
        name: menu.name,
        locale: menu.locale,
        itemsJson: menu.itemsJson as any,
      },
    });
    return mapMenu(row);
  }

  async listBySite(tenantId: string, siteId: string): Promise<WebsiteMenu[]> {
    const rows = await this.prisma.websiteMenu.findMany({
      where: { tenantId, siteId },
      orderBy: [{ name: "asc" }, { locale: "asc" }],
    });
    return rows.map(mapMenu);
  }
}
