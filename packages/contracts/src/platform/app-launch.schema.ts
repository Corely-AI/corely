import { z } from "zod";

/** Focused product contexts, not installation IDs or new authorization surfaces. */
export const AppLaunchIdSchema = z.enum(["invoice", "hr"]);
export type AppLaunchId = z.infer<typeof AppLaunchIdSchema>;

/** Exact deployment origins only; HTTP is restricted to loopback development. */
export const AppLaunchOriginSchema = z
  .string()
  .superRefine((value, ctx) => {
    try {
      const url = new URL(value);
      const local =
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.hostname.endsWith(".localhost");
      if (
        (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.hostname.includes("*") ||
        (value !== url.origin && value !== `${url.origin}/`)
      ) {
        throw new Error("Invalid launch origin");
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected an exact HTTPS origin (HTTP only on loopback)",
      });
    }
  })
  .transform((value) => new URL(value).origin);

export const AppLaunchOriginsSchema = z
  .object({
    invoice: AppLaunchOriginSchema.optional(),
    hr: AppLaunchOriginSchema.optional(),
    legacy: AppLaunchOriginSchema.optional(),
  })
  .strict()
  .superRefine((origins, ctx) => {
    if (origins.invoice && origins.invoice === origins.hr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Focused app origins must be distinct",
      });
    }
  });
export type AppLaunchOrigins = z.infer<typeof AppLaunchOriginsSchema>;

export const AppLaunchDescriptorSchema = z.object({
  launchId: AppLaunchIdSchema,
  surfaceId: z.literal("platform"),
  displayName: z.object({ en: z.string().min(1), de: z.string().min(1), vi: z.string().min(1) }),
  category: z.enum(["finance", "people"]),
  iconKey: z.string().min(1),
  availability: z.enum(["available", "coming-soon"]),
});
export type AppLaunchDescriptor = z.infer<typeof AppLaunchDescriptorSchema>;

export const AppCatalogLaunchSchema = AppLaunchDescriptorSchema.extend({
  availability: z.enum(["available", "coming-soon", "unconfigured", "app-disabled"]),
  url: AppLaunchOriginSchema.transform((origin) => `${origin}/`).optional(),
}).superRefine((launch, ctx) => {
  if ((launch.availability === "available") !== (launch.url !== undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Only available launches must have a URL",
    });
  }
});
export type AppCatalogLaunch = z.infer<typeof AppCatalogLaunchSchema>;

/** Does not accept a return URL, path, tenant URL or unknown launch identifier. */
export const buildAppLaunchUrl = (
  launchId: string,
  origins: AppLaunchOrigins
): string | undefined => {
  const id = AppLaunchIdSchema.safeParse(launchId);
  const config = AppLaunchOriginsSchema.safeParse(origins);
  if (!id.success || !config.success) {
    return undefined;
  }
  const origin = config.data[id.data];
  return origin ? `${origin}/` : undefined;
};

/** Origin includes protocol and port, so local clients on one host stay distinct.
 * Navigation context only: this does not establish trusted backend authority.
 */
export const resolveAppLaunchContext = (
  origin: string,
  origins: AppLaunchOrigins
): AppLaunchId | undefined => {
  const input = AppLaunchOriginSchema.safeParse(origin);
  const config = AppLaunchOriginsSchema.safeParse(origins);
  if (!input.success || !config.success) {
    return undefined;
  }
  return AppLaunchIdSchema.options.find((id) => config.data[id] === input.data);
};
