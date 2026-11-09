import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { request } from "node:https";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import type { AddressInfo } from "node:net";
import { parseFocusedDevEnv } from "../../packages/config/src/focused-surfaces";
import { createFocusedGateway } from "./gateway";

const config = parseFocusedDevEnv(
  parseEnv(readFileSync(process.env.CORELY_DEV_ENV_FILE ?? ".env.focused.local", "utf8"))
);
const backend = createServer((req, res) => {
  res.setHeader(
    "Set-Cookie",
    "__Host-corely-preauth=synthetic; Path=/; Secure; HttpOnly; SameSite=Lax"
  );
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      path: req.url,
      origin: req.headers["x-corely-sso-origin"],
      key: req.headers["x-corely-sso-proxy-key"] === config.server.CORELY_SSO_PROXY_KEY,
      authorization: req.headers.authorization,
      forwarded: req.headers["x-forwarded-host"],
      callerOrigin: req.headers.origin,
    })
  );
});
const gateway = createFocusedGateway(
  config,
  new Set(["login", "app-center", "invoice", "hr"]),
  true
);
let port = 0;
beforeAll(async () => {
  await new Promise<void>((done) => backend.listen(0, "127.0.0.1", done));
  // Test-owned upstream only; no application API/database is touched.
  config.server.CORELY_DEV_API_ORIGIN = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`;
  await new Promise<void>((done) => gateway.listen(0, "127.0.0.1", done));
  port = (gateway.address() as AddressInfo).port;
});
afterAll(async () => {
  gateway.closeAllConnections();
  backend.closeAllConnections();
  await Promise.all([
    new Promise<void>((done) => gateway.close(() => done())),
    new Promise<void>((done) => backend.close(() => done())),
  ]);
});
function get(host: string, path: string) {
  return new Promise<{ status: number; body: string; cookies: string[] }>((accept, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        rejectUnauthorized: false,
        headers: {
          host,
          "x-corely-sso-origin": "https://attacker.invalid",
          "x-corely-sso-proxy-key": "attacker",
          "x-forwarded-host": "attacker.invalid",
          authorization: "Bearer attacker",
          origin: "https://attacker.invalid",
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (part: string) => {
          body += part;
        });
        res.on("end", () =>
          accept({ status: res.statusCode ?? 0, body, cookies: res.headers["set-cookie"] ?? [] })
        );
      }
    );
    req.on("error", reject);
    req.end();
  });
}
describe("real loopback HTTPS ingress", () => {
  it.each(["login", "app-center", "invoice", "hr"] as const)(
    "routes %s with fixed server authority and strips spoofed headers",
    async (app) => {
      const origin = config.origins[app];
      const response = await get(
        new URL(origin).host,
        app === "login" ? "/sso/context?request=synthetic" : "/api/session/preauth"
      );
      expect(response.status).toBe(200);
      expect(JSON.parse(response.body)).toMatchObject({
        origin,
        key: true,
        callerOrigin: "https://attacker.invalid",
      });
      expect(JSON.parse(response.body)).not.toHaveProperty("authorization");
      expect(JSON.parse(response.body)).not.toHaveProperty("forwarded");
      expect(response.cookies[0]).toMatch(/Secure; HttpOnly; SameSite=Lax/);
      expect(response.cookies[0]).not.toMatch(/Domain=/i);
    }
  );
  it("routes callback before frontend fallback without changing query parameters", async () => {
    const response = await get(
      new URL(config.origins.invoice).host,
      "/auth/callback?request=a&code=b&state=c"
    );
    expect(JSON.parse(response.body).path).toBe("/auth/callback?request=a&code=b&state=c");
  });
  it("serves a clearly labeled probe without contacting the application API", async () => {
    const response = await get(new URL(config.origins.hr).host, "/");
    expect(response.body).toContain("This is not the focused product client");
    expect(response.body).not.toContain(config.server.CORELY_SSO_PROXY_KEY);
  });
  it("rejects unregistered hosts and network-path request targets", async () => {
    expect((await get("unregistered.corely.test:8443", "/api/session/preauth")).status).toBe(421);
    expect(
      (await get(new URL(config.origins.invoice).host, "//attacker.invalid/api/session/preauth"))
        .status
    ).toBe(400);
  });
});
