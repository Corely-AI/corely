import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { PrismaService, EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import {
  PublicBookingPageOutputSchema,
  PublicBookingServicesOutputSchema,
  PublicBookingAvailabilityInputSchema,
  PublicBookingAvailabilityOutputSchema,
  PublicCreateBookingHoldInputSchema,
  PublicConfirmBookingInputSchema,
  PublicBookingSummaryOutputSchema,
  PublicBookingAddressSchema,
} from "@corely/contracts";
import {
  AVAILABILITY_RULE_REPOSITORY,
  BOOKING_REPOSITORY,
  HOLD_REPOSITORY,
  RESOURCE_REPOSITORY,
  SERVICE_REPOSITORY,
  type AvailabilityRuleRepositoryPort,
  type BookingRepositoryPort,
  type HoldRepositoryPort,
  type ResourceRepositoryPort,
  type ServiceRepositoryPort,
} from "../application/ports/booking-repo.ports";
import { CreateHoldUseCase } from "../application/use-cases/create-hold.usecase";
import { CreateBookingUseCase } from "../application/use-cases/create-booking.usecase";
import { GetBookingUseCase } from "../application/use-cases/get-booking.usecase";
import {
  BOOKING_NOTIFICATION_PORT,
  type BookingNotificationPort,
} from "../application/ports/booking-notification.port";
import type { BookingResource, ServiceOffering } from "../domain/booking.entities";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { toHttpException } from "../../../shared/http/usecase-error.mapper";
import { PublicWorkspaceRoute, assertPublicModuleEnabled } from "../../../shared/public";
import { z } from "zod";

const PUBLIC_BOOKING_SCOPE = (workspaceId: string) => `workspace:${workspaceId}`;
const PUBLIC_BOOKING_MODULE_ID = "booking";
const PUBLIC_BOOKING_SETTINGS_KEY = "public-page";

const PUBLIC_BOOKING_RATE_LIMIT_WINDOW_MS = 60_000;
const PUBLIC_BOOKING_RATE_LIMIT_MAX = 30;
const publicBookingRateBuckets = new Map<string, { count: number; resetAt: number }>();

const MAX_AVAILABILITY_RANGE_DAYS = 45;
const MAX_SLOTS_PER_REQUEST = 600;

const PublicBookingPageConfigSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/i)
    .optional(),
  venueName: z.string().min(1).max(200).optional(),
  timezone: z.string().min(1).max(100).optional(),
  description: z.string().max(4000).optional().nullable(),
  openingHoursText: z.string().max(2000).optional().nullable(),
  cancellationPolicyText: z.string().max(2000).optional().nullable(),
  cancellationCutoffHours: z.number().int().nonnegative().optional().nullable(),
  depositPolicyText: z.string().max(2000).optional().nullable(),
  heroImageFileIds: z.array(z.string()).optional(),
  allowStaffSelection: z.boolean().optional(),
});

type PublicBookingPageConfig = z.infer<typeof PublicBookingPageConfigSchema>;

const parseTime = (value: string): { hours: number; minutes: number } | null => {
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
};

const utcDateKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toIso = (value: Date | string): string => {
  if (typeof value === "string") {
    return value;
  }
  return value.toISOString();
};

const resolveClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(",")[0]?.trim() ?? "unknown";
  }
  if (typeof req.ip === "string" && req.ip.length > 0) {
    return req.ip;
  }
  return req.socket.remoteAddress ?? "unknown";
};

