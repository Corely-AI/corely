import { Readable } from "node:stream";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { proxySigningRequest } from "@corely/web-shared/server/signing-proxy";

export function signingDevProxy(config: Parameters<typeof proxySigningRequest>[2]): Plugin {
  function install(server: ViteDevServer | PreviewServer) {
    server.middlewares.use((incoming, outgoing, next) => {
      const url = new URL(incoming.url ?? "/", "http://localhost");
      const action = /^\/api\/signing\/([^/]+)$/.exec(url.pathname)?.[1];
      if (!action) {
        next();
        return;
      }

      const headers = new Headers();
      for (const name of ["origin", "x-sign-action", "cookie"]) {
        const value = incoming.headers[name];
        if (typeof value === "string") {
          headers.set(name, value);
        }
      }
      const method = incoming.method ?? "GET";
      const init = {
        method,
        headers,
        body: method === "POST" ? (Readable.toWeb(incoming) as ReadableStream<Uint8Array>) : null,
        duplex: "half" as const,
      };
      void proxySigningRequest(new Request(url, init), action, config)
        .then(async (response) => {
          outgoing.statusCode = response.status;
          response.headers.forEach((value, name) => outgoing.setHeader(name, value));
          outgoing.end(Buffer.from(await response.arrayBuffer()));
        })
        .catch(next);
    });
  }

  return {
    name: "corely-signing-proxy",
    configureServer: install,
    configurePreviewServer: install,
  };
}
