import { HttpError, request } from "@corely/api-client";
import { resolvePublicApiBaseUrl } from "@corely/public-api-client";
import { withQuery } from "@/lib/urls";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ZodType } from "zod";

const ACCESS_TOKEN_ENV_KEYS = [
  "PUBLIC_WEB_STOREFRONT_ACCESS_TOKEN",
  "PUBLIC_WEB_CATALOG_ACCESS_TOKEN",
] as const;

const WORKSPACE_ID_ENV_KEYS = [
  "PUBLIC_WEB_STOREFRONT_WORKSPACE_ID",
  "PUBLIC_WEB_CATALOG_WORKSPACE_ID",
] as const;

const readEnv = (keys: readonly string[]): string | null => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const readProblemField = (body: unknown, field: "title" | "detail" | "code"): string | null => {
  if (typeof body !== "object" || !body) {
    return null;
  }
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const toErrorResponse = (error: unknown, fallbackTitle: string): NextResponse => {
  if (error instanceof HttpError) {
    const status = error.status ?? 500;
    const title = readProblemField(error.body, "title") ?? fallbackTitle;
    const detail =
      readProblemField(error.body, "detail") ??
      (status === 401 || status === 403
        ? "Catalog access token is invalid or missing required permissions."
        : "Catalog request failed.");
    const code = readProblemField(error.body, "code");

    return NextResponse.json(
      {
        title,
        detail,
        code,
      },
      { status }
    );
  }

  return NextResponse.json(
    {
      title: fallbackTitle,
      detail: error instanceof Error ? error.message : "Unexpected error",
    },
    { status: 500 }
  );
};

const resolveWorkspaceId = async (
  req: NextRequest,
  _apiBaseUrl: string,
  _accessToken: string
): Promise<string | null> => {
  const explicitWorkspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (explicitWorkspaceId && explicitWorkspaceId.trim().length > 0) {
    return explicitWorkspaceId.trim();
  }

  const envWorkspaceId = readEnv(WORKSPACE_ID_ENV_KEYS);
  if (envWorkspaceId) {
    return envWorkspaceId;
  }

  return null;
};

const resolveProxyConfig = async (
  req: NextRequest
): Promise<
  | { ok: true; apiBaseUrl: string; accessToken: string; workspaceId: string }
  | { ok: false; response: NextResponse }
> => {
  const accessToken = readEnv(ACCESS_TOKEN_ENV_KEYS);
  if (!accessToken) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          title: "Storefront proxy is not configured",
          detail:
            "Set PUBLIC_WEB_STOREFRONT_ACCESS_TOKEN to enable catalog access from public-web.",
        },
        { status: 503 }
      ),
    };
  }

  const apiBaseUrl = resolvePublicApiBaseUrl();
  const workspaceId = await resolveWorkspaceId(req, apiBaseUrl, accessToken);

  if (!workspaceId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          title: "Workspace context unavailable",
          detail:
            "Unable to resolve workspace for catalog calls. Provide PUBLIC_WEB_STOREFRONT_WORKSPACE_ID or pass workspaceId query parameter.",
        },
        { status: 503 }
      ),
    };
  }

  return {
    ok: true,
    apiBaseUrl,
    accessToken,
    workspaceId,
  };
};

export const proxyCatalogGet = async <T>(input: {
  req: NextRequest;
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  schema: ZodType<T>;
}): Promise<NextResponse> => {
  const config = await resolveProxyConfig(input.req);
  if (!config.ok) {
    return config.response;
  }

  const url = withQuery(
    `${config.apiBaseUrl.replace(/\/$/, "")}/catalog${input.path}`,
    input.params
  );

  try {
    const raw = await request({
      url,
      accessToken: config.accessToken,
      workspaceId: config.workspaceId,
    });

    const payload = input.schema.parse(raw);
    return NextResponse.json(payload);
  } catch (error) {
    return toErrorResponse(error, "Catalog request failed");
  }
};
