import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import {
  DirectoryRestaurantListResponseSchema,
  DirectoryRestaurantDetailResponseSchema,
  CreateDirectoryLeadResponseSchema,
  isProblemDetails,
  type ProblemDetails,
  type DirectoryRestaurantListResponse,
  type DirectoryRestaurantDetailResponse,
  type CreateDirectoryLeadResponse,
  type CreateDirectoryLeadRequest,
} from "@corely/contracts";

export const API_BASE_URL = process.env.API_URL ?? "http://localhost:3000";

function buildUrl(pathname: string, query?: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
  }

  const queryString = params.toString();
  return `${API_BASE_URL}${pathname}${queryString ? `?${queryString}` : ""}`;
}

async function parseJson(response: APIResponse): Promise<unknown> {
  return response.json();
}

export async function listRestaurants(
  request: APIRequestContext,
  query?: Record<string, string | number | undefined>
): Promise<{ response: APIResponse; body: DirectoryRestaurantListResponse }> {
  const response = await request.get(buildUrl("/v1/public/berlin/restaurants", query));
  const body = DirectoryRestaurantListResponseSchema.parse(await parseJson(response));

  return { response, body };
}

export async function getRestaurantBySlug(
  request: APIRequestContext,
  slug: string
): Promise<{ response: APIResponse; body: DirectoryRestaurantDetailResponse }> {
  const response = await request.get(
    buildUrl(`/v1/public/berlin/restaurants/${encodeURIComponent(slug)}`)
  );
  const body = DirectoryRestaurantDetailResponseSchema.parse(await parseJson(response));

  return { response, body };
}

export async function createLead(
  request: APIRequestContext,
  payload: CreateDirectoryLeadRequest,
  options: {
    idempotencyKey?: string;
  }
): Promise<{ response: APIResponse; body: CreateDirectoryLeadResponse }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const response = await request.post(buildUrl("/v1/public/berlin/leads"), {
    headers,
    data: payload,
  });

  const body = CreateDirectoryLeadResponseSchema.parse(await parseJson(response));
  return { response, body };
}

export async function expectProblemDetails(
  response: APIResponse,
  status: number,
  expectedCode?: string
): Promise<ProblemDetails> {
  expect(response.status()).toBe(status);

  const payload = await parseJson(response);
  expect(isProblemDetails(payload)).toBe(true);

  const problem = payload as ProblemDetails;
  expect(problem.status).toBe(status);

  if (expectedCode) {
    expect(problem.code).toBe(expectedCode);
  }

  return problem;
}
