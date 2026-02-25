import { buildExternalServiceError } from "./errors";

export interface HttpClientOptions {
  baseUrl: string;
  provider: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
}

export interface HttpRequestOptions {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
}

export class IntegrationsHttpClient {
  private readonly baseUrl: string;
  private readonly provider: string;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.provider = options.provider;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  async request<T>(options: HttpRequestOptions): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = this.buildUrl(options.path, options.query);
      const requestInit: RequestInit = {
        method: options.method ?? "GET",
        headers: {
          ...this.defaultHeaders,
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
        signal: controller.signal,
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      };
      const response = await fetch(url, requestInit);

      if (!response.ok) {
        const body = await response.text();
        throw buildExternalServiceError(
          `${this.provider} request failed with status ${response.status}`,
          {
            provider: this.provider,
            status: response.status,
            path: options.path,
            retryable: response.status >= 500 || response.status === 429,
            body,
          }
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw buildExternalServiceError(`${this.provider} request timed out`, {
          provider: this.provider,
          path: options.path,
          retryable: true,
        });
      }

      if (error instanceof Error) {
        throw buildExternalServiceError(
          `${this.provider} request failed: ${error.message}`,
          {
            provider: this.provider,
            path: options.path,
            retryable: true,
          },
          error
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | undefined | null>
  ): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }
}
