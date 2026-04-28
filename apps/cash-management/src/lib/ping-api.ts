import { defaultApiBaseUrl } from "@corely/web-shared/lib/api-base-url";

const buildPingUrl = () => `${defaultApiBaseUrl.replace(/\/$/, "")}/health`;

export const pingApi = (source: string) => {
  void fetch(buildPingUrl(), {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      const body = await response.json().catch(() => null);
      console.log(
        "[cash-management] API ping",
        JSON.stringify({
          source,
          ok: response.ok,
          status: response.status,
          body,
        })
      );
    })
    .catch((error: unknown) => {
      console.warn(
        "[cash-management] API ping failed",
        JSON.stringify({
          source,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    });
};
