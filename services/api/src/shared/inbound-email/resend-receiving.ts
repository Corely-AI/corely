import { BadRequestException, UnauthorizedException, type RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { Resend } from "resend";
import { z } from "zod";

const verifier = new Resend("inbound-webhook-verifier");
const schema = z.object({
  email_id: z.string().min(1),
  to: z.array(z.string()),
  attachments: z.array(
    z.object({
      id: z.string().min(1),
      filename: z.string().nullish(),
      content_type: z.string(),
      content_disposition: z.string().nullish(),
      content_id: z.string().nullish(),
    })
  ),
});

export const verifyResendReceivingEvent = (req: RawBodyRequest<Request>, secret: string) => {
  const id = req.header("svix-id");
  const timestamp = req.header("svix-timestamp");
  const signature = req.header("svix-signature");
  if (!req.rawBody || !id || !timestamp || !signature) {
    throw new UnauthorizedException("Missing inbound email signature");
  }
  let event;
  try {
    event = verifier.webhooks.verify({
      payload: req.rawBody.toString("utf8"),
      webhookSecret: secret,
      headers: { id, timestamp, signature },
    });
  } catch {
    throw new UnauthorizedException("Invalid inbound email signature");
  }
  if (event.type !== "email.received") {
    return null;
  }
  const parsed = schema.safeParse(event.data);
  if (!parsed.success) {
    throw new BadRequestException("Invalid inbound email delivery");
  }
  const { email_id, to, attachments } = parsed.data;
  return {
    id: email_id,
    to,
    attachments: attachments.map(({ id, content_type, ...rest }) => ({
      id,
      content_type,
      ...rest,
    })),
  };
};
