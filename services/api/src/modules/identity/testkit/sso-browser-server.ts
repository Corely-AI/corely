import { SsoEmailCodeService } from "../application/services/sso-email-code.service";
// Disposable browser-test fixture only. Never imported by AppModule or production entrypoints.
import "reflect-metadata";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Test } from "@nestjs/testing";
import { static as staticFiles, type Request, type Response, type NextFunction } from "express";
import { SsoController } from "../adapters/http/sso.controller";
import { SsoHttpSecurity, SSO_COOKIES } from "../adapters/http/sso-http-security";
import { configureSsoHttpTransport } from "../adapters/http/sso-http-transport";
import { SsoService } from "../application/services/sso.service";
import { createSsoTestContext } from "./sso-test-context";

if (process.env.NODE_ENV !== "test") {
  throw new Error("This server requires NODE_ENV=test");
}
const directory = process.env.SSO_TEST_OUTPUT_DIR;
if (!directory?.startsWith("/private/tmp/")) {
  throw new Error("SSO_TEST_OUTPUT_DIR must be under /private/tmp");
}
const origins = {
  login: "https://login.corely.test:8444",
  app: "https://app.corely.test:8444",
  invoice: "https://invoice.app.corely.test:8444",
  hr: "https://hr.app.corely.test:8444",
};
const fixture = await createSsoTestContext(origins, true);
const security = new SsoHttpSecurity(fixture.registrations, fixture.crypto);
const module = await Test.createTestingModule({
  controllers: [SsoController],
  providers: [
    { provide: SsoEmailCodeService, useValue: fixture.emailCodes },
    { provide: SsoService, useValue: fixture.service },
    { provide: SsoHttpSecurity, useValue: security },
  ],
}).compile();
const app = module.createNestApplication({
  logger: false,
  bodyParser: false,
  httpsOptions: {
    key: readFileSync(`${directory}/key.pem`),
    cert: readFileSync(`${directory}/cert.pem`),
  },
});
configureSsoHttpTransport(app);
const root = fileURLToPath(new URL("../../../../../../", import.meta.url));
const assets = resolve(root, "apps/login/dist");
app.use("/assets", staticFiles(resolve(assets, "assets")));
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.path === "/login") {
      security.origin(req, true);
      security.headers(res);
      return res.sendFile(resolve(assets, "index.html"));
    }
    if (req.path === "/") {
      security.origin(req);
      res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
      return res
        .type("html")
        .send(
          `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic app fixture</title><h1>Synthetic Corely app</h1><button id="start">Sign in</button><script>document.getElementById('start').onclick=async()=>{const boot=await fetch('/api/session/preauth').then(r=>r.json());const result=await fetch('/api/session/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrfToken:boot.csrfToken,returnPath:'/signed-in'})}).then(r=>r.json());location.assign(result.redirectTo);};</script></html>`
        );
    }
    if (req.path === "/__fixture/code") {
      security.origin(req, true);
      await fixture.deliverCodes();
      return res.json({ code: fixture.sentCodes.at(-1)?.code });
    }
    if (req.path === "/signed-in") {
      const origin = security.origin(req);
      const registration = fixture.registrations.app(origin);
      const handle = security.cookie(req, SSO_COOKIES.app);
      const session = handle
        ? await fixture.prisma.ssoAppSession.findUnique({
            where: { handleHash: fixture.crypto.hash(handle) },
            include: { family: true },
          })
        : null;
      if (
        !session ||
        session.userId !== fixture.userId ||
        session.appKey !== registration.key ||
        session.family.revokedAt ||
        session.environment !== fixture.registrations.environment
      ) {
        return res.status(401).send("No app session");
      }
      security.headers(res);
      return res
        .type("html")
        .send(
          `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><h1>Signed in to ${registration.key}</h1><p>Verified server session for the synthetic colleague.</p></html>`
        );
    }
    next();
  } catch {
    res.status(400).send("Invalid fixture request");
  }
});
writeFileSync(`${directory}/fixture.json`, JSON.stringify({ email: fixture.email, origins }));
await app.listen(8444, "127.0.0.1");
console.warn("Disposable SSO browser fixture ready on port 8444");
let closing = false;
async function close() {
  if (closing) {
    return;
  }
  closing = true;
  await app.close();
  await fixture.cleanup();
  process.exitCode = 0;
}
process.on("SIGTERM", () => {
  void close();
});
process.on("SIGINT", () => {
  void close();
});
