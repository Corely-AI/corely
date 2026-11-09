import https from "node:https";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  type FocusedDevConfig,
  type FocusedSurfaceKey,
} from "../../packages/config/src/focused-surfaces";
import type * as FocusedConfig from "../../packages/config/src/focused-surfaces";
const { focusedSurfacePorts } = createRequire(import.meta.url)(
  "../../packages/config/src/focused-surfaces.ts"
) as typeof FocusedConfig;

const reserved =
  /^\/(?:sso(?:\/|$)|api\/(?:session|bff)(?:\/|$)|auth\/(?:callback|logged-out)(?:\/|$))/i;
export function gatewayHeaders(req: IncomingMessage, origin: string, key?: string) {
  const headers = { ...req.headers };
  for (const name of Object.keys(headers)) {
    if (/^(?:x-corely-|x-forwarded-|forwarded$|authorization$|proxy-authorization$)/i.test(name)) {
      delete headers[name];
    }
  }
  headers.host = new URL(origin).host;
  if (key) {
    headers["x-corely-sso-origin"] = origin;
    headers["x-corely-sso-proxy-key"] = key;
  }
  return headers;
}
function proxy(
  req: IncomingMessage,
  res: ServerResponse,
  target: string,
  headers: http.OutgoingHttpHeaders
) {
  const upstream = http.request(
    new URL(req.url ?? "/", target),
    { method: req.method, headers },
    (response) => {
      // Headers can arrive before an API restart truncates the body/stream.
      // Close the downstream socket rather than leaving a successful response open.
      response.once("aborted", () => res.destroy());
      response.once("error", () => res.destroy());
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    }
  );
  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502);
    }
    res.end("Local upstream unavailable");
  });
  req.on("aborted", () => upstream.destroy());
  res.on("close", () => {
    if (!res.writableEnded) {
      upstream.destroy();
    }
  });
  req.pipe(upstream);
}
function probe(surface: FocusedSurfaceKey) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Corely local origin probe</title><h1>Local origin: ${surface}</h1><p>Development transport probe. This is not the focused product client.</p><button id="login">Check sign-in handoff</button><p id="result" role="status"></p><script>document.getElementById('login').onclick=async()=>{try{const pre=await fetch('/api/session/preauth').then(r=>{if(!r.ok)throw Error();return r.json()});const result=await fetch('/api/session/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrfToken:pre.csrfToken,returnPath:'/'})}).then(r=>{if(!r.ok)throw Error();return r.json()});location.assign(result.redirectTo)}catch{document.getElementById('result').textContent='Session API unavailable. Check the local API and SSO configuration.'}};</script></html>`;
}
export function createFocusedGateway(
  config: FocusedDevConfig,
  surfaces: ReadonlySet<FocusedSurfaceKey>,
  probes = false
) {
  const origins = new Map(
    Object.entries(config.origins).map(([key, origin]) => [
      new URL(origin).host,
      { key: key as FocusedSurfaceKey, origin },
    ])
  );
  return https.createServer(
    {
      key: readFileSync(config.server.CORELY_DEV_TLS_KEY),
      cert: readFileSync(config.server.CORELY_DEV_TLS_CERT),
    },
    (req, res) => {
      const surface = origins.get(req.headers.host ?? "");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Referrer-Policy", "no-referrer");
      if (!surface || !surfaces.has(surface.key)) {
        res.writeHead(421);
        res.end("Unregistered or inactive local origin");
        return;
      }
      if (
        !req.url?.startsWith("/") ||
        req.url.startsWith("//") ||
        req.url.includes("\\") ||
        [...req.url].some((character) => character.charCodeAt(0) <= 32)
      ) {
        res.writeHead(400);
        res.end();
        return;
      }
      const pathname = new URL(req.url, surface.origin).pathname;
      if (reserved.test(pathname)) {
        proxy(
          req,
          res,
          config.server.CORELY_DEV_API_ORIGIN,
          gatewayHeaders(req, surface.origin, config.server.CORELY_SSO_PROXY_KEY)
        );
      } else if (probes && surface.key !== "login") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(probe(surface.key));
      } else {
        proxy(
          req,
          res,
          `http://127.0.0.1:${focusedSurfacePorts[surface.key]}`,
          gatewayHeaders(req, surface.origin)
        );
      }
    }
  );
}
