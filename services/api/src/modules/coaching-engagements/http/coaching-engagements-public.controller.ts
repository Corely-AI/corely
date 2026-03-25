import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  CLOCK_PORT_TOKEN,
  ID_GENERATOR_TOKEN,
  addDays,
  assertTimeZoneId,
  toIsoDateString,
  type ClockPort,
  type IdGeneratorPort,
} from "@corely/kernel";
import {
  CreateCoachingBookingHoldInputSchema,
  CreateCoachingBookingHoldOutputSchema,
  GetCoachingContractViewInputSchema,
  GetCoachingDebriefFormInputSchema,
  GetCoachingPrepFormInputSchema,
  GetCoachingPublicAvailabilityInputSchema,
  CoachingPublicAvailabilityOutputSchema,
  SignCoachingContractInputSchema,
  StartCoachingPublicBookingInputSchema,
  SubmitCoachingDebriefInputSchema,
  SubmitCoachingPrepFormInputSchema,
  type CoachingOfferDto,
} from "@corely/contracts";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { mapResultToHttp } from "@/shared/http/usecase-mappers";
import { CoachingEngagementsApplication } from "../application/coaching-engagements.application";
import { PrismaCoachingEngagementRepositoryAdapter } from "../infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { toCoachingBookingHoldDto } from "../application/mappers/coaching-dto.mapper";

const MAX_AVAILABILITY_RANGE_DAYS = 45;
const MAX_SLOTS_PER_REQUEST = 200;

function parseTime(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return { hours, minutes };
}

function isoWeekdayToSundayZero(localDate: string, timezone: string): number {
  const atNoon = fromZonedTime(`${localDate}T12:00:00`, timezone);
  return Number(formatInTimeZone(atNoon, timezone, "i")) % 7;
}

