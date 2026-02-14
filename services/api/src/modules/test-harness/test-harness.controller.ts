import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { TestHarnessGuard } from "./guards/test-harness.guard";
import { TestHarnessService } from "./test-harness.service";

@Controller("test")
@UseGuards(TestHarnessGuard)
export class TestHarnessController {
  constructor(@Inject("TEST_HARNESS_SERVICE") private testHarnessService: TestHarnessService) {}

  /**
   * Seed test data: creates a new tenant with user and roles
   */
  @Post("seed")
  @HttpCode(HttpStatus.OK)
  async seedData(@Body() payload: { email: string; password: string; tenantName: string }) {
    if (!payload.email || !payload.password || !payload.tenantName) {
      throw new BadRequestException("Missing required fields: email, password, tenantName");
    }

    return this.testHarnessService.seedTestData({
      email: payload.email,
      password: payload.password,
      tenantName: payload.tenantName,
    });
  }

  /**
   * Reset tenant-scoped data: clears all test data for a tenant
   */
  @Post("reset")
  @HttpCode(HttpStatus.OK)
  async resetData(@Body() payload: { tenantId: string }) {
    if (!payload.tenantId) {
      throw new BadRequestException("Missing required field: tenantId");
    }

    await this.testHarnessService.resetTenantData(payload.tenantId);
    return { success: true, message: "Tenant data reset successfully" };
  }

  /**
   * Drain outbox: process all pending outbox events deterministically
   */
  @Post("drain-outbox")
  @HttpCode(HttpStatus.OK)
  async drainOutbox() {
    const result = await this.testHarnessService.drainOutbox();
    return {
      success: true,
      processedCount: result.processedCount,
      failedCount: result.failedCount,
    };
  }

  /**
   * Login as portal user (returns tokens)
   */
  @Post("portal/login")
  @HttpCode(HttpStatus.OK)
  async portalLogin(@Body() payload: { email: string; tenantId: string; workspaceId: string }) {
    if (!payload.email || !payload.tenantId || !payload.workspaceId) {
      throw new BadRequestException("Missing required fields: email, tenantId, workspaceId");
    }

    return this.testHarnessService.loginAsPortalUser({
      email: payload.email,
      tenantId: payload.tenantId,
      workspaceId: payload.workspaceId,
    });
  }

  /**
   * Seed portal test data: creates tenant, workspace, student, class, enrollment, document
   */
  @Post("portal/seed")
  @HttpCode(HttpStatus.OK)
  async seedPortalData() {
    return this.testHarnessService.seedPortalTestData();
  }

  /**
   * Seed one copilot thread and one user message (for deterministic search E2E)
   */
  @Post("copilot/seed-thread-message")
  @HttpCode(HttpStatus.OK)
  async seedCopilotThreadMessage(
    @Body() payload: { tenantId: string; userId: string; title: string; messageText: string }
  ) {
    if (!payload.tenantId || !payload.userId || !payload.title || !payload.messageText) {
      throw new BadRequestException(
        "Missing required fields: tenantId, userId, title, messageText"
      );
    }

    return this.testHarnessService.seedCopilotThreadMessage(payload);
  }

  /**
   * Seed classes billing send scenario with 2 customers/invoices.
   */
  @Post("classes-billing/seed-send-invoices")
  @HttpCode(HttpStatus.OK)
  async seedClassesBillingSendInvoices(
    @Body()
    payload: {
      tenantId: string;
      workspaceId: string;
      actorUserId: string;
      month?: string;
      label?: string;
    }
  ) {
    if (!payload.tenantId || !payload.workspaceId || !payload.actorUserId) {
      throw new BadRequestException("Missing required fields: tenantId, workspaceId, actorUserId");
    }
    return this.testHarnessService.seedClassesBillingSendScenario(payload);
  }

  /**
   * List email delivery records for invoices (for E2E verification).
   */
  @Post("invoices/email-deliveries")
  @HttpCode(HttpStatus.OK)
  async listInvoiceEmailDeliveries(@Body() payload: { tenantId: string; invoiceIds: string[] }) {
    if (!payload.tenantId || !Array.isArray(payload.invoiceIds)) {
      throw new BadRequestException("Missing required fields: tenantId, invoiceIds");
    }
    return {
      deliveries: await this.testHarnessService.listInvoiceEmailDeliveries(payload),
    };
  }

  /**
   * Health check endpoint
   */
  @Post("health")
  @HttpCode(HttpStatus.OK)
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
