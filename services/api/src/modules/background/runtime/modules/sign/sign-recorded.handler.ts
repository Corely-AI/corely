import { z } from "zod";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";

// These are durable audit facts. None of them requests notification delivery.
const templateFact = z
  .object({
    workspaceId: z.string().min(1),
    templateId: z.string().uuid(),
    revision: z.number().int().positive(),
  })
  .strict();
const requestFact = templateFact.extend({ requestId: z.string().uuid() });

const templateHandlers: EventHandler[] = [
  "sign.template.draft_saved.v1",
  "sign.template.archived.v1",
  "sign.template.published.v1",
  "sign.request.draft_created.v1",
].map((eventType) => ({
  eventType,
  async handle(event) {
    const schema = eventType === "sign.request.draft_created.v1" ? requestFact : templateFact;
    if (
      !event.tenantId ||
      event.eventType !== eventType ||
      !schema.safeParse(event.payload).success
    ) {
      throw Object.assign(new Error("Invalid Sign lifecycle event"), { permanent: true });
    }
  },
}));
export const signRecordedHandlers: EventHandler[] = [
  ...templateHandlers,
  ...["sign.request.sent.v1", "sign.request.closed.v1", "sign.recipient.accepted.v1"].map(
    (eventType) => ({
      eventType,
      async handle(event: OutboxEvent) {
        if (
          !event.tenantId ||
          !z
            .object({ requestId: z.string().uuid(), workspaceId: z.string().min(1) })
            .safeParse(event.payload).success
        )
          throw Object.assign(new Error("Invalid signing fact"), { permanent: true });
      },
    })
  ),
];
