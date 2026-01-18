import { test, expect } from "@playwright/test";
import { apiClient } from "../utils/api";
import { selectors } from "../utils/selectors";

type UserSnapshot = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
  membership: {
    tenantId: string;
    roleId: string;
  } | null;
  workspace: {
    id: string;
    tenantId: string;
    name: string;
    onboardingStatus: string;
    legalEntity: {
      id: string;
      kind: string;
      legalName: string;
    } | null;
  } | null;
};

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "default_tenant";
const DEFAULT_WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID || "default_workspace";
const EDITION = process.env.EDITION || process.env.VITE_EDITION || "oss";
const IS_EE = EDITION === "ee";

const getSnapshot = async (email: string): Promise<UserSnapshot> => {
  return apiClient.post<UserSnapshot>("/test/lookup-user", { email });
};

const clearSession = async (page: import("@playwright/test").Page) => {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
};

const signup = async (
  page: import("@playwright/test").Page,
  data: { email: string; password: string; tenantName?: string },
  options?: { expectUrl?: RegExp }
) => {
  await page.goto("/auth/signup");
  await page.fill(selectors.auth.signupEmailInput, data.email);
  await page.fill(selectors.auth.signupPasswordInput, data.password);
  if (data.tenantName) {
    const tenantInput = page.locator(selectors.auth.signupTenantInput);
    if (await tenantInput.count()) {
      await tenantInput.fill(data.tenantName);
    }
  }
  await page.click(selectors.auth.signupSubmitButton);
  const expectedUrl = options?.expectUrl ?? /\/onboarding/;
  await page.waitForURL(expectedUrl, { timeout: 10_000 });
  await expect(page).toHaveURL(expectedUrl);
};

const selectCompanyKind = async (page: import("@playwright/test").Page) => {
  const kindTrigger = page.getByRole("combobox").first();
  await kindTrigger.click();
  await page.getByRole("option", { name: /Company/i }).click();
};

const completeOnboarding = async (
  page: import("@playwright/test").Page,
  data: { name: string; legalName: string; kind: "PERSONAL" | "COMPANY" }
) => {
  await page.fill(selectors.workspace.onboardingName, data.name);
  if (data.kind === "COMPANY") {
    await selectCompanyKind(page);
  }
  await page.click(selectors.workspace.onboardingNext);

  await page.fill(selectors.workspace.onboardingLegalName, data.legalName);
  await page.fill(selectors.workspace.onboardingAddress, "123 Main St");
  await page.fill(selectors.workspace.onboardingCity, "Berlin");
  await page.fill(selectors.workspace.onboardingPostal, "10115");
  await page.click(selectors.workspace.onboardingNext);

  await page.click(selectors.workspace.onboardingSubmit);
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
};

const assertDashboardReady = async (page: import("@playwright/test").Page) => {
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  const nav = page.locator(selectors.navigation.sidebarNav);
  await expect(nav).toBeVisible({ timeout: 10_000 });
};

test.describe("OSS onboarding flow", () => {
  test.skip(IS_EE, "OSS-only test");

  test("user1 and user2 onboarding uses default tenant/workspace", async ({ page }) => {
    const timestamp = Date.now();
    const user1 = {
      email: `oss-user1-${timestamp}@corely.local`,
      password: "SignupTest123!",
    };
    const user2 = {
      email: `oss-user2-${timestamp}@corely.local`,
      password: "SignupTest123!",
    };

    await clearSession(page);
    await signup(page, user1);

    const user1Pre = await getSnapshot(user1.email);
    expect(user1Pre.tenant?.id).toBe(DEFAULT_TENANT_ID);
    expect(user1Pre.workspace?.id).toBe(DEFAULT_WORKSPACE_ID);
    expect(user1Pre.workspace?.tenantId).toBe(DEFAULT_TENANT_ID);

    await completeOnboarding(page, {
      name: "Freelancer Workspace",
      legalName: "Freelancer Legal",
      kind: "PERSONAL",
    });
    await assertDashboardReady(page);

    const user1Post = await getSnapshot(user1.email);
    expect(user1Post.workspace?.name).toBe("Freelancer Workspace");
    expect(user1Post.workspace?.legalEntity?.kind).toBe("PERSONAL");
    expect(user1Post.workspace?.legalEntity?.legalName).toBe("Freelancer Legal");
    const expectedWorkspace = {
      name: user1Post.workspace?.name,
      kind: user1Post.workspace?.legalEntity?.kind,
      legalName: user1Post.workspace?.legalEntity?.legalName,
    };

    await clearSession(page);

    await signup(page, user2, { expectUrl: /\/dashboard/ });
    await assertDashboardReady(page);

    const user2Pre = await getSnapshot(user2.email);
    expect(user2Pre.tenant?.id).toBe(DEFAULT_TENANT_ID);
    expect(user2Pre.workspace?.id).toBe(DEFAULT_WORKSPACE_ID);
    expect(user2Pre.workspace?.tenantId).toBe(DEFAULT_TENANT_ID);
    expect(user2Pre.workspace?.name).toBe(expectedWorkspace.name);
    expect(user2Pre.workspace?.legalEntity?.kind).toBe(expectedWorkspace.kind);
    expect(user2Pre.workspace?.legalEntity?.legalName).toBe(expectedWorkspace.legalName);
  });
});

test.describe("EE onboarding flow", () => {
  test.skip(!IS_EE, "EE-only test");

  test("user1 and user2 onboarding creates non-default tenant/workspace", async ({ page }) => {
    const timestamp = Date.now();
    const user1 = {
      email: `ee-user1-${timestamp}@corely.local`,
      password: "SignupTest123!",
      tenantName: `EE Tenant One ${timestamp}`,
    };
    const user2 = {
      email: `ee-user2-${timestamp}@corely.local`,
      password: "SignupTest123!",
      tenantName: `EE Tenant Two ${timestamp}`,
    };

    await clearSession(page);
    await signup(page, user1);

    const user1Pre = await getSnapshot(user1.email);
    expect(user1Pre.tenant?.id).not.toBe(DEFAULT_TENANT_ID);
    expect(user1Pre.workspace).toBeNull();

    await completeOnboarding(page, {
      name: "EE Freelancer Workspace",
      legalName: "EE Freelancer Legal",
      kind: "PERSONAL",
    });
    await assertDashboardReady(page);

    const user1Post = await getSnapshot(user1.email);
    expect(user1Post.tenant?.id).not.toBe(DEFAULT_TENANT_ID);
    expect(user1Post.workspace?.id).not.toBe(DEFAULT_WORKSPACE_ID);
    expect(user1Post.workspace?.tenantId).toBe(user1Post.tenant?.id);
    expect(user1Post.workspace?.legalEntity?.kind).toBe("PERSONAL");

    await clearSession(page);

    await clearSession(page);
    await signup(page, user2);

    const user2Pre = await getSnapshot(user2.email);
    expect(user2Pre.tenant?.id).not.toBe(DEFAULT_TENANT_ID);
    expect(user2Pre.workspace).toBeNull();

    await completeOnboarding(page, {
      name: "EE Company Workspace",
      legalName: "EE Company Legal",
      kind: "COMPANY",
    });
    await assertDashboardReady(page);

    const user2Post = await getSnapshot(user2.email);
    expect(user2Post.tenant?.id).not.toBe(DEFAULT_TENANT_ID);
    expect(user2Post.workspace?.id).not.toBe(DEFAULT_WORKSPACE_ID);
    expect(user2Post.workspace?.tenantId).toBe(user2Post.tenant?.id);
    expect(user2Post.workspace?.legalEntity?.kind).toBe("COMPANY");
  });
});
