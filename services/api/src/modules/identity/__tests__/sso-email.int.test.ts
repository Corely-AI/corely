import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSsoTestContext, ssoTestOrigins as origins } from "../testkit/sso-test-context";
describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)(
  "Corely passwordless SSO with isolated PostgreSQL",
  () => {
    let fixture: Awaited<ReturnType<typeof createSsoTestContext>>;
    beforeEach(async () => {
      fixture = await createSsoTestContext();
    });
    afterEach(async () => {
      vi.restoreAllMocks();
      await fixture?.cleanup();
    });
    it("uses a queued, encrypted email challenge once without provisioning another identity", async () => {
      const initial = await fixture.start();
      const input = {
        requestId: initial.requestId,
        csrfToken: initial.context.csrfToken,
        email: fixture.email,
      };
      await fixture.emailCodes.request(input, initial.context.handle);
      expect(fixture.sentCodes).toHaveLength(0);
      const challenge = await fixture.prisma.ssoEmailChallenge.findUniqueOrThrow({
        where: { transactionId: initial.requestId },
      });
      const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
        where: {
          eventType: "identity.sso.email_code_requested",
          payloadJson: { contains: challenge.id },
        },
      });
      expect(Object.keys(JSON.parse(event.payloadJson))).toEqual(["challengeId"]);
      await fixture.deliverCodes();
      await fixture.deliverCodes();
      expect(fixture.sentCodes).toHaveLength(1);
      const code = fixture.sentCodes[0].code;
      expect(challenge.codeHash).not.toBe(code);
      expect(challenge.codeCipher).not.toBe(code);
      const result = await fixture.service.login(
        { ...input, emailCode: code },
        initial.context.handle
      );
      const callback = new URL(result.redirectTo);
      await fixture.service.callback(
        origins.app,
        {
          requestId: initial.requestId,
          code: callback.searchParams.get("code")!,
          state: callback.searchParams.get("state")!,
        },
        initial.handle
      );
      await expect(
        fixture.service.login({ ...input, emailCode: code }, initial.context.handle)
      ).rejects.toThrow();
      expect(await fixture.prisma.user.count({ where: { email: fixture.email } })).toBe(1);
      expect(await fixture.prisma.membership.count({ where: { userId: fixture.userId } })).toBe(1);
    });
    it("persists incorrect-code attempts and cannot bypass the limit with a fresh request", async () => {
      const initial = await fixture.start();
      const input = {
        requestId: initial.requestId,
        csrfToken: initial.context.csrfToken,
        email: fixture.email,
      };
      await fixture.emailCodes.request(input, initial.context.handle);
      await fixture.deliverCodes();
      const wrong = fixture.sentCodes[0].code === "000000" ? "111111" : "000000";
      for (let attempt = 0; attempt < 5; attempt++)
        await expect(
          fixture.service.login({ ...input, emailCode: wrong }, initial.context.handle)
        ).rejects.toThrow();
      const challenge = await fixture.prisma.ssoEmailChallenge.findUniqueOrThrow({
        where: { transactionId: initial.requestId },
      });
      expect(challenge.attempts).toBe(5);
      await expect(
        fixture.service.login(
          { ...input, emailCode: fixture.sentCodes[0].code },
          initial.context.handle
        )
      ).rejects.toMatchObject({ status: 429 });
      expect(
        await fixture.prisma.ssoCentralSession.count({ where: { userId: fixture.userId } })
      ).toBe(0);
    });
    it("enforces resend cooldown, invalidates an old code and preserves the original expiry", async () => {
      vi.spyOn(fixture.crypto, "emailCode")
        .mockReturnValueOnce("123456")
        .mockReturnValueOnce("111111")
        .mockReturnValueOnce("654321");
      const initial = await fixture.start();
      const input = {
        requestId: initial.requestId,
        csrfToken: initial.context.csrfToken,
        email: fixture.email,
      };
      await fixture.emailCodes.request(input, initial.context.handle);
      await fixture.deliverCodes();
      await fixture.emailCodes.request(input, initial.context.handle);
      await fixture.deliverCodes();
      expect(fixture.sentCodes).toHaveLength(1);
      fixture.advance(60_001);
      await fixture.emailCodes.request(input, initial.context.handle);
      await fixture.deliverCodes();
      expect(fixture.sentCodes).toHaveLength(2);
      await expect(
        fixture.service.login({ ...input, emailCode: "123456" }, initial.context.handle)
      ).rejects.toThrow();
      await expect(
        fixture.service.login({ ...input, emailCode: "654321" }, initial.context.handle)
      ).resolves.toHaveProperty("centralHandle");
      const challenge = await fixture.prisma.ssoEmailChallenge.findUniqueOrThrow({
        where: { transactionId: initial.requestId },
      });
      expect(challenge.expiresAt.toISOString()).toBe(initial.context.expiresAt);
    });
    it("returns a generic response for unknown accounts and sends no email or grants", async () => {
      const initial = await fixture.start();
      const input = {
        requestId: initial.requestId,
        csrfToken: initial.context.csrfToken,
        email: `unknown-${fixture.email}`,
      };
      const response = await fixture.emailCodes.request(input, initial.context.handle);
      await fixture.deliverCodes();
      expect(response.message).toContain("If your account");
      expect(fixture.sentCodes).toHaveLength(0);
      await expect(
        fixture.service.login({ ...input, emailCode: "123456" }, initial.context.handle)
      ).rejects.toThrow();
      expect(await fixture.prisma.user.count({ where: { email: input.email } })).toBe(0);
    });
    it("does not consume a valid email code if transactional audit fails", async () => {
      const initial = await fixture.start();
      const input = {
        requestId: initial.requestId,
        csrfToken: initial.context.csrfToken,
        email: fixture.email,
      };
      await fixture.emailCodes.request(input, initial.context.handle);
      await fixture.deliverCodes();
      vi.spyOn(fixture.audit, "write").mockRejectedValueOnce(new Error("synthetic audit failure"));
      await expect(
        fixture.service.login(
          { ...input, emailCode: fixture.sentCodes[0].code },
          initial.context.handle
        )
      ).rejects.toThrow(/audit failure/);
      const challenge = await fixture.prisma.ssoEmailChallenge.findUniqueOrThrow({
        where: { transactionId: initial.requestId },
      });
      expect(challenge.consumedAt).toBeNull();
      await expect(
        fixture.service.login(
          { ...input, emailCode: fixture.sentCodes[0].code },
          initial.context.handle
        )
      ).resolves.toHaveProperty("centralHandle");
    });
  }
);
