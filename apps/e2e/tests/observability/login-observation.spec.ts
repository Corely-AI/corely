import { FocusedObservationSchema, type FocusedObservation } from "@corely/contracts";
import { test, expect } from "@playwright/test";
for (const status of [401, 503]) {
  test(`central Login reports ${status} with correlation and no handoff URL`, async ({ page }) => {
    const events: FocusedObservation[] = [];
    let requestId: string | undefined;
    page.on("console", async (message) => {
      if (message.type() === "info" && message.text().startsWith("corely.focused ")) {
        events.push(FocusedObservationSchema.parse(await message.args()[1]?.jsonValue()));
      }
    });
    await page.route(
      (url) => url.pathname === "/sso/context",
      async (route) => {
        requestId = (await route.request().allHeaders())["x-request-id"];
        await route.fulfill({ status, json: { message: "private-server-detail" } });
      }
    );
    await page.goto(`http://127.0.0.1:5192/login?request=${"a".repeat(43)}`);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect.poll(() => events.filter((event) => event.outcome !== "aborted").length).toBe(1);
    expect(events.filter((event) => event.outcome !== "aborted")).toEqual([
      {
        surface: "login",
        layer: "browser",
        event: "context",
        outcome: status === 401 ? "unauthenticated" : "unavailable",
        requestId,
      },
    ]);
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(events)).not.toMatch(/private-server-detail|aaaaaaa|request=|login\?/);
  });
}
