import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSsoTestContext, ssoTestOrigins as origins } from "../testkit/sso-test-context";
describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("Invoice link login restoration", () => {
  let fixture: Awaited<ReturnType<typeof createSsoTestContext>>;
  beforeEach(async () => {
    fixture = await createSsoTestContext();
  });
  afterEach(async () => {
    await fixture?.cleanup();
  });
  it.each([
    "/invoices/invoice-1/edit?workspaceId=workspace-a",
    "/invoices?q=INV&page=2&workspaceId=workspace-a",
    "/audit?entity=invoice&id=invoice-1&workspaceId=workspace-a",
  ])("keeps %s through central sign-in", async (returnPath) => {
    const login = await fixture.login(origins.invoice, returnPath);
    const result = await fixture.service.callback(origins.invoice, login.callback, login.handle);
    expect(result.returnPath).toBe(returnPath);
    expect(
      (
        await fixture.prisma.ssoAppSession.findUniqueOrThrow({
          where: { handleHash: fixture.crypto.hash(result.handle) },
        })
      ).appKey
    ).toBe("invoice");
  });
});
