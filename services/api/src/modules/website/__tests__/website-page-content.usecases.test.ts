import { describe, expect, it } from "vitest";
import {
  unwrap,
  type OutboxPort,
  type TransactionContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import type {
  WebsiteDomain,
  WebsiteMenu,
  WebsitePage,
  WebsitePageContent,
  WebsitePageSnapshot,
  WebsiteSite,
} from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../application/ports/page-repository.port";
import type { WebsiteSnapshotRepositoryPort } from "../application/ports/snapshot-repository.port";
import type { WebsiteDomainRepositoryPort } from "../application/ports/domain-repository.port";
import type { WebsiteSiteRepositoryPort } from "../application/ports/site-repository.port";
import type { WebsiteMenuRepositoryPort } from "../application/ports/menu-repository.port";
import type { CmsReadPort } from "../application/ports/cms-read.port";
import type { CmsWritePort } from "../application/ports/cms-write.port";
import { UpdateWebsitePageContentUseCase } from "../application/use-cases/update-page-content.usecase";
import { PublishWebsitePageUseCase } from "../application/use-cases/publish-page.usecase";
import { ResolveWebsitePublicPageUseCase } from "../application/use-cases/resolve-public-page.usecase";

const nowIso = "2024-01-01T00:00:00.000Z";

class FakeUow implements UnitOfWorkPort {
  constructor(private readonly tx: TransactionContext) {}
  async withinTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return fn(this.tx);
  }
}

const baseSite = (): WebsiteSite => ({
  id: "site-1",
  tenantId: "tenant-1",
  name: "Site",
  slug: "site",
  defaultLocale: "en-US",
  brandingJson: null,
  themeJson: null,
  isDefault: true,
  createdAt: nowIso,
  updatedAt: nowIso,
});

const basePage = (): WebsitePage => ({
  id: "page-1",
  tenantId: "tenant-1",
  siteId: "site-1",
  path: "/",
  locale: "en-US",
  template: "landing.deutschliebe.v1",
  status: "DRAFT",
  cmsEntryId: "cms-1",
  seoTitle: null,
  seoDescription: null,
  seoImageFileId: null,
  publishedAt: null,
  createdAt: nowIso,
  updatedAt: nowIso,
});

