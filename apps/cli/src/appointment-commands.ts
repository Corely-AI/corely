import {
  AppointmentReviewSchema,
  CliAppointmentMessageDraftRequestSchema,
  CliAppointmentMessageOperations,
  CliAppointmentOperations,
  CliAppointmentProposalRequestSchema,
  CliAppointmentReviewSelectorSchema,
  type AppointmentReview,
  type CliGrantScope,
} from "@corely/contracts/identity/sso";
import { CliError } from "./errors";
import { terminalLabel } from "./terminal";

type Flags = {
  booking?: string;
  start?: string;
  review?: string;
  note?: string;
  "idempotency-key"?: string;
};
const commands = [
  ...Object.entries(CliAppointmentOperations).map(([verb, operation]) => ({
    verb,
    id: operation.id,
    command: `appointments ${verb}`,
    path: `appointments/${verb}`,
  })),
  ...Object.entries(CliAppointmentMessageOperations).map(([verb, operation]) => ({
    verb,
    id: operation.id,
    command: `appointments message ${verb}`,
    path: `appointments/messages/${verb}`,
  })),
];

export function appointmentCommand(command: string) {
  return commands.find(
    (entry) => command === entry.command || command === `operations run ${entry.id}`
  );
}

export async function runAppointmentCommand(
  command: (typeof commands)[number],
  values: Flags,
  scope: CliGrantScope,
  send: (path: string, body: Record<string, unknown>) => Promise<unknown>
) {
  const request = parseInput(command.verb, values, scope);
  if (!request.success) {
    throw new CliError("USAGE", usage[command.verb] ?? "Specify --review with the review ID.");
  }
  const review = AppointmentReviewSchema.parse(await send(command.path, request.data));
  return { review, display: displayAppointmentReview(review) };
}

const usage: Record<string, string> = {
  propose: "Specify --booking, --start with a timezone offset, and --idempotency-key.",
  draft: "Specify --review for the applied appointment, --idempotency-key, and an optional --note.",
};

function parseInput(verb: string, values: Flags, scope: CliGrantScope) {
  const key = values["idempotency-key"];
  if (verb === "propose") {
    return CliAppointmentProposalRequestSchema.safeParse({
      ...scope,
      proposal: { bookingId: values.booking, startAt: values.start, key },
    });
  }
  const selector = { ...scope, reviewId: values.review };
  if (verb === "draft") {
    return CliAppointmentMessageDraftRequestSchema.safeParse({
      ...selector,
      key,
      note: values.note,
    });
  }
  return CliAppointmentReviewSelectorSchema.safeParse(selector);
}

export function displayAppointmentReview(review: AppointmentReview) {
  const lines = [`${review.state} · ${review.id}`];
  if (review.action.kind === "replacement") {
    const { reference, timezone, current, replacement } = review.action.payload;
    const date = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    });
    const detail = (slot: typeof current) =>
      `${date.format(new Date(slot.startAt))} – ${date.format(new Date(slot.endAt))} · ${terminalLabel(slot.resourceName)}`;
    lines.push(
      `Booking ${terminalLabel(reference)} · ${timezone}`,
      `Current: ${detail(current)}`,
      `Proposed: ${detail(replacement)}`
    );
  } else {
    const { bookingId, bookingVersion, recipient, subject } = review.action.payload;
    lines.push(
      `Booking ${bookingId} · confirmed version ${bookingVersion}`,
      `Recipient: ${terminalLabel(recipient)}`,
      `Subject: ${terminalLabel(subject)}`,
      review.delivery
        ? `Delivery: ${review.delivery.state} · ${review.delivery.deliveryId}${review.delivery.retryable ? " · retry available" : ""}`
        : "Delivery: none"
    );
  }
  if (review.failureCode) {
    lines.push(`Result: ${review.failureCode}`);
  }
  lines.push(`Review expires: ${review.expiresAt}`, review.reviewPath);
  return lines.join("\n");
}
