import { describe, expect, it } from "vitest";
import type { OutboxPort } from "@corely/kernel";
import type { WebsiteSite } from "@corely/contracts";
import { GetPublicWebsiteExternalContentUseCase } from "../application/use-cases/external-content/get-public-website-external-content.usecase";
import { PatchWebsiteExternalContentDraftUseCase } from "../application/use-cases/external-content/patch-website-external-content-draft.usecase";
import { PublishWebsiteExternalContentUseCase } from "../application/use-cases/external-content/publish-website-external-content.usecase";
import type { WebsiteSiteRepositoryPort } from "../application/ports/site-repository.port";
import type { WebsiteCustomAttributesPort } from "../application/ports/custom-attributes.port";
import {
  WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY,
  WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY,
  normalizeWebsiteExternalContentLocale,
  toWebsiteExternalContentLocaleSlot,
} from "../domain/external-content/external-content";

const nowIso = "2026-02-24T10:00:00.000Z";

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

describe("website external content", () => {
  it("normalizes locale and fallback slot", () => {
    expect(normalizeWebsiteExternalContentLocale("en-us")).toBe("en-US");
    expect(toWebsiteExternalContentLocaleSlot("en-us")).toBe("en-US");
    expect(toWebsiteExternalContentLocaleSlot(undefined)).toBe("default");
  });

  it("blocks preview reads when preview token is invalid", async () => {
    const site = createSite();
    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(value) {
        return value;
      },
      async update(value) {
        return value;
      },
      async findById() {
        return null;
      },
      async findByIdPublic() {
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

    const customAttributes: WebsiteCustomAttributesPort = {
      async getAttributes() {
        return {
          [WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY]: {
            siteCopy: {
              default: {
                nav: { brand: "Corely" },
              },
            },
          },
        };
      },
      async upsertAttributes() {
        return {};
      },
      async deleteAttributes() {},
    };

    const useCase = new GetPublicWebsiteExternalContentUseCase({
      logger: console as any,
      siteRepo,
      customAttributes,
    });

    const result = await useCase.execute(
      {
        siteId: site.id,
        key: "siteCopy",
        mode: "preview",
        previewToken: "bad",
      },
      {}
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("Website:InvalidPreviewToken");
    }
  });

  it("copies draft to published via customization adapter and emits outbox event", async () => {
    const site = createSite();
    const store: Record<string, unknown> = {
      [WEBSITE_EXTERNAL_CONTENT_DRAFT_SETTINGS_KEY]: {
        siteCopy: {
          default: {
            nav: { brand: "Corely Draft" },
          },
        },
      },
      [WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY]: {},
    };

    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(value) {
        return value;
      },
      async update(value) {
        return value;
      },
      async findById() {
        return site;
      },
      async findByIdPublic() {
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

    const customAttributes: WebsiteCustomAttributesPort = {
      async getAttributes() {
        return { ...store };
      },
      async upsertAttributes(input) {
        Object.assign(store, input.attributes);
        return { ...store };
      },
      async deleteAttributes() {},
    };

    const outboxEvents: { eventType: string; payload: unknown }[] = [];
    const outbox: OutboxPort = {
      async enqueue(event) {
        outboxEvents.push({ eventType: event.eventType, payload: event.payload });
      },
    };

    const useCase = new PublishWebsiteExternalContentUseCase({
      logger: console as any,
      siteRepo,
      customAttributes,
      outbox,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const result = await useCase.execute(
      {
        siteId: site.id,
        key: "siteCopy",
      },
      { tenantId: site.tenantId, correlationId: "corr-1" }
    );

    expect(result.ok).toBe(true);
    const published = (store[WEBSITE_EXTERNAL_CONTENT_PUBLISHED_SETTINGS_KEY] as any).siteCopy
      .default;
    expect(published).toEqual({
      nav: { brand: "Corely Draft" },
    });
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0]?.eventType).toBe("website.externalContent.published");
  });

  it("rejects non-JSON siteCopy data on draft patch", async () => {
    const site = createSite();

    const siteRepo: WebsiteSiteRepositoryPort = {
      async create(value) {
        return value;
      },
      async update(value) {
        return value;
      },
      async findById() {
        return site;
      },
      async findByIdPublic() {
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

    const customAttributes: WebsiteCustomAttributesPort = {
      async getAttributes() {
        return {};
      },
      async upsertAttributes() {
        return {};
      },
      async deleteAttributes() {},
    };

    const useCase = new PatchWebsiteExternalContentDraftUseCase({
      logger: console as any,
      siteRepo,
      customAttributes,
      clock: { now: () => new Date(nowIso) } as any,
    });

    const result = await useCase.execute(
      {
        siteId: site.id,
        key: "siteCopy",
        data: {
          nav: {
            onClick: () => "not-json",
          },
        },
      },
      { tenantId: site.tenantId }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("Website:ExternalContentInvalid");
    }
  });
});