describe("Website page content use cases", () => {
  it("updates draft page blocks and preserves order + enabled flags", async () => {
    const page = basePage();
    let savedContentJson: unknown = null;

    const pageRepo: WebsitePageRepositoryPort = {
      async create(nextPage) {
        return nextPage;
      },
      async update(nextPage) {
        return nextPage;
      },
      async findById() {
        return page;
      },
      async findByPath() {
        return null;
      },
      async list() {
        return { items: [], total: 0 };
      },
    };

    const cmsWrite: CmsWritePort = {
      async createDraftEntryFromBlueprint() {
        throw new Error("not used");
      },
      async updateDraftEntryContentJson(params) {
        savedContentJson = params.contentJson;
      },
    };

    const useCase = new UpdateWebsitePageContentUseCase({
      logger: console as any,
      pageRepo,
      cmsWrite,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const input: WebsitePageContent = {
      templateKey: "landing.deutschliebe.v1",
      blocks: [
        { id: "hero-1", type: "hero", enabled: true, props: { headline: "Hello" } },
        { id: "schedule-1", type: "schedule", enabled: false, props: { heading: "Schedule" } },
        { id: "lead-1", type: "leadForm", enabled: false, props: { heading: "Apply now" } },
      ],
    };

    const result = await useCase.execute(
      { pageId: page.id, input },
      { tenantId: "tenant-1", workspaceId: "workspace-1" }
    );
    const output = unwrap(result);

    expect(output.content.blocks.map((block) => block.type)).toEqual([
      "hero",
      "schedule",
      "leadForm",
    ]);
    expect(output.content.blocks.map((block) => block.enabled)).toEqual([true, false, false]);
    expect(savedContentJson).toMatchObject({
      templateKey: "landing.deutschliebe.v1",
      blocks: [
        { id: "hero-1", type: "hero", enabled: true },
        { id: "schedule-1", type: "schedule", enabled: false },
        { id: "lead-1", type: "leadForm", enabled: false },
      ],
    });
  });

  it("resolves preview with draft blocks and custom site settings", async () => {
    const site = baseSite();
    const page = basePage();

    const domainRepo: WebsiteDomainRepositoryPort = {
      async create(domain) {
        return domain;
      },
      async update(domain) {
        return domain;
      },
      async delete() {},
      async findById() {
        return null;
      },
      async findByHostname() {
        const domain: WebsiteDomain = {
          id: "domain-1",
          tenantId: "tenant-1",
          siteId: site.id,
          hostname: "example.com",
          isPrimary: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        return domain;
      },
      async listBySite() {
        return [];
      },
      async clearPrimaryForSite() {},
    };

    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(nextSite) {
        return nextSite;
      },
      async update(nextSite) {
        return nextSite;
      },
      async findById() {
        return site;
      },
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
        return site;
      },
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    const pageRepo: WebsitePageRepositoryPort = {
      async create(nextPage) {
        return nextPage;
      },
      async update(nextPage) {
        return nextPage;
      },
      async findById() {
        return page;
      },
      async findByPath() {
        return page;
      },
      async list() {
        return { items: [], total: 0 };
      },
    };

    const snapshotRepo: WebsiteSnapshotRepositoryPort = {
      async create(snapshot) {
        return snapshot;
      },
      async findLatest() {
        return null;
      },
      async getLatestVersion() {
        return 0;
      },
    };

    const menuRepo: WebsiteMenuRepositoryPort = {
      async upsert(menu) {
        return menu;
      },
      async listBySite() {
        const menu: WebsiteMenu = {
          id: "menu-1",
          tenantId: "tenant-1",
          siteId: site.id,
          name: "header",
          locale: "en-US",
          itemsJson: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        return [menu];
      },
    };

    const cmsRead: CmsReadPort = {
      async getEntryForWebsiteRender() {
        return {
          entryId: "cms-1",
          title: "Preview",
          excerpt: "Draft",
          contentJson: {
            templateKey: "landing.deutschliebe.v1",
            blocks: [
              { id: "hero-1", type: "hero", enabled: true, props: {} },
              { id: "schedule-1", type: "schedule", enabled: false, props: {} },
            ],
          },
          contentHtml: "<p>preview</p>",
          contentText: "preview",
          status: "DRAFT",
          updatedAt: nowIso,
          publishedAt: null,
        };
      },
      async getEntryContentJson() {
        return null;
      },
    };

    const useCase = new ResolveWebsitePublicPageUseCase({
      logger: console as any,
      domainRepo,
      siteRepo,
      pageRepo,
      snapshotRepo,
      menuRepo,
      publicFileUrlPort: {
        async getPublicUrl() {
          return null;
        },
      },
      cmsRead,
      customAttributes: {
        async getAttributes() {
          return { featureToggle: true };
        },
        async upsertAttributes() {
          return {};
        },
        async deleteAttributes() {},
      },
      publicWorkspaceResolver: {
        resolveFromRequest: async () => {
          throw new Error("not used");
        },
      } as any,
    });

    const result = await useCase.execute(
      { host: "example.com", path: "/", mode: "preview", token: "preview_12345" },
      {}
    );
    const output = unwrap(result);

    expect(output.snapshotVersion).toBeNull();
    expect(output.settings.custom.featureToggle).toBe(true);
    expect(output.page.content.blocks.map((block) => block.type)).toEqual(["hero", "schedule"]);
    expect(output.page.content.blocks.map((block) => block.enabled)).toEqual([true, false]);
  });

  it("publishes block content into snapshot and serves it in live resolve", async () => {
    const tx = {} as TransactionContext;
    const uow = new FakeUow(tx);
    const site = baseSite();
    const domain: WebsiteDomain = {
      id: "domain-1",
      tenantId: "tenant-1",
      siteId: site.id,
      hostname: "example.com",
      isPrimary: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const menus: WebsiteMenu[] = [
      {
        id: "menu-1",
        tenantId: "tenant-1",
        siteId: site.id,
        name: "header",
        locale: "en-US",
        itemsJson: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];
    let page: WebsitePage = basePage();
    let latestSnapshot: WebsitePageSnapshot | null = null;

    const pageRepo: WebsitePageRepositoryPort = {
      async create(nextPage) {
        return nextPage;
      },
      async update(nextPage) {
        page = nextPage;
        return nextPage;
      },
      async findById() {
        return page;
      },
      async findByPath() {
        return page;
      },
      async list() {
        return { items: [], total: 0 };
      },
    };

    const snapshotRepo: WebsiteSnapshotRepositoryPort = {
      async create(snapshot) {
        latestSnapshot = snapshot;
        return snapshot;
      },
      async findLatest() {
        return latestSnapshot;
      },
      async getLatestVersion() {
        return latestSnapshot?.version ?? 0;
      },
    };

    const cmsRead: CmsReadPort = {
      async getEntryForWebsiteRender() {
        return {
          entryId: "cms-1",
          title: "Landing",
          excerpt: "Landing page",
          contentJson: {
            templateKey: "landing.deutschliebe.v1",
            blocks: [
              { id: "hero-1", type: "hero", enabled: true, props: {} },
              { id: "schedule-1", type: "schedule", enabled: false, props: {} },
              { id: "footer-1", type: "footer", enabled: true, props: {} },
            ],
          },
          contentHtml: "<p>landing</p>",
          contentText: "landing",
          status: "DRAFT",
          updatedAt: nowIso,
          publishedAt: null,
        };
      },
      async getEntryContentJson() {
        return null;
      },
    };

    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(nextSite) {
        return nextSite;
      },
      async update(nextSite) {
        return nextSite;
      },
      async findById() {
        return site;
      },
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
        return site;
      },
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    const domainRepo: WebsiteDomainRepositoryPort = {
      async create(nextDomain) {
        return nextDomain;
      },
      async update(nextDomain) {
        return nextDomain;
      },
      async delete() {},
      async findById() {
        return domain;
      },
      async findByHostname() {
        return domain;
      },
      async listBySite() {
        return [domain];
      },
      async clearPrimaryForSite() {},
    };

    const menuRepo: WebsiteMenuRepositoryPort = {
      async upsert(menu) {
        return menu;
      },
      async listBySite() {
        return menus;
      },
    };

    const outbox: OutboxPort = {
      async enqueue() {},
    } as OutboxPort;

    const publishUseCase = new PublishWebsitePageUseCase({
      logger: console as any,
      pageRepo,
      snapshotRepo,
      cmsRead,
      siteRepo,
      menuRepo,
      customAttributes: {
        async getAttributes() {
          return {};
        },
        async upsertAttributes() {
          return {};
        },
        async deleteAttributes() {},
      },
      outbox,
      uow,
      idGenerator: { newId: () => "snap-1" } as any,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const publishResult = await publishUseCase.execute(
      { pageId: page.id },
      { tenantId: "tenant-1" }
    );
    const publishOutput = unwrap(publishResult);
    const snapshotPayload = publishOutput.snapshot.payloadJson as { content?: WebsitePageContent };
    expect(snapshotPayload.content?.blocks.map((block) => block.type)).toEqual([
      "hero",
      "schedule",
      "footer",
    ]);
    expect(snapshotPayload.content?.blocks.map((block) => block.enabled)).toEqual([
      true,
      false,
      true,
    ]);

    const resolveUseCase = new ResolveWebsitePublicPageUseCase({
      logger: console as any,
      domainRepo,
      siteRepo,
      pageRepo,
      snapshotRepo,
      menuRepo,
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
      publicWorkspaceResolver: {
        resolveFromRequest: async () => {
          throw new Error("not used");
        },
      } as any,
    });

    const liveResult = await resolveUseCase.execute(
      { host: "example.com", path: "/", mode: "live" },
      {}
    );
    const liveOutput = unwrap(liveResult);

    expect(liveOutput.snapshotVersion).toBe(1);
    expect(liveOutput.page.content.blocks.map((block) => block.type)).toEqual([
      "hero",
      "schedule",
      "footer",
    ]);
    expect(liveOutput.page.content.blocks.map((block) => block.enabled)).toEqual([
      true,
      false,
      true,
    ]);
  });
});
