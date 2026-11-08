import { describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { EnvService, envSchema } from "@corely/config";
import { APP_LAUNCH_ORIGINS_TOKEN } from "../application/ports/app-launch-origins.port";
import { appLaunchOriginsProvider } from "../infrastructure/configuration/app-launch-origins.provider";

const compile = (origins: Record<string, string> = {}) =>
  Test.createTestingModule({
    providers: [
      appLaunchOriginsProvider,
      {
        provide: EnvService,
        useValue: new EnvService(
          envSchema.parse({ DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test", ...origins })
        ),
      },
    ],
  }).compile();

describe("deployment launch configuration initialization", () => {
  it("allows absent origins without inventing deployed destinations", async () => {
    const module = await compile();
    expect(module.get(APP_LAUNCH_ORIGINS_TOKEN)).toEqual({});
    await module.close();
  });

  it("uses typed deployment values and normalizes a trailing root slash", async () => {
    const module = await compile({
      CORELY_LAUNCH_INVOICE_ORIGIN: "https://invoice.app.corely.one/",
      CORELY_LAUNCH_HR_ORIGIN: "https://hr.app.corely.one",
    });
    expect(module.get(APP_LAUNCH_ORIGINS_TOKEN)).toEqual({
      invoice: "https://invoice.app.corely.one",
      hr: "https://hr.app.corely.one",
    });
    await module.close();
  });

  it.each([
    { CORELY_LAUNCH_INVOICE_ORIGIN: "https://invoice.app.corely.one/redirect" },
    { CORELY_LAUNCH_INVOICE_ORIGIN: "http://invoice.app.corely.one" },
    {
      CORELY_LAUNCH_INVOICE_ORIGIN: "https://invoice.app.corely.one",
      CORELY_LAUNCH_HR_ORIGIN: "https://invoice.app.corely.one/",
    },
  ])("fails initialization for unsafe or ambiguous origins: %o", async (origins) => {
    await expect(compile(origins)).rejects.toThrow();
  });
});
