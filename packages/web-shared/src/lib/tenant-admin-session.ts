import { request } from "@corely/api-client";
import { TenantAdminSessionSchema, type TenantAdminSession } from "@corely/contracts";
import { defaultApiBaseUrl } from "./api-base-url";

const SESSION_KEY = "corely-tenant-admin-session";

export function getTenantAdminSession(): TenantAdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return TenantAdminSessionSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function setTenantAdminSession(session: TenantAdminSession | null) {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("corely-active-workspace");
  }
}

export async function endTenantAdminSession(session: TenantAdminSession) {
  await request({
    url: defaultApiBaseUrl + "/auth/tenant-admin-session/end",
    method: "POST",
    accessToken: session.accessToken,
    parseJson: false,
  });
  setTenantAdminSession(null);
}