const enforcePublicBookingRateLimit = (key: string): void => {
  const now = Date.now();
  const bucket = publicBookingRateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    publicBookingRateBuckets.set(key, {
      count: 1,
      resetAt: now + PUBLIC_BOOKING_RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (bucket.count >= PUBLIC_BOOKING_RATE_LIMIT_MAX) {
    throw new HttpException(
      "Too many booking attempts. Please try again shortly.",
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  bucket.count += 1;
  publicBookingRateBuckets.set(key, bucket);
};

@Controller("public/booking")
@PublicWorkspaceRoute()
export class PublicBookingController {
  private readonly logger = new Logger(PublicBookingController.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EXT_KV_PORT) private readonly kv: ExtKvPort,
    @Inject(SERVICE_REPOSITORY) private readonly serviceRepo: ServiceRepositoryPort,
    @Inject(RESOURCE_REPOSITORY) private readonly resourceRepo: ResourceRepositoryPort,
    @Inject(AVAILABILITY_RULE_REPOSITORY)
    private readonly availabilityRuleRepo: AvailabilityRuleRepositoryPort,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: BookingRepositoryPort,
    @Inject(HOLD_REPOSITORY) private readonly holdRepo: HoldRepositoryPort,
    private readonly createHold: CreateHoldUseCase,
    private readonly createBooking: CreateBookingUseCase,
    private readonly getBooking: GetBookingUseCase,
    @Inject(BOOKING_NOTIFICATION_PORT)
    private readonly bookingNotifications: BookingNotificationPort
  ) {}

  @Get("pages/:slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async getPublicPage(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const pageData = await this.resolvePageData(slug, ctx);

    return PublicBookingPageOutputSchema.parse({
      page: pageData.page,
      services: pageData.services,
      staff: pageData.staff,
    });
  }

  @Get("pages/:slug/services")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async listPublicServices(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const pageData = await this.resolvePageData(slug, ctx);

    return PublicBookingServicesOutputSchema.parse({
      services: pageData.services,
    });
  }

  @Get("pages/:slug/availability")
  @Header("Cache-Control", "no-store")
  async getAvailability(
    @Param("slug") slug: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const parsed = PublicBookingAvailabilityInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const pageData = await this.resolvePageData(slug, ctx);

    const service = await this.serviceRepo.findById(parsed.serviceId, ctx.tenantId!);
    if (!service || !service.isActive) {
      throw new NotFoundException("Service not found");
    }

    const from = new Date(parsed.from);
    const to = new Date(parsed.to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException("Invalid availability range");
    }

    if (from >= to) {
      throw new BadRequestException("Invalid availability range");
    }

    const dayDiff = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    if (dayDiff > MAX_AVAILABILITY_RANGE_DAYS) {
      throw new BadRequestException(
        `Availability range too large. Maximum ${MAX_AVAILABILITY_RANGE_DAYS} days.`
      );
    }

    const candidates = await this.resolveCandidateResources({
      tenantId: ctx.tenantId!,
      service,
      staffId: parsed.staffId,
    });

    const now = new Date();
    const slotDurationMinutes = Math.max(1, service.totalSlotMinutes);
    const slotStepMinutes = Math.max(15, Math.min(60, service.durationMinutes));

    const allSlots: Array<{
      startAt: string;
      endAt: string;
      resourceId: string;
      staffId: string | null;
      staffName: string | null;
    }> = [];

    for (const resource of candidates) {
      const rule = await this.availabilityRuleRepo.findByResourceId(resource.id, ctx.tenantId!);
      if (!rule) {
        continue;
      }

      const blackouts = rule.blackouts.map((interval) => ({
        startAt: new Date(interval.startAt),
        endAt: new Date(interval.endAt),
      }));

      const dayCursor = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
      );
      const dayLimit = new Date(
        Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + 1)
      );

      while (dayCursor < dayLimit) {
        const weekday = dayCursor.getUTCDay();
        const daySlots = rule.weeklySlots.filter((slot) => slot.dayOfWeek === weekday);

        for (const slot of daySlots) {
          const startTime = parseTime(slot.startTime);
          const endTime = parseTime(slot.endTime);
          if (!startTime || !endTime) {
            continue;
          }

          const windowStart = new Date(
            Date.UTC(
              dayCursor.getUTCFullYear(),
              dayCursor.getUTCMonth(),
              dayCursor.getUTCDate(),
              startTime.hours,
              startTime.minutes,
              0,
              0
            )
          );

          const windowEnd = new Date(
            Date.UTC(
              dayCursor.getUTCFullYear(),
              dayCursor.getUTCMonth(),
              dayCursor.getUTCDate(),
              endTime.hours,
              endTime.minutes,
              0,
              0
            )
          );

          if (windowEnd <= windowStart) {
            continue;
          }

          const stepMs = slotStepMinutes * 60 * 1000;
          const durationMs = slotDurationMinutes * 60 * 1000;

          for (
            let cursor = windowStart.getTime();
            cursor + durationMs <= windowEnd.getTime();
            cursor += stepMs
          ) {
            if (allSlots.length >= MAX_SLOTS_PER_REQUEST) {
              break;
            }

            const startAt = new Date(cursor);
            const endAt = new Date(cursor + durationMs);

            if (startAt < from || endAt > to || startAt <= now) {
              continue;
            }

            const overlapsBlackout = blackouts.some(
              (blackout) => blackout.startAt < endAt && blackout.endAt > startAt
            );
            if (overlapsBlackout) {
              continue;
            }

            const hasBookingConflict = await this.bookingRepo.hasConflict(
              ctx.tenantId!,
              resource.id,
              startAt,
              endAt
            );
            if (hasBookingConflict) {
              continue;
            }

            const hasHoldConflict = await this.holdRepo.hasActiveOverlap(
              ctx.tenantId!,
              resource.id,
              startAt,
              endAt,
              now
            );
            if (hasHoldConflict) {
              continue;
            }

            allSlots.push({
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
              resourceId: resource.id,
              staffId: resource.type === "STAFF" ? resource.id : null,
              staffName: resource.type === "STAFF" ? resource.name : null,
            });
          }
        }

        if (allSlots.length >= MAX_SLOTS_PER_REQUEST) {
          break;
        }

        dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
      }

      if (allSlots.length >= MAX_SLOTS_PER_REQUEST) {
        break;
      }
    }

    allSlots.sort((a, b) => a.startAt.localeCompare(b.startAt));

    const availableDays = Array.from(
      new Set(allSlots.map((slot) => utcDateKey(new Date(slot.startAt))))
    );

    const selectedDay = parsed.day ?? availableDays[0] ?? null;
    const timeSlots = selectedDay
      ? allSlots.filter((slot) => utcDateKey(new Date(slot.startAt)) === selectedDay)
      : [];

    return PublicBookingAvailabilityOutputSchema.parse({
      timezone: pageData.page.timezone,
      availableDays,
      timeSlots,
    });
  }

  @Post("pages/:slug/holds")
  @Header("Cache-Control", "no-store")
  async createPublicHold(@Param("slug") slug: string, @Body() body: unknown, @Req() req: Request) {
    const parsed = PublicCreateBookingHoldInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    await this.resolvePageData(slug, ctx);

    const clientIp = resolveClientIp(req);
    enforcePublicBookingRateLimit(`${clientIp}:${slug}:hold`);

    const service = await this.serviceRepo.findById(parsed.serviceId, ctx.tenantId!);
    if (!service || !service.isActive) {
      throw new NotFoundException("Service not found");
    }

    const resource = await this.resolveResourceForSelection({
      tenantId: ctx.tenantId!,
      service,
      resourceId: parsed.resourceId,
      staffId: parsed.staffId,
      startAt: new Date(parsed.startAt),
      endAt: new Date(parsed.endAt),
    });

    if (!resource) {
      throw new BadRequestException("No available resource for selected slot");
    }

    const idempotencyKey = parsed.idempotencyKey ?? resolveIdempotencyKey(req);
    const hold = await this.createHold.execute(
      {
        startAt: new Date(parsed.startAt),
        endAt: new Date(parsed.endAt),
        serviceOfferingId: parsed.serviceId,
        resourceIds: [resource.id],
        bookedByName: parsed.customerName,
        bookedByEmail: parsed.customerEmail,
        notes: parsed.notes ?? undefined,
        ttlSeconds: parsed.ttlSeconds,
        idempotencyKey,
      },
      ctx
    );

    return { hold };
  }

  @Post("pages/:slug/confirm")
  @Header("Cache-Control", "no-store")
  async confirmPublicBooking(
    @Param("slug") slug: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const parsed = PublicConfirmBookingInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const pageData = await this.resolvePageData(slug, ctx);

    const clientIp = resolveClientIp(req);
    enforcePublicBookingRateLimit(`${clientIp}:${slug}:confirm`);

    const idempotencyKey = parsed.idempotencyKey ?? resolveIdempotencyKey(req);
    let holdId = parsed.holdId;

    if (!holdId) {
      if (!parsed.serviceId || !parsed.startAt || !parsed.endAt) {
        throw new BadRequestException(
          "serviceId, startAt, and endAt are required when holdId is not provided"
        );
      }

      const service = await this.serviceRepo.findById(parsed.serviceId, ctx.tenantId!);
      if (!service || !service.isActive) {
        throw new NotFoundException("Service not found");
      }

      const resource = await this.resolveResourceForSelection({
        tenantId: ctx.tenantId!,
        service,
        staffId: parsed.staffId,
        startAt: new Date(parsed.startAt),
        endAt: new Date(parsed.endAt),
      });

      if (!resource) {
        throw new BadRequestException("No available resource for selected slot");
      }

      const createdHold = await this.createHold.execute(
        {
          startAt: new Date(parsed.startAt),
          endAt: new Date(parsed.endAt),
          serviceOfferingId: parsed.serviceId,
          resourceIds: [resource.id],
          bookedByName: `${parsed.customer.firstName} ${parsed.customer.lastName}`,
          bookedByEmail: parsed.customer.email,
          notes: parsed.notes ?? undefined,
          ttlSeconds: 600,
          idempotencyKey: idempotencyKey ? `${idempotencyKey}:hold` : undefined,
        },
        ctx
      );

      holdId = createdHold.id;
    }

    const customerName = `${parsed.customer.firstName} ${parsed.customer.lastName}`.trim();
    const notes = parsed.customer.phone
      ? [parsed.notes ?? "", `Phone: ${parsed.customer.phone}`].filter(Boolean).join("\n")
      : (parsed.notes ?? undefined);

    const booking = await this.createBooking.execute(
      {
        holdId,
        bookedByName: customerName,
        bookedByEmail: parsed.customer.email,
        notes,
        idempotencyKey,
      },
      ctx
    );

    const ownerEmail = await this.resolveOwnerNotificationEmail(ctx.tenantId!, ctx.workspaceId!);
    const serviceName = booking.serviceOfferingId
      ? ((await this.serviceRepo.findById(booking.serviceOfferingId, ctx.tenantId!))?.name ?? null)
      : null;

    try {
      await this.bookingNotifications.sendBookingConfirmationEmails({
        tenantId: ctx.tenantId!,
        bookingId: booking.id,
        idempotencyKeyBase: idempotencyKey
          ? `${idempotencyKey}:booking-confirmation-email`
          : undefined,
        venueName: pageData.page.venueName,
        timezone: pageData.page.timezone,
        serviceName,
        startAt: booking.startAt,
        endAt: booking.endAt,
        referenceNumber: booking.referenceNumber,
        customerName: booking.bookedByName,
        customerEmail: booking.bookedByEmail,
        ownerEmail,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send booking confirmation emails for booking ${booking.id}: ${detail}`
      );
    }

    return { booking };
  }

  @Get("pages/:slug/bookings/:bookingId")
  @Header("Cache-Control", "no-store")
  async getPublicBookingSummary(
    @Param("slug") slug: string,
    @Param("bookingId") bookingId: string,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const pageData = await this.resolvePageData(slug, ctx);

    const booking = await this.getBooking.execute(bookingId, ctx);

    if (booking.workspaceId && booking.workspaceId !== ctx.workspaceId) {
      throw new NotFoundException("Booking not found");
    }

    const service = booking.serviceOfferingId
      ? await this.serviceRepo.findById(booking.serviceOfferingId, ctx.tenantId!)
      : null;

    let staffName: string | null = null;
    const staffAllocation = booking.allocations.find((allocation) => allocation.role === "PRIMARY");
    if (staffAllocation) {
      const resource = await this.resourceRepo.findById(staffAllocation.resourceId, ctx.tenantId!);
      staffName = resource?.name ?? null;
    }

    return PublicBookingSummaryOutputSchema.parse({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        status: booking.status,
        startAt: toIso(booking.startAt),
        endAt: toIso(booking.endAt),
        venueName: pageData.page.venueName,
        serviceName: service?.name ?? null,
        staffName,
        customerName: booking.bookedByName,
        customerEmail: booking.bookedByEmail,
        address: pageData.page.address,
        timezone: pageData.page.timezone,
      },
    });
  }

  private async resolvePageData(slug: string, ctx: ReturnType<typeof buildUseCaseContext>) {
    const publishError = assertPublicModuleEnabled(ctx, "booking");
    if (publishError) {
      throw toHttpException(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      throw new NotFoundException("Public workspace not resolved");
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: ctx.workspaceId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        legalEntity: {
          select: {
            address: true,
          },
        },
        tenant: {
          select: {
            timeZone: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    const config = await this.getPublicPageConfig(ctx.tenantId, workspace.id);
    const effectiveSlug = (config.slug ?? workspace.slug ?? "booking").toLowerCase();

    if (slug.toLowerCase() !== effectiveSlug) {
      throw new NotFoundException("Public booking page not found");
    }

    const servicePage = await this.serviceRepo.findMany(ctx.tenantId, { isActive: true }, 1, 200);
    const staffPage = await this.resourceRepo.findMany(
      ctx.tenantId,
      { type: "STAFF", isActive: true },
      1,
      200
    );

    const addressParsed = PublicBookingAddressSchema.safeParse(
      workspace.legalEntity?.address ?? null
    );
    const address = addressParsed.success ? addressParsed.data : null;

    const services = servicePage.items
      .filter((service) => service.isActive)
      .map((service) => this.toPublicService(service));

    const staff = staffPage.items
      .filter((resource) => resource.isActive)
      .map((resource) => ({
        id: resource.id,
        name: resource.name,
        description: resource.description,
        tags: resource.tags,
      }));

    const page = {
      slug: effectiveSlug,
      venueName: config.venueName ?? workspace.name,
      description: config.description ?? null,
      timezone: config.timezone ?? workspace.tenant?.timeZone ?? "UTC",
      address,
      openingHoursText: config.openingHoursText ?? null,
      cancellationPolicyText: config.cancellationPolicyText ?? null,
      cancellationCutoffHours: config.cancellationCutoffHours ?? null,
      depositPolicyText: config.depositPolicyText ?? null,
      heroImageFileIds: config.heroImageFileIds ?? [],
      allowStaffSelection: config.allowStaffSelection ?? staff.length > 0,
    };

    return {
      page,
      services,
      staff,
    };
  }

  private toPublicService(service: ServiceOffering) {
    const badges: string[] = [];
    if (service.depositCents && service.depositCents > 0) {
      badges.push("Deposit");
    }
    if (service.bufferBeforeMinutes > 0 || service.bufferAfterMinutes > 0) {
      badges.push("Buffered");
    }

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      currency: service.currency,
      depositCents: service.depositCents,
      category: service.requiredTags[0] ?? null,
      badges,
    };
  }

  private async getPublicPageConfig(
    tenantId: string,
    workspaceId: string
  ): Promise<PublicBookingPageConfig> {
    const entry = await this.kv.get({
      tenantId,
      moduleId: PUBLIC_BOOKING_MODULE_ID,
      scope: PUBLIC_BOOKING_SCOPE(workspaceId),
      key: PUBLIC_BOOKING_SETTINGS_KEY,
    });

    if (!entry?.value) {
      return {};
    }

    const parsed = PublicBookingPageConfigSchema.safeParse(entry.value);
    if (!parsed.success) {
      return {};
    }

    return parsed.data;
  }

  private async resolveCandidateResources(input: {
    tenantId: string;
    service: ServiceOffering;
    staffId?: string;
  }): Promise<BookingResource[]> {
    if (input.staffId) {
      const staff = await this.resourceRepo.findById(input.staffId, input.tenantId);
      if (!staff || !staff.isActive) {
        return [];
      }
      return [staff];
    }

    const preferredType = input.service.requiredResourceTypes[0] ?? "STAFF";
    const page = await this.resourceRepo.findMany(
      input.tenantId,
      { type: preferredType, isActive: true },
      1,
      200
    );

    const requiredTags = input.service.requiredTags ?? [];
    const filtered = page.items.filter(
      (resource) =>
        resource.isActive &&
        requiredTags.every((requiredTag) => resource.tags.includes(requiredTag))
    );

    if (filtered.length > 0) {
      return filtered;
    }

    if (preferredType === "STAFF") {
      return [];
    }

    const fallback = await this.resourceRepo.findMany(
      input.tenantId,
      { type: "STAFF", isActive: true },
      1,
      200
    );
    return fallback.items.filter((resource) => resource.isActive);
  }

  private async resolveResourceForSelection(input: {
    tenantId: string;
    service: ServiceOffering;
    resourceId?: string;
    staffId?: string;
    startAt: Date;
    endAt: Date;
  }): Promise<BookingResource | null> {
    const explicitId = input.resourceId ?? input.staffId;
    if (explicitId) {
      const resource = await this.resourceRepo.findById(explicitId, input.tenantId);
      if (!resource || !resource.isActive) {
        return null;
      }
      return resource;
    }

    const candidates = await this.resolveCandidateResources({
      tenantId: input.tenantId,
      service: input.service,
    });

    const now = new Date();

    for (const resource of candidates) {
      const hasBookingConflict = await this.bookingRepo.hasConflict(
        input.tenantId,
        resource.id,
        input.startAt,
        input.endAt
      );
      if (hasBookingConflict) {
        continue;
      }

      const hasHoldConflict = await this.holdRepo.hasActiveOverlap(
        input.tenantId,
        resource.id,
        input.startAt,
        input.endAt,
        now
      );
      if (hasHoldConflict) {
        continue;
      }

      return resource;
    }

    return null;
  }

  private async resolveOwnerNotificationEmail(
    tenantId: string,
    workspaceId: string
  ): Promise<string | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        tenantId,
        deletedAt: null,
      },
      select: {
        legalEntity: {
          select: {
            email: true,
          },
        },
        memberships: {
          where: {
            status: "ACTIVE",
            role: {
              in: ["OWNER", "ADMIN"],
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            role: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    const legalEmail = workspace?.legalEntity?.email?.trim();
    if (legalEmail) {
      return legalEmail;
    }

    const ownerMembership = workspace?.memberships.find(
      (membership) => membership.role === "OWNER" && Boolean(membership.user.email?.trim())
    );
    if (ownerMembership?.user.email) {
      return ownerMembership.user.email.trim();
    }

    const adminMembership = workspace?.memberships.find(
      (membership) => membership.role === "ADMIN" && Boolean(membership.user.email?.trim())
    );

    return adminMembership?.user.email?.trim() ?? null;
  }
}
