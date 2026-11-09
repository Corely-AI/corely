import type { ApiClient } from "@corely/auth-client";
import type { SessionClient } from "./session-client";

/** Existing feature API façades can select a transport without a mutable global override. */
export type FeatureHttpClient = Pick<
  ApiClient,
  | "request"
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "generateIdempotencyKey"
  | "generateCorrelationId"
>;
type RequestOptions = Parameters<FeatureHttpClient["request"]>[2];

export class SessionFeatureHttpClient implements FeatureHttpClient {
  constructor(
    private readonly client: SessionClient,
    private readonly serviceFailureScope?: "request"
  ) {}
  generateIdempotencyKey() {
    return crypto.randomUUID();
  }
  generateCorrelationId() {
    return crypto.randomUUID();
  }
  async request<T>(path: string, options: RequestInit = {}, opts?: RequestOptions): Promise<T> {
    if (opts?.workspaceScope === "none") {
      throw new Error("Focused feature requests require workspace scope");
    }
    const method = options.method ?? "GET";
    const response = await this.client.request(path, {
      ...options,
      serviceFailureScope: this.serviceFailureScope,
      signal: opts?.signal ?? options.signal,
      idempotencyKey:
        opts?.idempotencyKey ??
        (!/^(GET|HEAD|OPTIONS)$/i.test(method) ? this.generateIdempotencyKey() : undefined),
      correlationId: opts?.correlationId ?? this.generateCorrelationId(),
    });
    if (opts?.parseJson === false) {
      return response as T;
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
  get<T>(path: string, opts?: Parameters<FeatureHttpClient["get"]>[1]) {
    return this.request<T>(path, { method: "GET" }, opts);
  }
  private write<T>(
    method: string,
    path: string,
    body: unknown,
    opts?: Parameters<FeatureHttpClient["post"]>[2]
  ) {
    const headers = new Headers(opts?.headers);
    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    return this.request<T>(
      path,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
      opts
    );
  }
  post<T>(path: string, body?: unknown, opts?: Parameters<FeatureHttpClient["post"]>[2]) {
    return this.write<T>("POST", path, body, opts);
  }
  put<T>(path: string, body?: unknown, opts?: Parameters<FeatureHttpClient["put"]>[2]) {
    return this.write<T>("PUT", path, body, opts);
  }
  patch<T>(path: string, body?: unknown, opts?: Parameters<FeatureHttpClient["patch"]>[2]) {
    return this.write<T>("PATCH", path, body, opts);
  }
  delete<T>(path: string, body?: unknown, opts?: Parameters<FeatureHttpClient["delete"]>[2]) {
    return this.write<T>("DELETE", path, body, opts);
  }
}
