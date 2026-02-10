import { Test, TestingModule } from "@nestjs/testing";
import { TickOrchestrator } from "./tick-orchestrator.service";
import { EnvService } from "@corely/config";
import { JobLockService } from "../infrastructure/job-lock.service";
import { OutboxPollerService } from "../modules/outbox/outbox-poller.service";
import { InvoiceReminderRunnerService } from "../modules/invoices/invoice-reminder-runner.service";
import { MonthlyBillingRunnerService } from "../modules/classes/monthly-billing-runner.service";
import { RunnerReport } from "./runner.interface";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("TickOrchestrator", () => {
  let orchestrator: TickOrchestrator;

  const mockEnvService = {
    WORKER_TICK_RUNNERS: "outbox,invoiceReminders,classesBilling", // Default
    WORKER_TICK_OVERALL_MAX_MS: 1000,
  };

  const mockLockService = {
    withAdvisoryXactLock: vi.fn(),
  };

  const mockOutboxRunner = {
    name: "outbox",
    run: vi.fn(),
  };

  const mockInvoiceRunner = {
    name: "invoiceReminders",
    singletonLockKey: "worker:scheduler:invoiceReminders",
    run: vi.fn(),
  };

  const mockClassesBillingRunner = {
    name: "classesBilling",
    singletonLockKey: "worker:scheduler:classesBilling",
    run: vi.fn(),
  };

  beforeEach(async () => {
    mockLockService.withAdvisoryXactLock.mockImplementation(
      async (_args: { lockName: string; runId: string }, callback: () => Promise<RunnerReport>) => {
        const value = await callback();
        return { acquired: true, value };
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TickOrchestrator,
        { provide: EnvService, useValue: mockEnvService },
        { provide: JobLockService, useValue: mockLockService },
        { provide: OutboxPollerService, useValue: mockOutboxRunner },
        { provide: InvoiceReminderRunnerService, useValue: mockInvoiceRunner },
        { provide: MonthlyBillingRunnerService, useValue: mockClassesBillingRunner },
      ],
    }).compile();

    orchestrator = module.get<TickOrchestrator>(TickOrchestrator);

    vi.clearAllMocks();
  });

  it("should run configured runners if lock acquired", async () => {
    mockOutboxRunner.run.mockResolvedValue({ processedCount: 1 } as RunnerReport);
    mockInvoiceRunner.run.mockResolvedValue({ processedCount: 2 } as RunnerReport);
    mockClassesBillingRunner.run.mockResolvedValue({ processedCount: 3 } as RunnerReport);

    await orchestrator.runOnce();

    expect(mockOutboxRunner.run).toHaveBeenCalled();
    expect(mockInvoiceRunner.run).toHaveBeenCalled();
    expect(mockClassesBillingRunner.run).toHaveBeenCalled();
    expect(mockLockService.withAdvisoryXactLock).toHaveBeenCalledTimes(2);
  });

  it("should skip singleton runners when lock is not acquired", async () => {
    mockLockService.withAdvisoryXactLock
      .mockResolvedValueOnce({ acquired: false })
      .mockResolvedValueOnce({ acquired: false });

    await orchestrator.runOnce();

    expect(mockOutboxRunner.run).toHaveBeenCalled();
    expect(mockInvoiceRunner.run).not.toHaveBeenCalled();
    expect(mockClassesBillingRunner.run).not.toHaveBeenCalled();
  });

  it("should respect WORKER_TICK_RUNNERS config", async () => {
    mockEnvService.WORKER_TICK_RUNNERS = "outbox";

    await orchestrator.runOnce();

    expect(mockOutboxRunner.run).toHaveBeenCalled();
    expect(mockInvoiceRunner.run).not.toHaveBeenCalled();
    expect(mockClassesBillingRunner.run).not.toHaveBeenCalled();

    // Reset
    mockEnvService.WORKER_TICK_RUNNERS = "outbox,invoiceReminders,classesBilling";
  });
});
