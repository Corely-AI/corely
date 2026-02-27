import { describe, expect, it } from "vitest";
import type { WebsiteSite, UpdateWebsiteSiteInput } from "@corely/contracts";
import { UpdateWebsiteSiteUseCase } from "../application/use-cases/update-site.usecase";
import type { WebsiteSiteRepositoryPort } from "../application/ports/site-repository.port";
import type { WebsiteCustomAttributesPort } from "../application/ports/custom-attributes.port";

const nowIso = "2024-01-01T00:00:00.000Z";

const createSite = (): WebsiteSite => ({
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

describe("UpdateWebsiteSiteUseCase settings", () => {
  it("normalizes and stores common/theme settings in WebsiteSite", async () => {
    const existing = createSite();
    let updatedSite: WebsiteSite | null = null;

    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(site) {
        return site;
      },
      async update(site) {
        updatedSite = site;
        return site;
      },
      async findById() {
        return existing;
      },
      async findByIdPublic() {
        return existing;
      },
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
        return existing;
      },
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    const customAttributes: WebsiteCustomAttributesPort = {
      async getAttributes() {
        return {};
      },
      async upsertAttributes() {
        return {};
      },
      async deleteAttributes() {},
    };

    const useCase = new UpdateWebsiteSiteUseCase({
      logger: console as any,
      siteRepo,
      customAttributes,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const input: UpdateWebsiteSiteInput = {
      common: {
        siteTitle: "Corely Marketing",
        header: {
          showLogo: true,
          cta: {
            label: "Get started",
            href: "/signup",
          },
        },
      },
      theme: {
        colors: {
          primary: "#111827",
          accent: "#10b981",
        },
        typography: {
          headingFont: "Inter",
          bodyFont: "Inter",
        },
      },
    };

    const result = await useCase.execute(
      { siteId: existing.id, input },
      { tenantId: existing.tenantId }
    );

    expect(result.ok).toBe(true);
    expect(updatedSite?.brandingJson).toMatchObject({
      siteTitle: "Corely Marketing",
      header: {
        showLogo: true,
      },
    });
    expect(updatedSite?.themeJson).toMatchObject({
      colors: {
        primary: "#111827",
        accent: "#10b981",
      },
    });
  });

  it("writes custom settings via custom attributes port", async () => {
    const existing = createSite();

    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(site) {
        return site;
      },
      async update(site) {
        return site;
      },
      async findById() {
        return existing;
      },
      async findByIdPublic() {
        return existing;
      },
      async findBySlug() {
        return null;
      },
      async findDefaultByTenant() {
        return existing;
      },
      async setDefault() {},
      async list() {
        return { items: [], total: 0 };
      },
    };

    let deletedKeys: string[] = [];
    let upsertedAttributes: Record<string, unknown> = {};

    const customAttributes: WebsiteCustomAttributesPort = {
      async getAttributes() {
        return {
          oldFlag: true,
          legacyKey: "remove",
        };
      },
      async upsertAttributes(input) {
        upsertedAttributes = input.attributes;
        return input.attributes;
      },
      async deleteAttributes(input) {
        deletedKeys = input.keys;
      },
    };

    const useCase = new UpdateWebsiteSiteUseCase({
      logger: console as any,
      siteRepo,
      customAttributes,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const result = await useCase.execute(
      {
        siteId: existing.id,
        input: {
          custom: {
            oldFlag: false,
            analytics: { provider: "ga4", id: "G-1234" },
          },
        },
      },
      { tenantId: existing.tenantId }
    );

    expect(result.ok).toBe(true);
    expect(deletedKeys).toEqual(["legacyKey"]);
    expect(upsertedAttributes).toEqual({
      oldFlag: false,
      analytics: { provider: "ga4", id: "G-1234" },
    });
  });
});
