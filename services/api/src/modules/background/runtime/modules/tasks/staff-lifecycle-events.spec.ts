import { describe, expect, it, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { createStaffLifecycleEventHandlers } from "./staff-lifecycle-recorded.handler";

describe("Staff lifecycle outbox facts", () => {
  it("acknowledges all emitted facts and safely tolerates redelivery", async () => {
    const log = vi.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);
    try {
      const handlers = createStaffLifecycleEventHandlers();
      expect(handlers).toHaveLength(8);
      for (const handler of handlers) {
        const event = {
          id: "event",
          tenantId: "tenant",
          eventType: handler.eventType,
          payload:
            handler.eventType === "workspaces.member.disable"
              ? { workspaceId: "workspace", userId: "user" }
              : { workspaceId: "workspace", staffId: "staff", version: 1 },
        };
        await expect(handler.handle(event)).resolves.toBeUndefined();
        await expect(handler.handle(event)).resolves.toBeUndefined();
        await expect(
          handler.handle({ ...event, payload: { ...event.payload, privateNotes: "never log" } })
        ).rejects.toMatchObject({ permanent: true });
        await expect(handler.handle({ ...event, tenantId: undefined })).rejects.toMatchObject({
          permanent: true,
        });
        await expect(handler.handle({ ...event, eventType: "unknown" })).rejects.toMatchObject({
          permanent: true,
        });
      }
      expect(log).toHaveBeenCalledTimes(16);
      expect(JSON.stringify(log.mock.calls)).not.toContain("never log");
    } finally {
      log.mockRestore();
    }
  });
});
