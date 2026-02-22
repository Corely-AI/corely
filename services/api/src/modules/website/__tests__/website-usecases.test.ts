import { describe, expect, it } from "vitest";
import { unwrap, type TransactionContext, type UnitOfWorkPort } from "@corely/kernel";
import { PublishWebsitePageUseCase } from "../application/use-cases/publish-page.usecase";
import { ResolveWebsitePublicPageUseCase } from "../application/use-cases/resolve-public-page.usecase";
import { ResolveWebsitePublicSiteSettingsUseCase } from "../application/use-cases/resolve-public-site-settings.usecase";
import { GenerateWebsitePageFromPromptUseCase } from "../application/use-cases/generate-page-from-prompt.usecase";
import type {
  WebsitePage,
  WebsitePageSnapshot,
  WebsiteDomain,
  WebsiteSite,
  WebsiteMenu,
  GenerateWebsitePageOutput,
} from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../application/ports/page-repository.port";
import type { WebsiteSnapshotRepositoryPort } from "../application/ports/snapshot-repository.port";
import type { CmsReadPort } from "../application/ports/cms-read.port";
import type { OutboxPort } from "@corely/kernel";
import type { WebsiteDomainRepositoryPort } from "../application/ports/domain-repository.port";
import type { WebsiteSiteRepositoryPort } from "../application/ports/site-repository.port";
import type { WebsiteMenuRepositoryPort } from "../application/ports/menu-repository.port";
import type { CmsWritePort } from "../application/ports/cms-write.port";
import type { WebsiteAiGeneratorPort } from "../application/ports/website-ai.port";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";

const nowIso = "2024-01-01T00:00:00.000Z";

class FakeUow implements UnitOfWorkPort {
  constructor(private readonly tx: TransactionContext) {}
  async withinTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return fn(this.tx);
  }
}

