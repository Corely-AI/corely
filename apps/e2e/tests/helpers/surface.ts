import type { Page } from "@playwright/test";

export type TestSurface = "platform" | "pos" | "crm";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const WEB_BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

const SURFACE_FORWARD_HOSTS: Record<TestSurface, string> = {
  platform: "corely.one",
  pos: "pos.corely.one",
  crm: "crm.corely.one",
};

export function forwardedHostForSurface(surface: TestSurface): string {
  return SURFACE_FORWARD_HOSTS[surface];
}

export function buildSurfaceWebUrl(surface: TestSurface, pathname: string): string {
  const url = new URL(WEB_BASE_URL);

  if (surface === "platform") {
    url.hostname = "localhost";
  } else {
    url.hostname = `${surface}.localhost`;
  }

  url.pathname = pathname;
  url.search = "";
  url.hash = "";

  return url.toString();
}

export async function installSurfaceApiForwarding(
  page: Page,
  surface: TestSurface | string
): Promise<void> {
  const forwardedHost =
    surface === "platform" || surface === "pos" || surface === "crm"
      ? forwardedHostForSurface(surface)
      : surface;

  await page.route(`${API_URL}/**`, async (route) => {
    const headers = {
      ...route.request().headers(),
      "x-forwarded-host": forwardedHost,
    };

    await route.continue({ headers });
  });
}
