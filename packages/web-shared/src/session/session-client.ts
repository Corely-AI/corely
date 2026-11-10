import {
  isSafeSsoReturnPath,
  SsoHandleSchema,
  SsoRedirectSchema,
  SsoSessionSchema,
  SsoSessionUserSchema,
  type SsoAppKey,
  type SsoSessionUser,
} from "@corely/contracts";
import { z } from "zod";

export type SessionFailure = "unauthenticated" | "forbidden" | "unavailable";
export class SessionRequestError extends Error {
  constructor(
    readonly status: number,
    readonly kind: SessionFailure | "request"
  ) {
    super(
      kind === "unauthenticated"
        ? "Sign in to continue"
        : kind === "forbidden"
          ? "Access denied"
          : kind === "unavailable"
            ? "Service temporarily unavailable"
            : "Request could not be completed"
    );
  }
}
export interface SessionSurfaceConfig {
  appKey: SsoAppKey;
  tenantId?: string;
  workspaceId?: string;
  /** Only enable when explicitly retiring a former legacy browser origin. */
  retireLegacyStorage?: boolean;
  locale?: "en" | "de" | "vi";
}
export type SessionRequestOptions = Omit<RequestInit, "credentials" | "redirect" | "mode"> & {
  idempotencyKey?: string;
  correlationId?: string;
  /** Keep optional feature outages local; authentication/authorization failures remain fatal. */
  serviceFailureScope?: "request";
};

