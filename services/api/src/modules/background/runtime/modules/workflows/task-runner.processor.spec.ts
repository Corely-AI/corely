import { describe, expect, it, vi } from "vitest";
import { WorkflowTaskRunnerProcessor } from "./task-runner.processor";

describe("Vercel workflow task redelivery", () => {
  it("retries a transient failure and republishes committed progress without running the step twice", async () => {
    const task = { id: "task", instanceId: "instance", type: "SYSTEM", maxAttempts: 3 };
    const tasks = {
      claimTask: vi
        .fn()
        .mockResolvedValueOnce({ ...task, attempts: 1 })
        .mockResolvedValueOnce({ ...task, attempts: 2 })
        .mockResolvedValue(null),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    let marker: { payload: string } | undefined;
    const events = {
      append: vi.fn(async (event: { type: string; payload: string }) => {
        if (event.type === "QUEUE_TASK_FOLLOWUP") {
          marker = event;
        }
      }),
      findDeliveryMarker: vi.fn(async () => marker),
    };
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ status: "FAILED", error: { message: "transient" } })
      .mockResolvedValueOnce({ status: "SUCCEEDED", output: { effect: "once" } });
    const enqueue = vi
      .fn()
      .mockRejectedValueOnce(new Error("publish interrupted"))
      .mockResolvedValue(undefined);
    const processor = new WorkflowTaskRunnerProcessor(
      ...([
        { getValue: () => "vercel" },
        { $transaction: (run: (tx: object) => Promise<unknown>) => run({}) },
        tasks,
        {},
        events,
        { recordQueueLatency: vi.fn(), recordTaskResult: vi.fn() },
        { getHandler: () => ({ execute }) },
        {},
        { enqueue },
      ] as unknown as ConstructorParameters<typeof WorkflowTaskRunnerProcessor>)
    );
    const job = {
      id: "task",
      data: { tenantId: "tenant", instanceId: "instance", taskId: "task" },
      timestamp: Date.now(),
      attemptsMade: 0,
      maxAttempts: 3,
    };

    await expect(processor.handleJob(job)).rejects.toThrow("transient");
    expect(tasks.markFailed).toHaveBeenCalledTimes(1);
    await expect(processor.handleJob({ ...job, attemptsMade: 1 })).rejects.toThrow(
      "publish interrupted"
    );
    await expect(processor.handleJob({ ...job, attemptsMade: 2 })).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(2);
    expect(tasks.markSucceeded).toHaveBeenCalledTimes(1);
    expect(tasks.markFailed).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]).toEqual(enqueue.mock.calls[1]);
  });
});
