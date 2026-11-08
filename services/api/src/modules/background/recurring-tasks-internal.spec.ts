import { mockDeep } from "vitest-mock-extended";
import { BackgroundInternalController } from "./background-internal.controller";
import type { OutboxPollerService } from "./runtime/modules/outbox/outbox-poller.service";
import type { InvoicePdfService } from "./runtime/modules/invoices/application/invoice-pdf.service";
import type { TrialExpiryRunnerService } from "./runtime/modules/billing/trial-expiry-runner.service";
import type { CoachingPrepReminderRunnerService } from "./runtime/modules/coaching/coaching-prep-reminder-runner.service";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import type { EnvService } from "@corely/config";
import {
  RecurringTasksInternalGuard,
  RecurringTasksInternalController,
} from "./recurring-tasks-internal.controller";
import { createChecklistEventHandlers } from "./runtime/modules/tasks/recurring-checklist-recorded.handler";
import type { RecurringGenerationUseCase } from "../tasks/public";
const context = (headers: Record<string, string> = {}) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as ExecutionContext;
describe("Recurring background boundary", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("fails closed without configured credentials and checks the existing service token", () => {
    vi.stubEnv("INTERNAL_WORKER_KEY", "");
    expect(() =>
      new RecurringTasksInternalGuard({ WORKER_API_SERVICE_TOKEN: "" } as EnvService).canActivate(
        context()
      )
    ).toThrow("Configure");
    const guard = new RecurringTasksInternalGuard({
      WORKER_API_SERVICE_TOKEN: "local-test-token",
    } as EnvService);
    expect(() => guard.canActivate(context())).toThrow("Invalid service token");
    expect(() => guard.canActivate(context({ "x-service-token": "wrong" }))).toThrow(
      "Invalid service token"
    );
    expect(guard.canActivate(context({ "x-service-token": "local-test-token" }))).toBe(true);
  });
  it("allows only a configured matching legacy key when no service token exists", () => {
    vi.stubEnv("INTERNAL_WORKER_KEY", "local-test-key");
    const guard = new RecurringTasksInternalGuard({ WORKER_API_SERVICE_TOKEN: "" } as EnvService);
    expect(() => guard.canActivate(context())).toThrow("Invalid worker key");
    expect(guard.canActivate(context({ "x-worker-key": "local-test-key" }))).toBe(true);
  });
  it("bounds run input and does not allow malformed bodies to trigger generation", async () => {
    const run = vi.fn(async () => ({ processedCount: 0 }));
    const controller = new RecurringTasksInternalController({
      run,
    } as unknown as RecurringGenerationUseCase);
    for (const body of [
      { limit: 26 },
      { limit: 0 },
      { limit: 1.5 },
      { limit: "10" },
      { tenantId: "untrusted" },
    ])
      expect(() => controller.run(body)).toThrow("Invalid generation limit");
    expect(run).not.toHaveBeenCalled();
    await controller.run({ limit: 25 });
    expect(run).toHaveBeenCalledWith(25);
  });
  it.each([false, true])(
    "adds recurrence to legacy ticks only with configured credentials (%s)",
    async (configured) => {
      vi.stubEnv("INTERNAL_WORKER_KEY", "");
      const report = {
        processedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        durationMs: 0,
      };
      const poller = mockDeep<OutboxPollerService>();
      poller.run.mockResolvedValue(report);
      const coaching = mockDeep<CoachingPrepReminderRunnerService>();
      coaching.run.mockResolvedValue(report);
      const generation = mockDeep<RecurringGenerationUseCase>();
      generation.run.mockResolvedValue(report);
      const controller = new BackgroundInternalController(
        poller,
        mockDeep<InvoicePdfService>(),
        mockDeep<TrialExpiryRunnerService>(),
        coaching,
        generation,
        { WORKER_API_SERVICE_TOKEN: configured ? "test-token" : "" } as EnvService
      );
      await controller.runOutbox({ limit: 100 });
      if (configured) expect(generation.run).toHaveBeenCalledWith(25, 30000);
      else expect(generation.run).not.toHaveBeenCalled();
    }
  );
  it("acknowledges all seven checklist facts and fails malformed payloads permanently", async () => {
    const handlers = createChecklistEventHandlers();
    expect(handlers).toHaveLength(7);
    for (const handler of handlers) {
      await expect(
        handler.handle({
          id: "event",
          tenantId: "tenant",
          eventType: handler.eventType,
          payload: {
            workspaceId: "workspace",
            templateId: "35f708b5-cbda-4bc1-bcee-51506c9e6018",
            version: 1,
          },
        })
      ).resolves.toBeUndefined();
      await expect(
        handler.handle({
          id: "bad",
          tenantId: "tenant",
          eventType: handler.eventType,
          payload: { templateId: "invalid" },
        })
      ).rejects.toMatchObject({ permanent: true });
    }
  });
});
