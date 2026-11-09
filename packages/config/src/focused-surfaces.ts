import { z } from "zod";

export const focusedSurfaceKeys = ["login", "app-center", "invoice", "hr"] as const;
export type FocusedSurfaceKey = (typeof focusedSurfaceKeys)[number];
export const focusedSurfacePorts = {
  login: 8094,
  "app-center": 8095,
  invoice: 8096,
  hr: 8097,
} as const;
const localOrigin = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.origin === value &&
      url.protocol === "https:" &&
      /^(?:login|app|invoice\.app|hr\.app)\.corely\.test$/.test(url.hostname)
    );
  }, "Use an exact HTTPS *.corely.test origin without a path");
const loopbackOrigin = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.origin === value && url.protocol === "http:" && url.hostname === "127.0.0.1";
  }, "API upstream must be an exact http://127.0.0.1 origin");

/** Public build configuration only. Session/BFF traffic remains same-origin. */
export const focusedBrowserEnvSchema = z
  .object({
    VITE_CORELY_API_BASE_PATH: z.literal("/api/bff"),
    VITE_CORELY_LOGIN_ORIGIN: localOrigin,
    VITE_CORELY_APP_CENTER_ORIGIN: localOrigin,
    VITE_CORELY_INVOICE_ORIGIN: localOrigin,
    VITE_CORELY_HR_ORIGIN: localOrigin,
  })
  .strict()
  .superRefine((env, ctx) => {
    const values = Object.entries(env)
      .filter(([key]) => key.endsWith("_ORIGIN"))
      .map(([, value]) => value);
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: "custom", message: "Focused surfaces must have distinct origins" });
    }
  });
export const focusedDevEnvSchema = z.object({
  CORELY_DEV_API_ORIGIN: loopbackOrigin,
  CORELY_DEV_TLS_KEY: z.string().min(1),
  CORELY_DEV_TLS_CERT: z.string().min(1),
  CORELY_SSO_SECRET: z.string().regex(/^[a-f0-9]{64}$/i),
  CORELY_SSO_PROXY_KEY: z
    .string()
    .min(32)
    .refine((value) => !value.includes("PLACEHOLDER")),
});
export function parseFocusedDevEnv(input: Record<string, string | undefined>) {
  // Fail before Vite can expose arbitrary secret-looking VITE_* settings.
  for (const key of Object.keys(input)) {
    if (
      key.startsWith("VITE_") &&
      !Object.keys(focusedBrowserEnvSchema.innerType().shape).includes(key)
    ) {
      throw new Error(
        `Unsupported browser variable: ${key}; use only VITE_CORELY_* public settings`
      );
    }
  }
  const publicInput = Object.fromEntries(
    Object.entries(input).filter(([key]) => key.startsWith("VITE_"))
  );
  const browser = focusedBrowserEnvSchema.parse(publicInput);
  const server = focusedDevEnvSchema.parse(input);
  const origins = {
    login: browser.VITE_CORELY_LOGIN_ORIGIN,
    "app-center": browser.VITE_CORELY_APP_CENTER_ORIGIN,
    invoice: browser.VITE_CORELY_INVOICE_ORIGIN,
    hr: browser.VITE_CORELY_HR_ORIGIN,
  };
  const ports = new Set(Object.values(origins).map((value) => new URL(value).port || "443"));
  if (ports.size !== 1) {
    throw new Error("All local origins must share the TLS gateway port");
  }
  const hosts = {
    login: "login.corely.test",
    "app-center": "app.corely.test",
    invoice: "invoice.app.corely.test",
    hr: "hr.app.corely.test",
  };
  for (const key of focusedSurfaceKeys) {
    if (new URL(origins[key]).hostname !== hosts[key]) {
      throw new Error(`Wrong registered hostname for ${key}`);
    }
  }
  const apps = (["app-center", "invoice", "hr"] as const).map((key) => ({
    key,
    origin: origins[key],
  }));
  return {
    browser,
    server,
    origins,
    apiEnv: {
      CORELY_SSO_ENABLED: "true",
      CORELY_SSO_SECRET: server.CORELY_SSO_SECRET,
      CORELY_SSO_PROXY_KEY: server.CORELY_SSO_PROXY_KEY,
      CORELY_SSO_REGISTRATIONS: JSON.stringify({ loginOrigin: origins.login, apps }),
      CORELY_LAUNCH_INVOICE_ORIGIN: origins.invoice,
      CORELY_LAUNCH_HR_ORIGIN: origins.hr,
    },
    callbacks: Object.fromEntries(apps.map(({ key, origin }) => [key, `${origin}/auth/callback`])),
  };
}
export type FocusedDevConfig = ReturnType<typeof parseFocusedDevEnv>;