describe("Website use cases", () => {
  it("publishes page with snapshot + outbox in same transaction", async () => {
    const tx = {} as TransactionContext;
    const uow = new FakeUow(tx);

    const page: WebsitePage = {
      id: "page-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      path: "/about",
      locale: "en-US",
      template: "landing",
      status: "DRAFT",
      cmsEntryId: "cms-1",
      seoTitle: "About",
      seoDescription: "About us",
      seoImageFileId: null,
      publishedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const pageRepo: WebsitePageRepositoryPort = {
      async create() {
        throw new Error("not used");
      },
      async update(updated, txParam) {
        expect(txParam).toBe(tx);
        return updated;
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

    let snapshotTx: TransactionContext | undefined;
    const snapshotRepo: WebsiteSnapshotRepositoryPort = {
      async create(snapshot, txParam) {
        snapshotTx = txParam;
        return snapshot;
      },
      async findLatest() {
        return null;
      },
      async getLatestVersion() {
        return 0;
      },
    };

    const cmsRead: CmsReadPort = {
      async getEntryForWebsiteRender() {
        return {
          entryId: "cms-1",
          title: "About",
          excerpt: "About",
          contentJson: { type: "doc", content: [] },
          contentHtml: "<p>About</p>",
          contentText: "About",
          status: "DRAFT",
          updatedAt: nowIso,
          publishedAt: null,
        };
      },
      async getEntryContentJson() {
        return { templateKey: "landing", blocks: [] };
      },
    };

    let outboxTx: TransactionContext | undefined;
    const outbox: OutboxPort = {
      async enqueue(_event, txParam) {
        outboxTx = txParam as TransactionContext;
      },
    } as OutboxPort;

    const useCase = new PublishWebsitePageUseCase({
      logger: console as any,
      pageRepo,
      snapshotRepo,
      cmsRead,
      siteRepo: {
        async create(site) {
          return site;
        },
        async update(site) {
          return site;
        },
        async findById() {
          return {
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
          };
        },
        async findByIdPublic() {
          return null;
        },
        async findBySlug() {
          return null;
        },
        async findDefaultByTenant() {
          return null;
        },
        async setDefault() {},
        async list() {
          return { items: [], total: 0 };
        },
      },
      menuRepo: {
        async upsert(menu) {
          return menu;
        },
        async listBySite() {
          return [];
        },
      },
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

    const result = await useCase.execute({ pageId: "page-1" }, { tenantId: "tenant-1" });
    const output = unwrap(result);

    expect(output.snapshot.id).toBe("snap-1");
    expect(snapshotTx).toBe(tx);
    expect(outboxTx).toBe(tx);
  });

  it("resolves latest snapshot for live mode", async () => {
    const domainRepo: WebsiteDomainRepositoryPort = {
      async create() {
        throw new Error("not used");
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
          siteId: "site-1",
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
      async create(site) {
        return site;
      },
      async update(site) {
        return site;
      },
      async findById() {
        const site: WebsiteSite = {
          id: "site-1",
          tenantId: "tenant-1",
          name: "Site",
          slug: "site",
          defaultLocale: "en-US",
          brandingJson: {
            siteTitle: "Site",
            logo: {
              fileId: "logo-file-id",
              url: "/public/documents/files/logo-file-id",
            },
            favicon: {
              fileId: "favicon-file-id",
              url: "/public/documents/files/favicon-file-id",
            },
            header: { showLogo: true },
            footer: { links: [] },
            socials: {},
            seo: {},
          },
          themeJson: { colors: { primary: "#111827" }, typography: {}, tokens: {} },
          isDefault: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        return site;
      },
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
        const site: WebsiteSite = {
          id: "site-1",
          tenantId: "tenant-1",
          name: "Site",
          slug: "site",
          defaultLocale: "en-US",
          brandingJson: {
            siteTitle: "Site",
            logo: {},
            favicon: {},
            header: { showLogo: true },
            footer: { links: [] },
            socials: {},
            seo: {},
          },
          themeJson: { colors: { primary: "#111827" }, typography: {}, tokens: {} },
          isDefault: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        return site;
      },
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    const pageRepo: WebsitePageRepositoryPort = {
      async create(page) {
        return page;
      },
      async update(page) {
        return page;
      },
      async findById() {
        return null;
      },
      async findByPath() {
        const page: WebsitePage = {
          id: "page-1",
          tenantId: "tenant-1",
          siteId: "site-1",
          path: "/",
          locale: "en-US",
          template: "landing",
          status: "PUBLISHED",
          cmsEntryId: "cms-1",
          seoTitle: "Home",
          seoDescription: "Home",
          seoImageFileId: null,
          publishedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
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
        const snapshot: WebsitePageSnapshot = {
          id: "snap-2",
          tenantId: "tenant-1",
          siteId: "site-1",
          pageId: "page-1",
          path: "/",
          locale: "en-US",
          version: 2,
          payloadJson: { template: "landing", content: { blocks: [] } },
          createdAt: nowIso,
        };
        return snapshot;
      },
      async getLatestVersion() {
        return 2;
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
          siteId: "site-1",
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
        throw new Error("not used");
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
        async getPublicUrl(fileId: string) {
          return `https://cdn.example.com/${fileId}`;
        },
      },
      cmsRead,
      customAttributes: {
        async getAttributes() {
          return { gaTrackingId: "G-1234" };
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

    const result = await useCase.execute({ host: "example.com", path: "/", mode: "live" }, {});
    const output = unwrap(result);

    expect(output.snapshotVersion).toBe(2);
    expect(output.template).toBe("landing");
    expect(output.page.templateKey).toBe("landing");
    expect(output.settings.common.siteTitle).toBe("Site");
    expect(output.settings.common.logo.url).toBe("https://cdn.example.com/logo-file-id");
    expect(output.settings.common.favicon.url).toBe("https://cdn.example.com/favicon-file-id");
    expect(output.settings.theme.colors.primary).toBe("#111827");
    expect(output.settings.custom.gaTrackingId).toBe("G-1234");
  });

  it("resolves public site settings by siteId", async () => {
    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(site) {
        return site;
      },
      async update(site) {
        return site;
      },
      async findById() {
        return null;
      },
      async findByIdPublic() {
        const site: WebsiteSite = {
          id: "site-1",
          tenantId: "tenant-1",
          name: "Site",
          slug: "site",
          defaultLocale: "en-US",
          brandingJson: {
            siteTitle: "Site",
            logo: { fileId: "logo-file-id" },
            favicon: { fileId: "favicon-file-id" },
            header: { showLogo: true },
            footer: { links: [] },
            socials: {},
            seo: {},
          },
          themeJson: { colors: {}, typography: {}, tokens: {} },
          isDefault: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        return site;
      },
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
        return null;
      },
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    const useCase = new ResolveWebsitePublicSiteSettingsUseCase({
      logger: console as any,
      siteRepo,
      customAttributes: {
        async getAttributes() {
          return { gaTrackingId: "G-1234" };
        },
        async upsertAttributes() {
          return {};
        },
        async deleteAttributes() {},
      },
      publicFileUrlPort: {
        async getPublicUrl(fileId: string) {
          return `https://cdn.example.com/${fileId}`;
        },
      },
    });

    const result = await useCase.execute({ siteId: "site-1" }, {});
    const output = unwrap(result);

    expect(output.siteId).toBe("site-1");
    expect(output.settings.common.siteTitle).toBe("Site");
    expect(output.settings.common.logo.url).toBe("https://cdn.example.com/logo-file-id");
    expect(output.settings.common.favicon.url).toBe("https://cdn.example.com/favicon-file-id");
    expect(output.settings.custom.gaTrackingId).toBe("G-1234");
  });

  it("maps legacy branding logoUrl/faviconUrl into public settings", async () => {
    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(site) {
        return site;
      },
      async update(site) {
        return site;
      },
      async findById() {
        return null;
      },
      async findByIdPublic() {
        const site: WebsiteSite = {
          id: "site-1",
          tenantId: "tenant-1",
          name: "Site",
          slug: "site",
          defaultLocale: "en-US",
          brandingJson: {
            brandName: "Legacy Brand",
            logoUrl: "https://legacy.example/logo.svg",
            logoAlt: "Legacy logo",
            faviconUrl: "https://legacy.example/favicon.ico",
            header: { showLogo: true },
            footer: { links: [] },
            socials: {},
            seo: {},
          },
          themeJson: { colors: {}, typography: {}, tokens: {} },
          isDefault: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        return site;
      },
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
        return null;
      },
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    const useCase = new ResolveWebsitePublicSiteSettingsUseCase({
      logger: console as any,
      siteRepo,
      customAttributes: {
        async getAttributes() {
          return {};
        },
        async upsertAttributes() {
          return {};
        },
        async deleteAttributes() {},
      },
      publicFileUrlPort: {
        async getPublicUrl() {
          return null;
        },
      },
    });

    const result = await useCase.execute({ siteId: "site-1" }, {});
    const output = unwrap(result);

    expect(output.settings.common.siteTitle).toBe("Legacy Brand");
    expect(output.settings.common.logo.url).toBe("https://legacy.example/logo.svg");
    expect(output.settings.common.logo.alt).toBe("Legacy logo");
    expect(output.settings.common.favicon.url).toBe("https://legacy.example/favicon.ico");
  });

  it("AI generate creates CMS entry + page", async () => {
    const ai: WebsiteAiGeneratorPort = {
      async generatePageBlueprint() {
        return {
          blueprint: {
            title: "About",
            excerpt: "About us",
            template: "landing",
            suggestedPath: "/about",
            seoTitle: "About",
            seoDescription: "About us",
            contentJson: { type: "doc", content: [] },
          },
          previewSummary: "About — About us",
        };
      },
    };

    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(site) {
        return site;
      },
      async update(site) {
        return site;
      },
      async findById() {
        const site: WebsiteSite = {
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
        };
        return site;
      },
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
        const site: WebsiteSite = {
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
        };
        return site;
      },
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    let createdPage: WebsitePage | null = null;
    const pageRepo: WebsitePageRepositoryPort = {
      async create(page) {
        createdPage = page;
        return page;
      },
      async update(page) {
        return page;
      },
      async findById() {
        return null;
      },
      async findByPath() {
        return null;
      },
      async list() {
        return { items: [], total: 0 };
      },
    };

    let createdEntryId: string | null = null;
    const cmsWrite: CmsWritePort = {
      async createDraftEntryFromBlueprint() {
        createdEntryId = "cms-1";
        return { entryId: "cms-1" };
      },
      async updateDraftEntryContentJson() {},
    };

    const idempotency: IdempotencyStoragePort = {
      async get() {
        return null;
      },
      async store() {},
    };

    const useCase = new GenerateWebsitePageFromPromptUseCase({
      logger: console as any,
      ai,
      siteRepo,
      pageRepo,
      cmsWrite,
      idGenerator: { newId: () => "page-1" } as any,
      clock: { now: () => new Date(nowIso) } as any,
      idempotency,
    });

    const result = await useCase.execute(
      {
        siteId: "site-1",
        locale: "en-US",
        pageType: "landing",
        prompt: "Create an about page",
      },
      { tenantId: "tenant-1", workspaceId: "workspace-1" }
    );

    const output: GenerateWebsitePageOutput = unwrap(result);
    expect(output.pageId).toBe("page-1");
    expect(createdEntryId).toBe("cms-1");
    expect(createdPage?.cmsEntryId).toBe("cms-1");
  });
});
