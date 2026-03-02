import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudTasksJobScheduler } from "../drivers/cloudtasks.job-scheduler";

const state = {
  createTask: vi.fn(),
  getQueue: vi.fn(),
  createQueue: vi.fn(),
  deleteTask: vi.fn(),
  close: vi.fn(),
};

vi.mock("@google-cloud/tasks", () => {
  class MockCloudTasksClient {
    queuePath(projectId: string, location: string, queueName: string) {
      return `projects/${projectId}/locations/${location}/queues/${queueName}`;
    }

    locationPath(projectId: string, location: string) {
      return `projects/${projectId}/locations/${location}`;
    }

    async createTask(args: unknown) {
      state.createTask(args);
      return [{ name: "task-name-1" }];
    }

    async getQueue(args: unknown) {
      state.getQueue(args);
      return [{}];
    }

    async createQueue(args: unknown) {
      state.createQueue(args);
      return [{}];
    }

    async deleteTask(args: unknown) {
      state.deleteTask(args);
      return [{}];
    }

    async close() {
      state.close();
    }
  }

  return {
    CloudTasksClient: MockCloudTasksClient,
  };
});

describe("CloudTasksJobScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps worker.tick job to /internal/tick", async () => {
    const scheduler = new CloudTasksJobScheduler({
      projectId: "proj",
      location: "europe-west1",
      queueName: "worker-jobs",
      workerBaseUrl: "https://worker.example.run.app",
      serviceAccountEmail: "invoker@example.iam.gserviceaccount.com",
      workerKey: "secret",
    });

    await scheduler.schedule(
      "worker.tick",
      { runnerNames: ["outbox"] },
      { idempotencyKey: "tick:outbox" }
    );

    expect(state.createTask).toHaveBeenCalledTimes(1);
    const createTaskArgs = state.createTask.mock.calls[0][0] as {
      parent: string;
      task: {
        httpRequest: {
          url: string;
          headers: Record<string, string>;
          body: Buffer;
        };
      };
    };

    expect(createTaskArgs.parent).toBe("projects/proj/locations/europe-west1/queues/worker-jobs");
    expect(createTaskArgs.task.httpRequest.url).toBe(
      "https://worker.example.run.app/internal/tick"
    );
    expect(createTaskArgs.task.httpRequest.headers["x-worker-key"]).toBe("secret");

    const body = JSON.parse(createTaskArgs.task.httpRequest.body.toString("utf8")) as {
      runnerNames: string[];
    };
    expect(body.runnerNames).toEqual(["outbox"]);
  });

  it("checkpoints crm sequence job beyond Cloud Tasks horizon", async () => {
    const now = new Date("2026-03-02T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const scheduler = new CloudTasksJobScheduler({
      projectId: "proj",
      location: "europe-west1",
      queueName: "worker-jobs",
      workerBaseUrl: "https://worker.example.run.app",
    });

    const requestedRunAt = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000);

    await scheduler.schedule(
      "crm.sequence.executeStep",
      {
        enrollmentId: "enr-1",
        stepId: "step-1",
        expectedRunAt: requestedRunAt.toISOString(),
      },
      {
        runAt: requestedRunAt,
        idempotencyKey: "crm-seq:enr-1:step-1",
      }
    );

    expect(state.createTask).toHaveBeenCalledTimes(1);
    const createTaskArgs = state.createTask.mock.calls[0][0] as {
      task: {
        httpRequest: {
          url: string;
          body: Buffer;
        };
        scheduleTime?: {
          seconds: number;
          nanos?: number;
        };
      };
    };

    expect(createTaskArgs.task.httpRequest.url).toBe(
      "https://worker.example.run.app/internal/crm/sequences/execute-step"
    );

    const body = JSON.parse(createTaskArgs.task.httpRequest.body.toString("utf8")) as {
      checkpoint: boolean;
      originalRunAt: string;
      enrollmentId: string;
      stepId: string;
    };

    expect(body.checkpoint).toBe(true);
    expect(body.originalRunAt).toBe(requestedRunAt.toISOString());
    expect(body.enrollmentId).toBe("enr-1");
    expect(body.stepId).toBe("step-1");

    expect(createTaskArgs.task.scheduleTime).toBeDefined();
    const scheduleSeconds = Number(createTaskArgs.task.scheduleTime?.seconds ?? 0);
    const scheduledAtMs = scheduleSeconds * 1000;
    const expectedMaxMs = now.getTime() + 29 * 24 * 60 * 60 * 1000;
    expect(Math.abs(scheduledAtMs - expectedMaxMs)).toBeLessThanOrEqual(1000);

    vi.useRealTimers();
  });
});