function formatDisplayInstant(value: Date, timezone: string): string {
  return formatInTimeZone(value, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

@Controller("coaching/public")
export class CoachingEngagementsPublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter,
    private readonly app: CoachingEngagementsApplication,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  @Get("offers/:offerId/availability")
  async getAvailability(
    @Param("offerId") offerId: string,
    @Query() query: Record<string, unknown>
  ) {
    const input = GetCoachingPublicAvailabilityInputSchema.parse({ ...query, offerId });
    const offer = await this.resolvePublicOffer(offerId);
    const displayTimezone = assertTimeZoneId(input.timezone ?? offer.availabilityRule.timezone);
    const slots = await this.computeAvailableSlots({
      offer,
      from: new Date(input.from),
      to: new Date(input.to),
      displayTimezone,
      now: this.clock.now(),
    });

    return CoachingPublicAvailabilityOutputSchema.parse({
      offerId: offer.id,
      offerTimezone: offer.availabilityRule.timezone,
      displayTimezone,
      slots,
    });
  }

  @Post("offers/:offerId/holds")
  async createHold(@Param("offerId") offerId: string, @Body() body: unknown) {
    const input = CreateCoachingBookingHoldInputSchema.parse({ ...(body as object), offerId });
    const offer = await this.resolvePublicOffer(offerId);
    const now = this.clock.now();
    const slot = await this.findExactAvailableSlot({
      offer,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      now,
    });

    if (!slot) {
      throw new ConflictException("Selected slot is no longer available");
    }

    const ttlSeconds = input.ttlSeconds ?? 600;
    const hold = await this.repo.createBookingHold({
      id: this.idGenerator.newId(),
      offerId: offer.id,
      coachUserId: offer.coachUserId!,
      tenantId: offer.tenantId,
      workspaceId: offer.workspaceId,
      status: "active",
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
      bookedByName: input.bookedByName ?? null,
      bookedByEmail: input.bookedByEmail ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return CreateCoachingBookingHoldOutputSchema.parse({
      hold: toCoachingBookingHoldDto(hold),
    });
  }

  @Post("offers/:offerId/bookings")
  async startPublicBooking(@Param("offerId") offerId: string, @Body() body: unknown) {
    const input = StartCoachingPublicBookingInputSchema.parse({ ...(body as object), offerId });
    const offer = await this.resolvePublicOffer(offerId);
    return mapResultToHttp(
      await this.app.startPublicBooking.execute(input, {
        tenantId: offer.tenantId,
        workspaceId: offer.workspaceId,
        correlationId: `coaching-public-booking:${offerId}`,
        requestId: `coaching-public-booking:${offerId}`,
      })
    );
  }

  @Get("contracts/:engagementId/:token")
  @Header("Content-Type", "text/html; charset=utf-8")
  async getContract(@Param("engagementId") engagementId: string, @Param("token") token: string) {
    const engagement = await this.prisma.coachingEngagement.findUnique({
      where: { id: engagementId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = GetCoachingContractViewInputSchema.parse({ engagementId, token });
    const contract = mapResultToHttp(
      await this.app.getContractView.execute(input, {
        tenantId: engagement?.tenantId,
        workspaceId: engagement?.workspaceId,
        requestId: `coaching-contract-view:${engagementId}`,
        correlationId: `coaching-contract-view:${engagementId}`,
      })
    );

    const title = escapeHtml(contract.request.contractTitle);
    const recipientEmail = contract.request.recipientEmail
      ? escapeHtml(contract.request.recipientEmail)
      : "";
    const engagementTitle = escapeHtml(
      contract.engagement.offer.title[contract.engagement.locale] ??
        contract.engagement.offer.title[contract.engagement.offer.localeDefault] ??
        contract.request.contractTitle
    );
    const contractBody = escapeHtml(contract.contractBody);
    const actionUrl = escapeHtml(`/coaching/public/contracts/${engagementId}/${token}/sign`);

    return `<!doctype html>
<html lang="${escapeHtml(contract.engagement.locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: Georgia, "Times New Roman", serif; margin: 0; background: #f4efe6; color: #1f1a17; }
      main { max-width: 860px; margin: 0 auto; padding: 40px 20px 64px; }
      .card { background: rgba(255,255,255,0.92); border: 1px solid #dbcab4; border-radius: 18px; padding: 24px; box-shadow: 0 20px 50px rgba(87, 60, 29, 0.08); }
      h1 { margin: 0 0 8px; font-size: 2rem; line-height: 1.1; }
      p { margin: 0 0 12px; line-height: 1.6; }
      .meta { color: #6d5a46; margin-bottom: 24px; }
      pre { white-space: pre-wrap; word-break: break-word; font: inherit; line-height: 1.7; background: #fffaf2; border: 1px solid #e7d7c4; border-radius: 14px; padding: 20px; }
      form { display: grid; gap: 12px; margin-top: 24px; }
      label { display: grid; gap: 6px; font-size: 0.95rem; }
      input { border: 1px solid #c7b299; border-radius: 10px; padding: 12px 14px; font: inherit; }
      button { border: 0; border-radius: 999px; background: #1f1a17; color: #fffaf2; padding: 12px 18px; font: inherit; cursor: pointer; }
      .status { min-height: 24px; color: #6d5a46; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>${title}</h1>
        <p class="meta">Booking: ${engagementTitle}${recipientEmail ? ` • Intended signer: ${recipientEmail}` : ""}</p>
        <pre>${contractBody}</pre>
        <form id="sign-form">
          <label>
            Signer name
            <input name="signerName" type="text" required />
          </label>
          <label>
            Signer email
            <input name="signerEmail" type="email" value="${recipientEmail}" />
          </label>
          <button type="submit">Sign agreement</button>
          <p id="status" class="status"></p>
        </form>
      </div>
    </main>
    <script>
      const form = document.getElementById("sign-form");
      const status = document.getElementById("status");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        status.textContent = "Submitting signature...";
        const formData = new FormData(form);
        const payload = {
          signerName: String(formData.get("signerName") || ""),
          signerEmail: String(formData.get("signerEmail") || "") || undefined,
        };
        const response = await fetch("${actionUrl}", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          status.textContent = data.message || "Unable to complete signature.";
          return;
        }
        form.reset();
        status.textContent = "Agreement signed. You can close this page.";
      });
    </script>
  </body>
</html>`;
  }

  @Post("contracts/:engagementId/:token/sign")
  async signContract(
    @Param("engagementId") engagementId: string,
    @Param("token") token: string,
    @Body() body: unknown
  ) {
    const engagement = await this.prisma.coachingEngagement.findUnique({
      where: { id: engagementId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = SignCoachingContractInputSchema.parse({
      ...(body as object),
      engagementId,
      token,
    });
    return mapResultToHttp(
      await this.app.signContract.execute(input, {
        tenantId: engagement?.tenantId,
        workspaceId: engagement?.workspaceId,
        requestId: `coaching-contract:${engagementId}`,
        correlationId: `coaching-contract:${engagementId}`,
      })
    );
  }

  @Get("prep/:sessionId/:token")
  async getPrep(@Param("sessionId") sessionId: string, @Param("token") token: string) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = GetCoachingPrepFormInputSchema.parse({ sessionId, token });
    return mapResultToHttp(
      await this.app.getPrepForm.execute(input, {
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        requestId: `coaching-prep:${sessionId}`,
        correlationId: `coaching-prep:${sessionId}`,
      })
    );
  }

  @Post("prep/:sessionId/:token")
  async submitPrep(
    @Param("sessionId") sessionId: string,
    @Param("token") token: string,
    @Body() body: unknown
  ) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = SubmitCoachingPrepFormInputSchema.parse({
      ...(body as object),
      sessionId,
      token,
    });
    return mapResultToHttp(
      await this.app.submitPrepForm.execute(input, {
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        requestId: `coaching-prep-submit:${sessionId}`,
        correlationId: `coaching-prep-submit:${sessionId}`,
      })
    );
  }

  @Get("debrief/:sessionId/:token")
  async getDebrief(@Param("sessionId") sessionId: string, @Param("token") token: string) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = GetCoachingDebriefFormInputSchema.parse({ sessionId, token });
    return mapResultToHttp(
      await this.app.getDebriefForm.execute(input, {
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        requestId: `coaching-debrief:${sessionId}`,
        correlationId: `coaching-debrief:${sessionId}`,
      })
    );
  }

  @Post("debrief/:sessionId/:token")
  async submitDebrief(
    @Param("sessionId") sessionId: string,
    @Param("token") token: string,
    @Body() body: unknown
  ) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: { tenantId: true, workspaceId: true },
    });
    const input = SubmitCoachingDebriefInputSchema.parse({
      ...(body as object),
      sessionId,
      token,
    });
    return mapResultToHttp(
      await this.app.submitDebrief.execute(input, {
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        requestId: `coaching-debrief-submit:${sessionId}`,
        correlationId: `coaching-debrief-submit:${sessionId}`,
      })
    );
  }

  private async resolvePublicOffer(offerId: string): Promise<{
    id: string;
    tenantId: string;
    workspaceId: string | null;
    coachUserId: string | null;
    availabilityRule: CoachingOfferDto["availabilityRule"];
    bookingRules: CoachingOfferDto["bookingRules"];
    sessionDurationMinutes: number;
  }> {
    const offer = await this.repo.findPublicOfferById(offerId);
    if (!offer || !offer.workspaceId) {
      throw new NotFoundException("Coaching offer not found");
    }
    if (!offer.coachUserId) {
      throw new BadRequestException("Coaching offer is missing coach ownership");
    }
    return offer;
  }

  private async findExactAvailableSlot(params: {
    offer: {
      id: string;
      tenantId: string;
      workspaceId: string | null;
      coachUserId: string | null;
      availabilityRule: CoachingOfferDto["availabilityRule"];
      bookingRules: CoachingOfferDto["bookingRules"];
      sessionDurationMinutes: number;
    };
    startAt: Date;
    endAt: Date;
    now: Date;
  }) {
    const slots = await this.computeAvailableSlots({
      offer: params.offer,
      from: params.startAt,
      to: params.endAt,
      displayTimezone: params.offer.availabilityRule.timezone,
      now: params.now,
    });
    return slots.find(
      (slot) =>
        slot.startAt === params.startAt.toISOString() && slot.endAt === params.endAt.toISOString()
    );
  }

  private async computeAvailableSlots(params: {
    offer: {
      id: string;
      tenantId: string;
      workspaceId: string | null;
      coachUserId: string | null;
      availabilityRule: CoachingOfferDto["availabilityRule"];
      bookingRules: CoachingOfferDto["bookingRules"];
      sessionDurationMinutes: number;
    };
    from: Date;
    to: Date;
    displayTimezone: string;
    now: Date;
  }): Promise<Array<{ startAt: string; endAt: string; displayStart: string; displayEnd: string }>> {
    const { offer, from, to, displayTimezone, now } = params;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException("Invalid availability range");
    }

    const rangeDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    if (rangeDays > MAX_AVAILABILITY_RANGE_DAYS) {
      throw new BadRequestException(
        `Availability range too large. Maximum ${MAX_AVAILABILITY_RANGE_DAYS} days.`
      );
    }

    const offerTimezone = assertTimeZoneId(offer.availabilityRule.timezone || "UTC");
    const blackouts = offer.availabilityRule.blackouts.map((interval) => ({
      startAt: new Date(interval.startAt),
      endAt: new Date(interval.endAt),
    }));
    const earliestStart = new Date(
      now.getTime() + offer.bookingRules.minNoticeHours * 60 * 60 * 1000
    );
    const latestStart = new Date(
      now.getTime() + offer.bookingRules.maxAdvanceDays * 24 * 60 * 60 * 1000
    );
    const durationMs = offer.sessionDurationMinutes * 60 * 1000;
    const stepMs = durationMs;
    const slots: Array<{
      startAt: string;
      endAt: string;
      displayStart: string;
      displayEnd: string;
    }> = [];

    let localDate = toIsoDateString(from, offerTimezone);
    const endLocalDate = toIsoDateString(to, offerTimezone);

    while (localDate <= endLocalDate && slots.length < MAX_SLOTS_PER_REQUEST) {
      const weekday = isoWeekdayToSundayZero(localDate, offerTimezone);
      const daySlots = offer.availabilityRule.weeklySlots.filter(
        (slot) => slot.dayOfWeek === weekday
      );

      for (const weeklySlot of daySlots) {
        const startTime = parseTime(weeklySlot.startTime);
        const endTime = parseTime(weeklySlot.endTime);
        if (!startTime || !endTime) {
          continue;
        }

        const windowStart = fromZonedTime(`${localDate}T${weeklySlot.startTime}:00`, offerTimezone);
        const windowEnd = fromZonedTime(`${localDate}T${weeklySlot.endTime}:00`, offerTimezone);
        if (windowEnd <= windowStart) {
          continue;
        }

        for (
          let cursor = windowStart.getTime();
          cursor + durationMs <= windowEnd.getTime() && slots.length < MAX_SLOTS_PER_REQUEST;
          cursor += stepMs
        ) {
          const startAt = new Date(cursor);
          const endAt = new Date(cursor + durationMs);
          if (startAt < from || endAt > to) {
            continue;
          }
          if (startAt < earliestStart || startAt > latestStart) {
            continue;
          }

          const overlapsBlackout = blackouts.some(
            (blackout) => blackout.startAt < endAt && blackout.endAt > startAt
          );
          if (overlapsBlackout) {
            continue;
          }

          const bufferedStart = new Date(
            startAt.getTime() - offer.bookingRules.bufferBeforeMinutes * 60 * 1000
          );
          const bufferedEnd = new Date(
            endAt.getTime() + offer.bookingRules.bufferAfterMinutes * 60 * 1000
          );
          const [hasSessionConflict, hasHoldConflict] = await Promise.all([
            this.repo.hasCoachSessionConflict(
              offer.tenantId,
              offer.coachUserId!,
              bufferedStart,
              bufferedEnd
            ),
            this.repo.hasActiveHoldConflict(
              offer.tenantId,
              offer.coachUserId!,
              bufferedStart,
              bufferedEnd,
              now
            ),
          ]);
          if (hasSessionConflict || hasHoldConflict) {
            continue;
          }

          slots.push({
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            displayStart: formatDisplayInstant(startAt, displayTimezone),
            displayEnd: formatDisplayInstant(endAt, displayTimezone),
          });
        }
      }

      localDate = addDays(localDate, 1, offerTimezone);
    }

    return slots;
  }
}
