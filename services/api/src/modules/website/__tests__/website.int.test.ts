import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, stopSharedContainer, createTenant } from "@corely/testkit";
import type { PrismaService } from "@corely/data";
import { PrismaOutboxAdapter, PrismaUnitOfWork } from "@corely/data";
import { PublishWebsitePageUseCase } from "../application/use-cases/publish-page.usecase";
import { ResolveWebsitePublicPageUseCase } from "../application/use-cases/resolve-public-page.usecase";
import { UnpublishWebsitePageUseCase } from "../application/use-cases/unpublish-page.usecase";
import { PrismaWebsitePageRepository } from "../infrastructure/prisma/prisma-website-page-repository.adapter";
import { PrismaWebsiteSnapshotRepository } from "../infrastructure/prisma/prisma-website-snapshot-repository.adapter";
import { PrismaWebsiteDomainRepository } from "../infrastructure/prisma/prisma-website-domain-repository.adapter";
import { PrismaWebsiteSiteRepository } from "../infrastructure/prisma/prisma-website-site-repository.adapter";
import { PrismaWebsiteMenuRepository } from "../infrastructure/prisma/prisma-website-menu-repository.adapter";
import type { CmsReadPort } from "../application/ports/cms-read.port";
import { PublicWorkspaceResolver } from "@/shared/public";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Website integration (Postgres)", () => {
  let db: { client: PrismaService; reset: () => Promise<void>; down: () => Promise<void> };
  let prisma: PrismaService;

  const now = new Date("2024-01-01T00:00:00.000Z");
  const clock = { now: () => now };

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    if (db) {
      await db.down();
    }
    await stopSharedContainer();
  });

  it("publishes a page and writes snapshot + outbox", async () => {
    const tenant = await createTenant(prisma, { name: "Tenant Website" });

    const site = await prisma.websiteSite.create({
      data: {
        id: "site-1",
        tenantId: tenant.id,
        name: "Main Site",
        slug: "main-site",
        defaultLocale: "en-US",
        isDefault: true,
      },
    });

    const page = await prisma.websitePage.create({
      data: {
        id: "page-1",
        tenantId: tenant.id,
        siteId: site.id,
        path: "/about",
        locale: "en-US",
        template: "landing",
        status: "DRAFT",
        cmsEntryId: "cms-1",
      },
    });

    const cmsRead: CmsReadPort = {
      async getEntryForWebsiteRender() {
        return {
          entryId: "cms-1",
          title: "About",
          excerpt: "About us",
          contentJson: { type: "doc", content: [] },
          contentHtml: "<p>About</p>",
          contentText: "About",
          status: "DRAFT",
          updatedAt: now.toISOString(),
          publishedAt: null,
        };
      },
      async getEntryContentJson() {
        return { templateKey: "landing", blocks: [] };
      },
    };

    const useCase = new PublishWebsitePageUseCase({
      logger: console as any,
      pageRepo: new PrismaWebsitePageRepository(prisma),
      snapshotRepo: new PrismaWebsiteSnapshotRepository(prisma),
      cmsRead,
      siteRepo: new PrismaWebsiteSiteRepository(prisma),
      menuRepo: new PrismaWebsiteMenuRepository(prisma),
      customAttributes: {
        async getAttributes() {
          return {};
        },
        async upsertAttributes() {
          return {};
        },
        async deleteAttributes() {},
      },
      outbox: new PrismaOutboxAdapter(prisma),
      uow: new PrismaUnitOfWork(prisma),
      idGenerator: { newId: () => "snap-1" } as any,
      clock: clock as any,
    });

    const result = await useCase.execute({ pageId: page.id }, { tenantId: tenant.id });
    expect(result.ok).toBe(true);

    const savedPage = await prisma.websitePage.findUnique({ where: { id: page.id } });
    expect(savedPage?.status).toBe("PUBLISHED");
    expect(savedPage?.publishedAt).not.toBeNull();

    const snapshots = await prisma.websitePageSnapshot.findMany({ where: { pageId: page.id } });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].version).toBe(1);

    const outboxRows = await prisma.outboxEvent.findMany({
      where: { tenantId: tenant.id, eventType: "website.page.published" },
    });
    expect(outboxRows).toHaveLength(1);
    const payload = JSON.parse(outboxRows[0].payloadJson);
    expect(payload.pageId).toBe(page.id);
    expect(payload.snapshotId).toBe("snap-1");
  });

  it("resolves latest snapshot for live mode", async () => {
    const tenant = await createTenant(prisma, { name: "Tenant Resolve" });

    const site = await prisma.websiteSite.create({
      data: {
        id: "site-2",
        tenantId: tenant.id,
        name: "Resolve Site",
        slug: "resolve-site",
        defaultLocale: "en-US",
        isDefault: true,
      },
    });

    await prisma.websiteDomain.create({
      data: {
        id: "domain-1",
        tenantId: tenant.id,
        siteId: site.id,
        hostname: "example.com",
        isPrimary: true,
      },
    });

    const page = await prisma.websitePage.create({
      data: {
        id: "page-2",
        tenantId: tenant.id,
        siteId: site.id,
        path: "/home",
        locale: "en-US",
        template: "landing",
        status: "PUBLISHED",
        cmsEntryId: "cms-2",
        publishedAt: now,
      },
    });

    await prisma.websiteMenu.create({
      data: {
        id: "menu-1",
        tenantId: tenant.id,
        siteId: site.id,
        name: "header",
        locale: "en-US",
        itemsJson: [],
      },
    });

    await prisma.websitePageSnapshot.create({
      data: {
        id: "snap-1",
        tenantId: tenant.id,
        siteId: site.id,
        pageId: page.id,
        path: page.path,
        locale: page.locale,
        version: 1,
        payloadJson: { template: "landing", content: { templateKey: "landing", blocks: [] } },
      },
    });

    await prisma.websitePageSnapshot.create({
      data: {
        id: "snap-2",
        tenantId: tenant.id,
        siteId: site.id,
        pageId: page.id,
        path: page.path,
        locale: page.locale,
        version: 2,
        payloadJson: { template: "landing-v2", content: { templateKey: "landing-v2", blocks: [] } },
      },
    });

    const cmsRead: CmsReadPort = {
      async getEntryForWebsiteRender() {
        throw new Error("CMS should not be called for live mode");
      },
      async getEntryContentJson() {
        return null;
      },
    };

    const useCase = new ResolveWebsitePublicPageUseCase({
      logger: console as any,
      domainRepo: new PrismaWebsiteDomainRepository(prisma),
      siteRepo: new PrismaWebsiteSiteRepository(prisma),
      pageRepo: new PrismaWebsitePageRepository(prisma),
      snapshotRepo: new PrismaWebsiteSnapshotRepository(prisma),
      menuRepo: new PrismaWebsiteMenuRepository(prisma),
      publicFileUrlPort: {
        async getPublicUrl() {
          return null;
        },
      },
      cmsRead,
      customAttributes: {
        async getAttributes() {
          return {};
        },
        async upsertAttributes() {
          return {};
        },
        async deleteAttributes() {},
      },
      publicWorkspaceResolver: new PublicWorkspaceResolver(prisma),
    });

    const result = await useCase.execute({ host: "example.com", path: "/home", mode: "live" }, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.snapshotVersion).toBe(2);
      expect(result.value.template).toBe("landing-v2");
      expect(result.value.page.templateKey).toBe("landing-v2");
      expect(result.value.menus).toHaveLength(1);
      expect(result.value.menus[0].name).toBe("header");
      expect(result.value.settings.common.siteTitle).toBe("Resolve Site");
    }
  });

  it("unpublishes a page and writes outbox", async () => {
    const tenant = await createTenant(prisma, { name: "Tenant Unpublish" });

    const site = await prisma.websiteSite.create({
      data: {
        id: "site-3",
        tenantId: tenant.id,
        name: "Unpublish Site",
        slug: "unpublish-site",
        defaultLocale: "en-US",
        isDefault: true,
      },
    });

    const page = await prisma.websitePage.create({
      data: {
        id: "page-3",
        tenantId: tenant.id,
        siteId: site.id,
        path: "/pricing",
        locale: "en-US",
        template: "landing",
        status: "PUBLISHED",
        cmsEntryId: "cms-3",
        publishedAt: now,
      },
    });

    const useCase = new UnpublishWebsitePageUseCase({
      logger: console as any,
      pageRepo: new PrismaWebsitePageRepository(prisma),
      outbox: new PrismaOutboxAdapter(prisma),
      uow: new PrismaUnitOfWork(prisma),
      clock: clock as any,
    });

    const result = await useCase.execute({ pageId: page.id }, { tenantId: tenant.id });
    expect(result.ok).toBe(true);

    const saved = await prisma.websitePage.findUnique({ where: { id: page.id } });
    expect(saved?.status).toBe("DRAFT");
    expect(saved?.publishedAt).toBeNull();

    const outboxRows = await prisma.outboxEvent.findMany({
      where: { tenantId: tenant.id, eventType: "website.page.unpublished" },
    });
    expect(outboxRows).toHaveLength(1);
    const payload = JSON.parse(outboxRows[0].payloadJson);
    expect(payload.pageId).toBe(page.id);
    expect(payload.path).toBe("/pricing");
  });
});
