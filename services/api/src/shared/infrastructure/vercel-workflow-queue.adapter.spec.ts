import { describe, expect, it, vi } from "vitest";
import { PollingQueueClient } from "@vercel/queue";
import { VercelWorkflowQueueAdapter } from "./vercel-workflow-queue.adapter";

describe("Vercel workflow queue", () => {
  it("keeps the job identity across redelivery and scopes publication deduplication by tenant", async () => {
    const client = new PollingQueueClient({ region: "iad1", deploymentId: null });
    const send = vi.spyOn(client, "send").mockResolvedValue({ messageId: "message-1" });
    const adapter = new VercelWorkflowQueueAdapter<{ tenantId: string }>("test-tasks", client);
    const options = { jobId: "task-1", delayMs: 1_001, attempts: 2 };
    await adapter.enqueue({ tenantId: "a" }, options);
    await adapter.enqueue({ tenantId: "b" }, options);
    expect(send.mock.calls[0]?.[2]?.delaySeconds).toBe(2);
    expect(send.mock.calls[0]?.[2]?.idempotencyKey).not.toBe(
      send.mock.calls[1]?.[2]?.idempotencyKey
    );

    const receive = vi
      .spyOn(client, "receive")
      .mockImplementation(async (_topic, _group, run, opts) => {
        const message = send.mock.calls[0]?.[1] as never;
        const metadata = { messageId: "message-1", deliveryCount: 1 } as Parameters<typeof run>[1];
        try {
          await run(message, metadata);
        } catch (error) {
          expect(opts?.retry?.(error, metadata)).toEqual({ afterSeconds: 60 });
        }
        await run(message, { ...metadata, deliveryCount: 2 });
        await run(message, { ...metadata, deliveryCount: 3 });
        return { ok: true };
      });
    const handle = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue(undefined);
    await adapter.poll(handle);
    expect(receive.mock.calls[0]?.slice(0, 2)).toEqual(["test-tasks", "corely-workflows-v1"]);
    expect(handle).toHaveBeenCalledTimes(2);
    expect(handle).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "task-1", attemptsMade: 1 })
    );
  });
});