/** Opt-in browser transport. Never imports the legacy auth/storage adapters. */
export class SessionClient {
  private session: SsoSessionUser | null = null;
  private bootstrapPending: Promise<SsoSessionUser> | null = null;
  private readonly controllers = new Set<AbortController>();
  private readonly pendingCommands = new Set<AbortController>();
  private readonly commandListeners = new Set<() => void>();
  getPendingCommands = () => this.pendingCommands.size;
  subscribePendingCommands = (listener: () => void) => {
    this.commandListeners.add(listener);
    return () => {
      this.commandListeners.delete(listener);
    };
  };
  private readonly listeners = new Set<(kind: SessionFailure) => void>();
  private generation = 0;
  private logoutProof: string | null = null;
  private logoutPending: Promise<void> | null = null;
  private rotationPending: Promise<void> | null = null;
  constructor(
    readonly config: SessionSurfaceConfig,
    private readonly fetchFn: typeof fetch = (input, init) => fetch(input, init)
  ) {}
  onFailure(listener: (kind: SessionFailure) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  dispose() {
    this.generation++;
    this.session = null;
    this.bootstrapPending = null;
    this.rotationPending = null;
    for (const controller of this.controllers) {
      controller.abort();
    }
    this.controllers.clear();
    this.pendingCommands.clear();
    for (const listener of this.commandListeners) {
      listener();
    }
  }
  private fail(error: SessionRequestError) {
    if (error.kind !== "request") {
      this.dispose();
      for (const listener of this.listeners) {
        listener(error.kind);
      }
    }
    return error;
  }
  private async send(
    url: string,
    options: RequestInit = {},
    localServiceFailure = false
  ): Promise<Response> {
    const fail = (error: SessionRequestError) =>
      localServiceFailure && error.kind === "unavailable" ? error : this.fail(error);
    const controller = new AbortController();
    const generation = this.generation;
    const abort = () => controller.abort();
    if (options.signal?.aborted) {
      controller.abort();
    }
    options.signal?.addEventListener("abort", abort, { once: true });
    this.controllers.add(controller);
    if (
      url.startsWith("/api/bff/") &&
      !["GET", "HEAD", "OPTIONS"].includes((options.method ?? "GET").toUpperCase())
    ) {
      this.pendingCommands.add(controller);
      for (const listener of this.commandListeners) {
        listener();
      }
    }
    let bodyOpen = false;
    const cleanup = () => {
      options.signal?.removeEventListener("abort", abort);
      this.controllers.delete(controller);
      if (this.pendingCommands.delete(controller)) {
        for (const listener of this.commandListeners) {
          listener();
        }
      }
    };
    try {
      const response = await this.fetchFn(url, {
        ...options,
        signal: controller.signal,
        credentials: "same-origin",
        // CORS mode preserves Origin on POST under no-referrer (including WebKit).
        // All targets are validated relative paths; credentials remain same-origin
        // and redirects are rejected. Server origin/CSRF checks remain authoritative.
        mode: "cors",
        redirect: "error",
        cache: "no-store",
      });
      if (generation !== this.generation) {
        throw new DOMException("Stale session request", "AbortError");
      }
      if (!response.ok) {
        throw fail(
          new SessionRequestError(
            response.status,
            response.status === 401
              ? "unauthenticated"
              : response.status === 403
                ? "forbidden"
                : response.status >= 500 || response.status === 429
                  ? "unavailable"
                  : "request"
          )
        );
      }
      if (!response.body || [204, 205, 304].includes(response.status)) {
        return response;
      }
      // Keep cancellation attached after headers, until the body/stream is consumed.
      const reader = response.body.getReader();
      bodyOpen = true;
      const stream = new ReadableStream<Uint8Array>({
        pull: async (sink) => {
          try {
            const part = await reader.read();
            if (generation !== this.generation) {
              throw new DOMException("Stale response", "AbortError");
            }
            if (part.done) {
              cleanup();
              sink.close();
            } else {
              sink.enqueue(part.value);
            }
          } catch (error) {
            cleanup();
            // Headers are not the end of a fetch: downloads/SSE/JSON can fail later.
            // Preserve intentional cancellation and stale-scope errors without changing
            // the new scope's state; normalize a live connection failure exactly once.
            sink.error(
              controller.signal.aborted || generation !== this.generation
                ? error
                : fail(new SessionRequestError(503, "unavailable"))
            );
          }
        },
        cancel: async (reason) => {
          cleanup();
          controller.abort();
          await reader.cancel(reason);
        },
      });
      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      if (
        error instanceof SessionRequestError ||
        controller.signal.aborted ||
        generation !== this.generation
      ) {
        throw error;
      }
      throw fail(new SessionRequestError(503, "unavailable"));
    } finally {
      if (!bodyOpen) {
        cleanup();
      }
    }
  }
  bootstrap(): Promise<SsoSessionUser> {
    if (!this.bootstrapPending) {
      const generation = this.generation;
      this.bootstrapPending = (async () => {
        try {
          const headers = new Headers();
          if (this.config.tenantId) {
            headers.set("x-tenant-id", this.config.tenantId);
          }
          if (this.config.workspaceId) {
            headers.set("x-workspace-id", this.config.workspaceId);
          }
          const response = await this.send("/api/session/user", { headers });
          const result = SsoSessionUserSchema.parse(await response.json());
          if (generation !== this.generation) {
            throw new DOMException("Stale bootstrap", "AbortError");
          }
          if (result.appKey !== this.config.appKey || Date.parse(result.expiresAt) <= Date.now()) {
            throw new Error("Invalid session binding");
          }
          if (this.session && this.session.user.userId !== result.user.userId) {
            // A host cookie can change in another tab. Do not admit the former
            // account's outstanding responses into a newly verified account.
            this.dispose();
          }
          this.session = result;
          return result;
        } catch (error) {
          if (error instanceof SessionRequestError || generation !== this.generation) {
            throw error;
          }
          throw this.fail(new SessionRequestError(503, "unavailable"));
        } finally {
          if (generation === this.generation) {
            this.bootstrapPending = null;
          }
        }
      })();
    }
    return this.bootstrapPending;
  }
  async request(path: string, options: SessionRequestOptions = {}): Promise<Response> {
    // The backend owns the route allowlist. This client accepts relative API paths only.
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      /[\\#]|%(?:25|2f|5c)/i.test(path) ||
      new URL(path, "https://local.invalid").pathname !== path.split("?")[0]
    ) {
      throw new Error("Invalid API path");
    }
    if (!this.session || Date.parse(this.session.expiresAt) <= Date.now()) {
      throw this.fail(new SessionRequestError(401, "unauthenticated"));
    }
    const headers = new Headers(options.headers);
    const { idempotencyKey, correlationId, serviceFailureScope, ...init } = options;
    for (const name of headers.keys()) {
      if (
        [
          "authorization",
          "cookie",
          "x-user-id",
          "x-role-ids",
          "x-tenant-id",
          "x-workspace-id",
        ].includes(name) ||
        name.startsWith("x-corely-") ||
        name.startsWith("x-forwarded-")
      ) {
        throw new Error("Identity headers are managed by the session transport");
      }
    }
    headers.set("x-csrf-token", this.session.csrfToken);
    if (this.config.tenantId) {
      headers.set("x-tenant-id", this.config.tenantId);
    }
    if (this.config.workspaceId) {
      headers.set("x-workspace-id", this.config.workspaceId);
    }
    if (idempotencyKey) {
      headers.set("x-idempotency-key", idempotencyKey);
    }
    if (correlationId) {
      headers.set("x-correlation-id", correlationId);
    }
    // One attempt, including mutations and streams. Query defaults also disable retries.
    return this.send(`/api/bff${path}`, { ...init, headers }, serviceFailureScope === "request");
  }
  async json<T>(
    path: string,
    schema: z.ZodType<T>,
    options: SessionRequestOptions = {}
  ): Promise<T> {
    const generation = this.generation;
    const result = schema.parse(await (await this.request(path, options)).json());
    if (generation !== this.generation) {
      throw new DOMException("Stale JSON response", "AbortError");
    }
    return result;
  }
  rotate(): Promise<void> {
    if (!this.rotationPending) {
      const pending: Promise<void> = this.rotateOnce().finally(() => {
        // A synchronous preflight failure also invalidates the generation. Clear
        // this promise by identity so it cannot poison rotation after recovery.
        if (this.rotationPending === pending) {
          this.rotationPending = null;
        }
      });
      this.rotationPending = pending;
    }
    return this.rotationPending;
  }
  private async rotateOnce(): Promise<void> {
    if (!this.session) {
      throw this.fail(new SessionRequestError(401, "unauthenticated"));
    }
    const generation = this.generation;
    const response = await this.send("/api/session/rotate", {
      method: "POST",
      headers: { "x-csrf-token": this.session.csrfToken },
    });
    const metadata = SsoSessionSchema.parse(await response.json());
    if (generation === this.generation && this.session) {
      this.session = { ...this.session, ...metadata };
    }
  }
  logout(): Promise<void> {
    if (this.logoutPending) {
      return this.logoutPending;
    }
    const proof = this.logoutProof ?? this.session?.csrfToken;
    if (!proof) {
      return Promise.reject(new SessionRequestError(401, "unauthenticated"));
    }
    // Retain only the proof for an explicit logout retry, never readable account data.
    this.logoutProof = proof;
    this.dispose();
    const pending = this.send("/api/session/logout", {
      method: "POST",
      headers: { "x-csrf-token": proof },
    })
      .then(async (response) => {
        await response.arrayBuffer();
        this.logoutProof = null;
      })
      .finally(() => {
        if (this.logoutPending === pending) {
          this.logoutPending = null;
        }
      });
    this.logoutPending = pending;
    return pending;
  }
  async startLogin(returnPath: string): Promise<string> {
    if (!isSafeSsoReturnPath(returnPath)) {
      throw new Error("Invalid return path");
    }
    const boot = z
      .object({ csrfToken: SsoHandleSchema })
      .parse(await (await this.send("/api/session/preauth")).json());
    const response = await this.send("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnPath, csrfToken: boot.csrfToken }),
    });
    const { redirectTo } = SsoRedirectSchema.parse(await response.json());
    const target = new URL(redirectTo);
    if (
      target.protocol !== "https:" ||
      target.username ||
      target.password ||
      target.pathname !== "/sso/authorize"
    ) {
      throw new Error("Invalid login destination");
    }
    return target.href;
  }
}
