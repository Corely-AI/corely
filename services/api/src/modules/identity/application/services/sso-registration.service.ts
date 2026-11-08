import { Injectable, NotFoundException } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { SsoAppKeySchema, type SsoAppKey } from "@corely/contracts";
import { z } from "zod";

const originSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.origin === value && !url.username && !url.password && url.protocol === "https:";
  }, "SSO origins must be exact HTTPS origins without paths");
const settingsSchema = z
  .object({
    loginOrigin: originSchema,
    apps: z
      .array(z.object({ key: SsoAppKeySchema, origin: originSchema }).strict())
      .min(1)
      .max(3),
  })
  .strict()
  .superRefine((settings, ctx) => {
    if (
      new Set(settings.apps.map((a) => a.key)).size !== settings.apps.length ||
      new Set([settings.loginOrigin, ...settings.apps.map((a) => a.origin)]).size !==
        settings.apps.length + 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SSO registrations must have unique keys and origins",
      });
    }
  });

@Injectable()
export class SsoRegistrationService {
  readonly environment: string;
  readonly enabled: boolean;
  readonly loginOrigin: string;
  readonly apps: ReadonlyArray<{ key: SsoAppKey; origin: string }>;
  readonly encryptionKey: string;
  readonly proxyKey: string | undefined;
  constructor(env: EnvService) {
    this.environment = env.APP_ENV;
    this.enabled = env.getValue("CORELY_SSO_ENABLED");
    this.encryptionKey = env.getValue("CORELY_SSO_SECRET") ?? "";
    this.proxyKey = env.getValue("CORELY_SSO_PROXY_KEY");
    const settings = this.enabled
      ? settingsSchema.parse(JSON.parse(env.getValue("CORELY_SSO_REGISTRATIONS") ?? "{}"))
      : null;
    if (this.enabled && !/^[a-f0-9]{64}$/i.test(this.encryptionKey)) {
      throw new Error("CORELY_SSO_SECRET must be a 32-byte hex key when SSO is enabled");
    }
    this.loginOrigin = settings?.loginOrigin ?? "";
    this.apps =
      settings?.apps.map((app) => ({
        key: SsoAppKeySchema.parse(app.key),
        origin: originSchema.parse(app.origin),
      })) ?? [];
  }
  assertEnabled(): void {
    if (!this.enabled) {
      throw new NotFoundException();
    }
  }
  app(origin: string) {
    this.assertEnabled();
    const app = this.apps.find((app) => app.origin === origin);
    if (!app) {
      throw new NotFoundException();
    }
    return app;
  }
}
