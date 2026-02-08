import { Test, TestingModule } from "@nestjs/testing";
import { TickOrchestrator } from "./tick-orchestrator.service";
import { EnvService } from "@corely/config";
import { JobLockService } from "../infrastructure/job-lock.service";
import { OutboxPollerService } from "../modules/outbox/outbox-poller.service";
import { InvoiceReminderRunnerService } from "../modules/invoices/invoice-reminder-runner.service";
import { RunnerReport } from "./runner.interface";

describe("TickOrchestrator", () => {
  let orchestrator: TickOrchestrator;
  let jobLockService: JobLockService;
  let outboxRunner: OutboxPollerService;
  let invoiceRunner: InvoiceReminderRunnerService;

  const mockEnvService = {
    WORKER_TICK_RUNNERS: "outbox,invoiceReminders", // Default
    WORKER_TICK_OVERALL_MAX_MS: 1000,
  };

  const mockLockService = {
    tryAcquireTickLock: jest.fn(),
    releaseTickLock: jest.fn(),
  };

  const mockOutboxRunner = {
    name: "outbox",
    run: jest.fn(),
  };

  const mockInvoiceRunner = {
    name: "invoiceReminders",
    run: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TickOrchestrator,
        { provide: EnvService, useValue: mockEnvService },
        { provide: JobLockService, useValue: mockLockService },
        { provide: OutboxPollerService, useValue: mockOutboxRunner },
        { provide: InvoiceReminderRunnerService, useValue: mockInvoiceRunner },
      ],
    }).compile();

    orchestrator = module.get<TickOrchestrator>(TickOrchestrator);
    jobLockService = module.get<JobLockService>(JobLockService);
    outboxRunner = module.get<OutboxPollerService>(OutboxPollerService);
    invoiceRunner = module.get<InvoiceReminderRunnerService>(InvoiceReminderRunnerService);

    jest.clearAllMocks();
  });

  it("should run configured runners if lock acquired", async () => {
    mockLockService.tryAcquireTickLock.mockResolvedValue(true);
    mockOutboxRunner.run.mockResolvedValue({ processedCount: 1 } as RunnerReport);
    mockInvoiceRunner.run.mockResolvedValue({ processedCount: 2 } as RunnerReport);

    await orchestrator.runTick();

    expect(mockLockService.tryAcquireTickLock).toHaveBeenCalled();
    expect(mockOutboxRunner.run).toHaveBeenCalled();
    expect(mockInvoiceRunner.run).toHaveBeenCalled();
    expect(mockLockService.releaseTickLock).toHaveBeenCalled();
  });

  it("should exit immediately if lock not acquired", async () => {
    mockLockService.tryAcquireTickLock.mockResolvedValue(false);

    await orchestrator.runTick();

    expect(mockOutboxRunner.run).not.toHaveBeenCalled();
    expect(mockLockService.releaseTickLock).not.toHaveBeenCalled(); // Should not release if not acquired
  });

  it("should respect WORKER_TICK_RUNNERS config", async () => {
    mockEnvService.WORKER_TICK_RUNNERS = "outbox";
    mockLockService.tryAcquireTickLock.mockResolvedValue(true);

    await orchestrator.runTick();

    expect(mockOutboxRunner.run).toHaveBeenCalled();
    expect(mockInvoiceRunner.run).not.toHaveBeenCalled();

    // Reset
    mockEnvService.WORKER_TICK_RUNNERS = "outbox,invoiceReminders";
  });
});
