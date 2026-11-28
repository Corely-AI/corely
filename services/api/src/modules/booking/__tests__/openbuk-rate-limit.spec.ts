import { describe, expect, it, vi } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { OpenBukRateLimitGuard } from "../http/openbuk-rate-limit.guard";

describe("OpenBuk public HTTP limit", () => {
  function call(claimFixedWindow: ReturnType<typeof vi.fn>, forwarded: string) {
    const guard = new OpenBukRateLimitGuard({ claimFixedWindow }, new Reflector());
    const setHeader = vi.fn();
    const context = {
      getHandler: () => () => {},
      switchToHttp: () => ({
        getRequest: () => ({ ip: "::ffff:192.0.2.24", headers: { "x-forwarded-for": forwarded } }),
        getResponse: () => ({ setHeader }),
      }),
    } as unknown as ExecutionContext;
    return { result: guard.canActivate(context), setHeader };
  }

  it("keys admission on the server address regardless of raw forwarding headers", async () => {
    const claim = vi.fn().mockResolvedValue(true);
    await expect(call(claim, "192.0.2.1").result).resolves.toBe(true);
    await expect(call(claim, "192.0.2.2").result).resolves.toBe(true);
    expect(claim.mock.calls[0]).toEqual(claim.mock.calls[1]);
    expect(claim.mock.calls[0].slice(1)).toEqual([60, 60_000]);
  });

  it("returns a retry delay after saturation or a shared storage error", async () => {
    const limited = call(vi.fn().mockResolvedValue(false), "192.0.2.1");
    await expect(limited.result).rejects.toMatchObject({ status: 429 });
    expect(limited.setHeader).toHaveBeenCalledWith("Retry-After", "60");
    const unavailable = call(
      vi.fn().mockRejectedValue(new Error("Test storage unavailable")),
      "192.0.2.1"
    );
    await expect(unavailable.result).rejects.toMatchObject({ status: 503 });
    expect(unavailable.setHeader).toHaveBeenCalledWith("Retry-After", "60");
  });
});
