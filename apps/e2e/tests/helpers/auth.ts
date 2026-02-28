import { LoginInputSchema } from "@corely/contracts";
import { expect, type APIRequestContext } from "@playwright/test";

const API_BASE_URL = process.env.API_URL ?? "http://localhost:3000";

export type SeededTestData = {
  tenant: {
    id: string;
  };
  workspace: {
    id: string;
  };
  user: {
    id: string;
    email: string;
    password: string;
  };
};

export type AuthContext = {
  accessToken: string;
  tenantId: string;
  workspaceId: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export async function loginAsSeededUser(
  request: APIRequestContext,
  testData: SeededTestData
): Promise<AuthContext> {
  const payload = LoginInputSchema.parse({
    email: testData.user.email,
    password: testData.user.password,
    tenantId: testData.tenant.id,
  });

  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    headers: {
      "Content-Type": "application/json",
    },
    data: payload,
  });

  expect(response.status()).toBe(201);
  const body = asRecord(await response.json());
  const accessToken = body.accessToken;

  expect(typeof accessToken).toBe("string");
  expect(String(accessToken).length).toBeGreaterThan(20);

  return {
    accessToken: String(accessToken),
    tenantId: testData.tenant.id,
    workspaceId: testData.workspace.id,
  };
}

export function buildAuthHeaders(
  auth: AuthContext,
  scope?: {
    tenantId?: string;
    workspaceId?: string;
  }
): Record<string, string> {
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    "x-tenant-id": scope?.tenantId ?? auth.tenantId,
    "x-workspace-id": scope?.workspaceId ?? auth.workspaceId,
  };
}
