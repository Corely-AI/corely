import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { InternalWorkerController } from "./internal-worker.controller";
import { TickOrchestrator } from "./tick-orchestrator.service";
import { InvoicePdfService } from "../modules/invoices/application/invoice-pdf.service";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("InternalWorkerController (HTTP integration)", () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication["getHttpServer"]>;
  let originalWorkerKey: string | undefined;

  const mockTickOrchestrator = {
    runOnce: vi.fn(),
  };

  const mockInvoicePdfService = {
    generateAndStore: vi.fn(),
  };

  beforeAll(async () => {
    originalWorkerKey = process.env.INTERNAL_WORKER_KEY;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [InternalWorkerController],
      providers: [
        { provide: TickOrchestrator, useValue: mockTickOrchestrator },
        { provide: InvoicePdfService, useValue: mockInvoicePdfService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  beforeEach(() => {
    process.env.INTERNAL_WORKER_KEY = originalWorkerKey;
    vi.clearAllMocks();
  });

  afterAll(async () => {
    process.env.INTERNAL_WORKER_KEY = originalWorkerKey;
    await app.close();
  });

  it("triggers a single tick and returns run summary", async () => {
    process.env.INTERNAL_WORKER_KEY = "worker-secret";
    mockTickOrchestrator.runOnce.mockResolvedValue({
      runId: "run-123",
      startedAt: new Date("2026-03-02T10:00:00.000Z"),
      finishedAt: new Date("2026-03-02T10:00:02.000Z"),
      durationMs: 2000,
      runnerResults: {},
      totalProcessed: 7,
      totalErrors: 0,
    });

    const response = await request(server)
      .post("/internal/tick")
      .set("x-worker-key", "worker-secret")
      .send({ runnerNames: ["outbox"] });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      runId: "run-123",
      totalProcessed: 7,
      totalErrors: 0,
      durationMs: 2000,
      startedAt: "2026-03-02T10:00:00.000Z",
      finishedAt: "2026-03-02T10:00:02.000Z",
    });
    expect(mockTickOrchestrator.runOnce).toHaveBeenCalledWith({ runnerNames: ["outbox"] });
  });

  it("rejects tick trigger when worker key is invalid", async () => {
    process.env.INTERNAL_WORKER_KEY = "worker-secret";

    const response = await request(server)
      .post("/internal/tick")
      .set("x-worker-key", "wrong-key")
      .send({ runnerNames: ["outbox"] });

    expect(response.status).toBe(401);
    expect(mockTickOrchestrator.runOnce).not.toHaveBeenCalled();
  });

  it("allows tick trigger without header when no worker key is configured", async () => {
    delete process.env.INTERNAL_WORKER_KEY;
    mockTickOrchestrator.runOnce.mockResolvedValue({
      runId: "run-456",
      startedAt: new Date("2026-03-02T11:00:00.000Z"),
      finishedAt: new Date("2026-03-02T11:00:01.000Z"),
      durationMs: 1000,
      runnerResults: {},
      totalProcessed: 0,
      totalErrors: 0,
    });

    const response = await request(server).post("/internal/tick").send();

    expect(response.status).toBe(201);
    expect(mockTickOrchestrator.runOnce).toHaveBeenCalledWith({ runnerNames: undefined });
  });

  it("calls invoice PDF generator endpoint with validated worker auth", async () => {
    process.env.INTERNAL_WORKER_KEY = "worker-secret";
    mockInvoicePdfService.generateAndStore.mockResolvedValue({ ok: true });

    const response = await request(server)
      .post("/internal/invoices/inv-1/pdf")
      .set("x-worker-key", "worker-secret")
      .send({ tenantId: "tenant-1" });

    expect(response.status).toBe(201);
    expect(mockInvoicePdfService.generateAndStore).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      invoiceId: "inv-1",
    });
  });
});
