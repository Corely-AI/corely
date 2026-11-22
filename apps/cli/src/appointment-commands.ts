import {
  AppointmentReviewSchema,
  CliAppointmentOperations,
  CliAppointmentProposalRequestSchema,
  CliAppointmentReviewSelectorSchema,
  type AppointmentReview,
  type CliGrantScope,
} from "@corely/contracts/identity/sso";
import { CliError } from "./errors";
import { terminalLabel } from "./terminal";

type Action = keyof typeof CliAppointmentOperations;
type Flags = { booking?: string; start?: string; review?: string; "idempotency-key"?: string };

export function appointmentCommand(command: string): Action | undefined {
  return (Object.keys(CliAppointmentOperations) as Action[]).find(
    (action) =>
      command === `appointments ${action}` ||
      command === `operations run ${CliAppointmentOperations[action].id}`
  );
}

export async function runAppointmentCommand(
  action: Action,
  values: Flags,
  scope: CliGrantScope,
  send: (path: string, body: Record<string, unknown>) => Promise<unknown>
) {
  const request =
    action === "propose"
      ? CliAppointmentProposalRequestSchema.safeParse({
          ...scope,
          proposal: {
            bookingId: values.booking,
            startAt: values.start,
            key: values["idempotency-key"],
          },
        })
      : CliAppointmentReviewSelectorSchema.safeParse({ ...scope, reviewId: values.review });
  if (!request.success) {
    throw new CliError(
      "USAGE",
      action === "propose"
        ? "Specify --booking, --start with a timezone offset, and --idempotency-key."
        : "Specify --review with the review ID."
    );
  }
  const review = AppointmentReviewSchema.parse(await send(`appointments/${action}`, request.data));
  return { review, display: displayAppointmentReview(review) };
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
  }
  if (review.failureCode) {
    lines.push(`Result: ${review.failureCode}`);
  }
  lines.push(`Review expires: ${review.expiresAt}`, review.reviewPath);
  return lines.join("\n");
}
