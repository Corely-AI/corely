import { describe, expect, it } from "vitest";
import type { EmailSenderPort, IdempotencyPort } from "@corely/kernel";
import type { EnvService } from "@corely/config";
import { DirectoryLeadCreatedHandler } from "./directory-lead-created.handler";

class InMemoryIdempotency implements IdempotencyPort {
  private readonly store = new Map<string, unknown>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.store.has(key)) {
      return this.store.get(key) as T;
    }

    const result = await fn();
    this.store.set(key, result);
    return result;
  }
}

describe("DirectoryLeadCreatedHandler", () => {
  it("handles the same event idempotently", async () => {
    const sent: Array<{ to: string[]; subject: string }> = [];

    const emailSender: EmailSenderPort = {
      sendEmail: async (request) => {
        sent.push({ to: request.to, subject: request.subject });
        return {
          provider: "fake",
          providerMessageId: `msg-${sent.length}`,
        };
      },
    };

    const env = {
      DIRECTORY_LEADS_NOTIFY_EMAIL: "ops@example.com",
    } as unknown as EnvService;

    const handler = new DirectoryLeadCreatedHandler(env, new InMemoryIdempotency(), emailSender);

    const event = {
      id: "outbox-1",
      tenantId: "directory-public-tenant",
      eventType: "directory.lead.created",
      payload: {
        leadId: "lead-1",
        tenantId: "directory-public-tenant",
        workspaceId: "directory-public-workspace",
        restaurantId: "restaurant-1",
        restaurantSlug: "pho-viet-mitte",
        restaurantName: "Pho Viet Mitte",
        name: "An",
        contact: "an@example.com",
        message: "Need catering",
        createdAt: "2026-02-22T10:00:00.000Z",
      },
      correlationId: "corr-1",
    };

    await handler.handle(event);
    await handler.handle(event);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["ops@example.com"]);
  });
});
