import { describe, expect, it, beforeEach, vi } from "vitest";
import { TraceIdMiddleware, TRACE_ID_HEADER } from "../trace-id.middleware.js";
import { TraceIdService } from "../trace-id.service.js";
import type { Request, Response, NextFunction } from "express";

describe("TraceIdMiddleware", () => {
  let middleware: TraceIdMiddleware;
  let traceIdService: TraceIdService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    traceIdService = new TraceIdService();
    middleware = new TraceIdMiddleware(traceIdService);

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it("should generate new trace ID if not present in header", () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).traceId).toBeDefined();
    expect((mockRequest as any).traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      TRACE_ID_HEADER,
      (mockRequest as any).traceId
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it("should extract trace ID from x-trace-id header", () => {
    const existingTraceId = "550e8400-e29b-41d4-a716-446655440000";
    mockRequest.headers = {
      [TRACE_ID_HEADER]: existingTraceId,
    };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).traceId).toBe(existingTraceId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(TRACE_ID_HEADER, existingTraceId);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should generate new ID if header value is invalid", () => {
    mockRequest.headers = {
      [TRACE_ID_HEADER]: "invalid-trace-id",
    };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).traceId).not.toBe("invalid-trace-id");
    expect((mockRequest as any).traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("should handle array header values", () => {
    const validTraceId = "550e8400-e29b-41d4-a716-446655440000";
    mockRequest.headers = {
      [TRACE_ID_HEADER]: [validTraceId, "another-value"] as any,
    };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    // Should use first value if it's an array
    expect((mockRequest as any).traceId).toBeDefined();
  });
});

describe("TraceIdService", () => {
  let service: TraceIdService;

  beforeEach(() => {
    service = new TraceIdService();
  });

  describe("generate", () => {
    it("should generate valid UUID", () => {
      const traceId = service.generate();

      expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should generate unique IDs", () => {
      const id1 = service.generate();
      const id2 = service.generate();

      expect(id1).not.toBe(id2);
    });
  });

  describe("extractOrGenerate", () => {
    it("should return valid UUID from header", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";

      const result = service.extractOrGenerate(validUuid);

      expect(result).toBe(validUuid);
    });

    it("should generate new ID for invalid header", () => {
      const result = service.extractOrGenerate("not-a-uuid");

      expect(result).not.toBe("not-a-uuid");
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should generate new ID for undefined header", () => {
      const result = service.extractOrGenerate(undefined);

      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});
