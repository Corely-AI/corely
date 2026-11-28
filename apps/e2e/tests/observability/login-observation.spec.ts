import { FocusedObservationSchema, type FocusedObservation } from "@corely/contracts";
import { test, expect, type Page } from "@playwright/test";

async function capture(page: Page) {
  const events: FocusedObservation[] = [];
  await page.exposeFunction("recordFocusedObservation", (value: unknown) => {
    events.push(FocusedObservationSchema.parse(value));
  });
  await page.addInitScript(() => {
    const info = console.info.bind(console);
    console.info = (...args: unknown[]) => {
      if (args[0] === "corely.focused") {
        // Copy the event before navigation destroys its console-object execution context.
        const target = window as typeof window & {
          recordFocusedObservation: (value: unknown) => Promise<void>;
        };
        void target.recordFocusedObservation(args[1]);
      }
      info(...args);
    };
  });
  return events;
}

const contextBody = () => ({
  appKey: "invoice",
  appOrigin: "http://127.0.0.1:5192",
  accountOrigin: null,
  csrfToken: "b".repeat(43),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
});
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

for (const failure of ["malformed JSON", "invalid contract"] as const) {
  test(`central Login reports a 200 ${failure} response as unavailable`, async ({ page }) => {
    const events = await capture(page);
    await page.route("**/sso/context?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: failure === "malformed JSON" ? '{"appKey":' : '{"private":"server-detail"}',
      })
    );
    await page.goto(`http://127.0.0.1:5192/login?request=${"a".repeat(43)}`);
    await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
    await expect
      .poll(() =>
        events.filter((event) => event.outcome !== "aborted").map((event) => event.outcome)
      )
      .toEqual(["unavailable"]);
    expect(JSON.stringify(events)).not.toMatch(/server-detail|aaaaaaa|request=/);
  });
}

test("central Login reports a validated context as successful", async ({ page }) => {
  const events = await capture(page);
  await page.route("**/sso/context?*", (route) => route.fulfill({ json: contextBody() }));
  await page.goto(`http://127.0.0.1:5192/login?request=${"a".repeat(43)}`);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect
    .poll(() => events.filter((event) => event.outcome !== "aborted").map((event) => event.outcome))
    .toEqual(["ok"]);
});

test("central Login rejects an untrusted redirect without recording success", async ({ page }) => {
  const events = await capture(page);
  await page.route("**/sso/context?*", (route) => route.fulfill({ json: contextBody() }));
  await page.route("**/sso/login", (route) =>
    route.fulfill({
      json: { redirectTo: "https://untrusted.example/auth/callback?code=private-proof" },
    })
  );
  await page.goto(`http://127.0.0.1:5192/login?request=${"a".repeat(43)}`);
  await page.getByRole("button", { name: "Use a password instead", exact: true }).click();
  await page.getByLabel("Email address").fill("synthetic-review@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-review-only");
  await page.getByRole("button", { name: "Sign in and continue", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await expect
    .poll(() => events.filter((event) => event.event === "login").map((event) => event.outcome))
    .toEqual(["rejected"]);
  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:5192");
  expect(JSON.stringify(events)).not.toMatch(/private-proof|untrusted|Synthetic-review-only/);
});

test("central Login records a successful trusted handoff", async ({ page }) => {
  const events = await capture(page);
  await page.route("**/sso/context?*", (route) =>
    route.fulfill({ json: { ...contextBody(), appOrigin: "http://invoice.localhost:5192" } })
  );
  await page.route("**/sso/login", (route) =>
    route.fulfill({
      json: { redirectTo: "http://invoice.localhost:5192/auth/callback?code=synthetic-proof" },
    })
  );
  await page.route("http://invoice.localhost:5192/auth/callback?*", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Synthetic handoff complete</h1>" })
  );
  await page.goto(`http://127.0.0.1:5192/login?request=${"a".repeat(43)}`);
  await page.getByRole("button", { name: "Use a password instead", exact: true }).click();
  await page.getByLabel("Email address").fill("synthetic-review@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-review-only");
  await page.getByRole("button", { name: "Sign in and continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Synthetic handoff complete" })).toBeVisible();
  await expect
    .poll(() => events.filter((event) => event.event === "login").map((event) => event.outcome))
    .toEqual(["ok"]);
  expect(JSON.stringify(events)).not.toMatch(/synthetic-proof|Synthetic-review-only/);
});

test("central Login records a consumed email-code acknowledgement", async ({ page }) => {
  const events = await capture(page);
  await page.route("**/sso/context?*", (route) => route.fulfill({ json: contextBody() }));
  await page.route("**/sso/email-code/request", (route) =>
    route.fulfill({ json: { message: "Synthetic acknowledgement", retryAfterSeconds: 60 } })
  );
  await page.goto(`http://127.0.0.1:5192/login?request=${"a".repeat(43)}`);
  await page.getByLabel("Email address").fill("synthetic-review@example.invalid");
  await page.getByRole("button", { name: "Email me a sign-in code", exact: true }).click();
  await expect(page.getByLabel("Sign-in code", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      events.filter((event) => event.event === "email-code").map((event) => event.outcome)
    )
    .toEqual(["ok"]);
  expect(JSON.stringify(events)).not.toContain("synthetic-review@example.invalid");
});
