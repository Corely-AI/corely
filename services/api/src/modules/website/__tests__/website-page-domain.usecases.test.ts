import { describe, expect, it } from "vitest";
import { CreateWebsitePageUseCase } from "../application/use-cases/create-page.usecase";
import { UpdateWebsitePageUseCase } from "../application/use-cases/update-page.usecase";
import { AddWebsiteDomainUseCase } from "../application/use-cases/add-domain.usecase";
import { RemoveWebsiteDomainUseCase } from "../application/use-cases/remove-domain.usecase";
import type { WebsiteDomain, WebsitePage, WebsiteSite } from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../application/ports/page-repository.port";
import type { WebsiteSiteRepositoryPort } from "../application/ports/site-repository.port";
import type { WebsiteDomainRepositoryPort } from "../application/ports/domain-repository.port";

const nowIso = "2024-01-01T00:00:00.000Z";

describe("Website page + domain use cases", () => {
  it("creates page with normalized path + locale", async () => {
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

    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(siteInput) {
        return siteInput;
      },
      async update(siteInput) {
        return siteInput;
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

    const useCase = new CreateWebsitePageUseCase({
      logger: console as any,
      pageRepo,
      siteRepo,
      idGenerator: { newId: () => "page-1" } as any,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const result = await useCase.execute(
      {
        siteId: site.id,
        path: "about/",
        locale: "en-us",
        template: "landing",
        cmsEntryId: "cms-1",
      },
      { tenantId: site.tenantId }
    );

    expect(result.ok).toBe(true);
    expect(createdPage?.path).toBe("/about");
    expect(createdPage?.locale).toBe("en-US");
  });

  it("rejects page updates that collide on path + locale", async () => {
    const existing: WebsitePage = {
      id: "page-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      path: "/about",
      locale: "en-US",
      template: "landing",
      status: "DRAFT",
      cmsEntryId: "cms-1",
      seoTitle: null,
      seoDescription: null,
      seoImageFileId: null,
      publishedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const pageRepo: WebsitePageRepositoryPort = {
      async create(page) {
        return page;
      },
      async update(page) {
        return page;
      },
      async findById() {
        return existing;
      },
      async findByPath(_tenantId, _siteId, path, locale) {
        if (path === "/new" && locale === "en-US") {
          return { ...existing, id: "page-2" };
        }
        return null;
      },
      async list() {
        return { items: [], total: 0 };
      },
    };

    const useCase = new UpdateWebsitePageUseCase({
      logger: console as any,
      pageRepo,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const result = await useCase.execute(
      { pageId: existing.id, input: { path: "/new" } },
      { tenantId: existing.tenantId }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("Website:PagePathTaken");
    }
  });

  it("adds domain as primary when first for site", async () => {
    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(siteInput) {
        return siteInput;
      },
      async update(siteInput) {
        return siteInput;
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
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
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
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    let createdDomain: WebsiteDomain | null = null;
    const domainRepo: WebsiteDomainRepositoryPort = {
      async create(domain) {
        createdDomain = domain;
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
        return null;
      },
      async listBySite() {
        return [];
      },
      async clearPrimaryForSite() {},
    };

    const useCase = new AddWebsiteDomainUseCase({
      logger: console as any,
      domainRepo,
      siteRepo,
      idGenerator: { newId: () => "domain-1" } as any,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const result = await useCase.execute(
      { siteId: "site-1", input: { hostname: "example.com" } },
      { tenantId: "tenant-1" }
    );

    expect(result.ok).toBe(true);
    expect(createdDomain?.isPrimary).toBe(true);
  });

  it("promotes another domain when removing primary", async () => {
    const primary: WebsiteDomain = {
      id: "domain-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      hostname: "primary.com",
      isPrimary: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const secondary: WebsiteDomain = {
      id: "domain-2",
      tenantId: "tenant-1",
      siteId: "site-1",
      hostname: "secondary.com",
      isPrimary: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    let updatedDomain: WebsiteDomain | null = null;
    const domainRepo: WebsiteDomainRepositoryPort = {
      async create(domain) {
        return domain;
      },
      async update(domain) {
        updatedDomain = domain;
        return domain;
      },
      async delete() {},
      async findById() {
        return primary;
      },
      async findByHostname() {
        return null;
      },
      async listBySite() {
        return [secondary];
      },
      async clearPrimaryForSite() {},
    };

    const useCase = new RemoveWebsiteDomainUseCase({
      logger: console as any,
      domainRepo,
    });

    const result = await useCase.execute(
      { siteId: "site-1", domainId: "domain-1" },
      { tenantId: "tenant-1" }
    );

    expect(result.ok).toBe(true);
    expect(updatedDomain?.id).toBe("domain-2");
    expect(updatedDomain?.isPrimary).toBe(true);
  });
});
