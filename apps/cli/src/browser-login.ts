import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { SsoHandleSchema } from "@corely/contracts/identity/sso";
import open from "open";
import { CliError } from "./errors";

type Callback = { request: string; code: string; state: string };

export async function authorizeInBrowser(
  origin: string,
  start: (input: { port: number; state: string; challenge: string }) => Promise<string>
) {
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const callback = Promise.withResolvers<Callback>();
  // The listener can time out while the start request or browser launch is still pending.
  void callback.promise.catch(() => {});
  let settled = false;

  const server = createServer((request, response) => {
    const base = `http://127.0.0.1:${request.socket.localPort}`;
    const url = URL.parse(request.url ?? "/", base);
    const suppliedState = SsoHandleSchema.safeParse(url?.searchParams.get("state"));
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (
      settled ||
      request.method !== "GET" ||
      request.headers.host !== new URL(base).host ||
      url?.origin !== base ||
      !suppliedState.success ||
      !timingSafeEqual(Buffer.from(suppliedState.data), Buffer.from(state))
    ) {
      response.writeHead(400).end("Invalid Corely CLI callback.");
      return;
    }

    if (url.pathname === "/auth/logged-out") {
      settled = true;
      response.end("Sign-in cancelled. You can close this tab.", () => {
        callback.reject(new CliError("AUTH_CANCELLED", "Sign-in was cancelled."));
      });
      return;
    }
    const code = SsoHandleSchema.safeParse(url.searchParams.get("code"));
    const id = SsoHandleSchema.safeParse(url.searchParams.get("request"));
    if (url.pathname !== "/auth/callback" || !code.success || !id.success) {
      response.writeHead(400).end("Invalid Corely CLI callback.");
      return;
    }
    settled = true;
    response.end("Return to your terminal to finish signing in.", () => {
      callback.resolve({ request: id.data, code: code.data, state });
    });
  });
  server.listen({ host: "127.0.0.1", port: 0, exclusive: true });
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new CliError("AUTH_CALLBACK_FAILED", "Could not start the local sign-in listener.");
  }
  const port = address.port;
  const timer = setTimeout(
    () => {
      callback.reject(
        new CliError("AUTH_EXPIRED", "Sign-in timed out. Run corely auth login again.")
      );
    },
    5 * 60 * 1000
  );
  try {
    const redirect = new URL(await start({ port, state, challenge }));
    if (
      redirect.origin !== origin ||
      redirect.username ||
      redirect.password ||
      redirect.pathname !== "/sso/authorize"
    ) {
      throw new CliError("AUTH_CALLBACK_FAILED", "Corely returned an unexpected sign-in URL.");
    }
    try {
      await open(redirect.toString());
    } catch {
      throw new CliError("BROWSER_UNAVAILABLE", "Could not open the browser for Corely sign-in.");
    }
    return { ...(await callback.promise), verifier, port };
  } finally {
    clearTimeout(timer);
    server.close();
    server.closeAllConnections();
  }
}
