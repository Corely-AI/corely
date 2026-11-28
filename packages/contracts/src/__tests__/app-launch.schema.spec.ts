import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppCatalogItemSchema, AppManifestSchema } from "../platform/app-manifest.schema";
import {
  AppCatalogLaunchSchema,
  AppLaunchDescriptorSchema,
  AppLaunchOriginsSchema,
  buildAppLaunchUrl,
  resolveAppLaunchContext,
} from "../platform/app-launch.schema";
import { isSurfaceAllowed, resolveSurface } from "../platform/surface.schema";

const descriptor = {
  launchId: "invoice",
  surfaceId: "platform",
  displayName: { en: "Invoice", de: "Rechnungen", vi: "Hóa đơn" },
  category: "finance",
  iconKey: "FileText",
  availability: "available",
} as const;
const legacyItem = {
  appId: "invoices",
  name: "Invoices",
  tier: 1,
  version: "1.0.0",
  dependencies: ["parties"],
};
// Frozen pre-SURF-03 catalog shape: Zod strips new additive fields by default.
const oldClientSchema = z.object({
  appId: z.string(),
  name: z.string(),
  tier: z.number(),
  version: z.string(),
  description: z.string().optional(),
  dependencies: z.array(z.string()),
  enabled: z.boolean().optional(),
});

describe("backwards-compatible focused launch contracts", () => {
  it("parses old manifests/catalog payloads and lets old clients consume new payloads", () => {
    expect(AppCatalogItemSchema.parse(legacyItem)).toEqual(legacyItem);
    const oldManifest = { ...legacyItem, capabilities: [], permissions: [], menu: [] };
    expect(AppManifestSchema.parse(oldManifest)).toEqual(oldManifest);
    expect(AppManifestSchema.parse({ ...oldManifest, launch: descriptor }).launch).toEqual(
      descriptor
    );
    const extended = {
      ...legacyItem,
      launch: { ...descriptor, url: "https://invoice.app.corely.one/" },
    };
    expect(AppCatalogItemSchema.parse(extended)).toEqual(extended);
    expect(oldClientSchema.parse(extended)).toEqual(legacyItem);
  });

  it("requires supported categories, contexts, complete translations and honest availability", () => {
    expect(
      AppLaunchDescriptorSchema.safeParse({ ...descriptor, launchId: "payroll" }).success
    ).toBe(false);
    expect(
      AppLaunchDescriptorSchema.safeParse({ ...descriptor, displayName: { en: "Invoice" } }).success
    ).toBe(false);
    expect(AppCatalogLaunchSchema.safeParse(descriptor).success).toBe(false);
    expect(
      AppCatalogLaunchSchema.safeParse({ ...descriptor, url: "javascript:alert(1)" }).success
    ).toBe(false);
    expect(
      AppCatalogLaunchSchema.safeParse({ ...descriptor, url: "https://example.com/redirect" })
        .success
    ).toBe(false);
    expect(
      AppCatalogLaunchSchema.safeParse({
        ...descriptor,
        availability: "coming-soon",
        url: "https://example.com",
      }).success
    ).toBe(false);
    for (const availability of ["coming-soon", "unconfigured", "app-disabled"]) {
      expect(AppCatalogLaunchSchema.safeParse({ ...descriptor, availability }).success).toBe(true);
    }
  });
});

const environments = [
  { invoice: "https://invoice.app.corely.one", hr: "https://hr.app.corely.one" },
  { invoice: "https://invoice.app.staging.corely.one", hr: "https://hr.app.staging.corely.one" },
  { invoice: "http://localhost:4301", hr: "http://localhost:4302" },
];
describe("configured focused context and destination resolution", () => {
  it.each(environments)("uses exact origins for %o", (origins) => {
    for (const id of ["invoice", "hr"] as const) {
      expect(buildAppLaunchUrl(id, origins)).toBe(`${origins[id]}/`);
      expect(resolveAppLaunchContext(origins[id], origins)).toBe(id);
      expect(resolveAppLaunchContext(`${origins[id]}/`, origins)).toBe(id);
      expect(resolveAppLaunchContext(`${origins[id]}/auth/callback`, origins)).toBeUndefined();
    }
    expect(resolveAppLaunchContext("https://unknown.corely.one", origins)).toBeUndefined();
    expect(
      resolveAppLaunchContext("https://invoice.app.corely.one.evil.test", origins)
    ).toBeUndefined();
    expect(resolveAppLaunchContext("http://localhost:4999", origins)).toBeUndefined();
    expect(buildAppLaunchUrl("https://evil.test", origins)).toBeUndefined();
    expect(buildAppLaunchUrl("parties", origins)).toBeUndefined();
    expect(resolveSurface(new URL(origins.invoice).hostname)).toBe("platform");
    expect(isSurfaceAllowed("platform", ["app"])).toBe(true);
    expect(isSurfaceAllowed("app", ["platform"])).toBe(true);
  });

  it("keeps missing destinations unavailable and rejects ambiguous configurations", () => {
    expect(buildAppLaunchUrl("invoice", {})).toBeUndefined();
    expect(resolveAppLaunchContext("https://invoice.app.corely.one", {})).toBeUndefined();
    expect(
      AppLaunchOriginsSchema.safeParse({
        invoice: environments[0].invoice,
        hr: environments[0].invoice,
      }).success
    ).toBe(false);
    expect(
      AppLaunchOriginsSchema.safeParse({ payroll: "https://payroll.corely.one" }).success
    ).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "//evil.test",
    "http://invoice.app.corely.one",
    "https://*.corely.one",
    "https://user:password@evil.test",
    "https://invoice.app.corely.one/path",
    "https://invoice.app.corely.one?next=https://evil.test",
    "https://invoice.app.corely.one#fragment",
    " https://invoice.app.corely.one",
    "https://invoice.app.corely.one\\@evil.test",
    "http://localhost.evil.test:4301",
  ])("rejects unsafe origin %s", (invoice) => {
    expect(AppLaunchOriginsSchema.safeParse({ invoice }).success).toBe(false);
    expect(buildAppLaunchUrl("invoice", { invoice })).toBeUndefined();
    expect(resolveAppLaunchContext(invoice, { invoice })).toBeUndefined();
  });
});
