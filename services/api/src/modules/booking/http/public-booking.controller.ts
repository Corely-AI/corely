import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import {
  PublicBookingPageOutputSchema,
  PublicBookingServicesOutputSchema,
  PublicBookingAvailabilityInputSchema,
  PublicCreateBookingHoldInputSchema,
  PublicConfirmBookingInputSchema,
  PublicBookingSummaryOutputSchema,
} from "@corely/contracts";
import {
  RESOURCE_REPOSITORY,
  SERVICE_REPOSITORY,
  type ResourceRepositoryPort,
  type ServiceRepositoryPort,
} from "../application/ports/booking-repo.ports";
import { OpenBukStudioUseCase } from "../application/use-cases/openbuk-studio.usecase";
import { CreateHoldUseCase } from "../application/use-cases/create-hold.usecase";
import { CreateBookingUseCase } from "../application/use-cases/create-booking.usecase";
import { GetBookingUseCase } from "../application/use-cases/get-booking.usecase";
import {
  BOOKING_NOTIFICATION_PORT,
  type BookingNotificationPort,
} from "../application/ports/booking-notification.port";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { PublicWorkspaceRoute } from "../../../shared/public";
import { LegacyPublicBookingPageReader } from "../infrastructure/adapters/legacy-public-booking-page-reader";
import {
  LegacyPublicBookingAvailabilityUseCase,
  withinBookingWorkspace,
} from "../application/use-cases/legacy-public-booking-availability.usecase";
import { LegacyPublicBookingRateLimit } from "./openbuk-rate-limit.guard";

const toIso = (value: Date | string): string => {
  if (typeof value === "string") {
    return value;
  }
  return value.toISOString();
};

@Controller("public/booking")
@PublicWorkspaceRoute()
export class PublicBookingController {
  private readonly logger = new Logger(PublicBookingController.name);

  constructor(
    private readonly reader: LegacyPublicBookingPageReader,
    private readonly availability: LegacyPublicBookingAvailabilityUseCase,
    @Inject(SERVICE_REPOSITORY) private readonly serviceRepo: ServiceRepositoryPort,
    @Inject(RESOURCE_REPOSITORY) private readonly resourceRepo: ResourceRepositoryPort,
    private readonly createHold: CreateHoldUseCase,
    private readonly createBooking: CreateBookingUseCase,
    private readonly getBooking: GetBookingUseCase,
    @Inject(BOOKING_NOTIFICATION_PORT)
    private readonly bookingNotifications: BookingNotificationPort,
    private readonly openBuk: OpenBukStudioUseCase
  ) {}

  @Get("pages/:slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async getPublicPage(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const pageData = await this.reader.resolvePageData(slug, ctx);

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
    const pageData = await this.reader.resolvePageData(slug, ctx);

    return PublicBookingServicesOutputSchema.parse({
      services: pageData.services,
    });
  }

  @Get("pages/:slug/availability")
  @LegacyPublicBookingRateLimit()
  @Header("Cache-Control", "no-store")
  async getAvailability(
    @Param("slug") slug: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const parsed = PublicBookingAvailabilityInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const pageData = await this.reader.resolvePageData(slug, ctx);

    return this.availability.execute(parsed, pageData.scope, pageData.page.timezone);
  }

  @Post("pages/:slug/holds")
  @LegacyPublicBookingRateLimit()
  @Header("Cache-Control", "no-store")
  async createPublicHold(@Param("slug") slug: string, @Body() body: unknown, @Req() req: Request) {
    const parsed = PublicCreateBookingHoldInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const pageData = await this.reader.resolvePageData(slug, ctx);

    const service = await this.availability.publicService(pageData.scope, parsed.serviceId);

    const resource = await this.availability.resolveResourceForSelection({
      ...pageData.scope,
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
      ctx,
      (tx) => this.openBuk.assertLegacyPublicBookingAllowed(ctx, tx)
    );

    return { hold };
  }

  @Post("pages/:slug/confirm")
  @LegacyPublicBookingRateLimit()
  @Header("Cache-Control", "no-store")
  async confirmPublicBooking(
    @Param("slug") slug: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const parsed = PublicConfirmBookingInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const pageData = await this.reader.resolvePageData(slug, ctx);

    const idempotencyKey = parsed.idempotencyKey ?? resolveIdempotencyKey(req);
    let holdId = parsed.holdId;

    if (!holdId) {
      if (!parsed.serviceId || !parsed.startAt || !parsed.endAt) {
        throw new BadRequestException(
          "serviceId, startAt, and endAt are required when holdId is not provided"
        );
      }

      const service = await this.availability.publicService(pageData.scope, parsed.serviceId);

      const resource = await this.availability.resolveResourceForSelection({
        ...pageData.scope,
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
        ctx,
        (tx) => this.openBuk.assertLegacyPublicBookingAllowed(ctx, tx)
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
      ctx,
      (tx) => this.openBuk.assertLegacyPublicBookingAllowed(ctx, tx)
    );

    const ownerEmail = await this.reader.resolveOwnerNotificationEmail(
      ctx.tenantId!,
      ctx.workspaceId!
    );
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
  @LegacyPublicBookingRateLimit()
  @Header("Cache-Control", "no-store")
  async getPublicBookingSummary(
    @Param("slug") slug: string,
    @Param("bookingId") bookingId: string,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const pageData = await this.reader.resolvePageData(slug, ctx);

    const booking = await this.getBooking.execute(bookingId, ctx).catch((error: unknown) => {
      if (error instanceof NotFoundException) {throw new NotFoundException("Booking not found");}
      throw error;
    });

    if (booking.workspaceId !== ctx.workspaceId) {
      throw new NotFoundException("Booking not found");
    }

    const service = booking.serviceOfferingId
      ? await this.serviceRepo.findById(booking.serviceOfferingId, ctx.tenantId!)
      : null;

    let staffName: string | null = null;
    const staffAllocation = booking.allocations.find((allocation) => allocation.role === "PRIMARY");
    if (staffAllocation) {
      const resource = await this.resourceRepo.findById(staffAllocation.resourceId, ctx.tenantId!);
      staffName =
        resource && withinBookingWorkspace(resource, pageData.scope.workspaceId)
          ? resource.name
          : null;
    }

    return PublicBookingSummaryOutputSchema.parse({
      booking: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        status: booking.status,
        startAt: toIso(booking.startAt),
        endAt: toIso(booking.endAt),
        venueName: pageData.page.venueName,
        serviceName:
          service && withinBookingWorkspace(service, pageData.scope.workspaceId)
            ? service.name
            : null,
        staffName,
        customerName: null,
        customerEmail: null,
        address: pageData.page.address,
        timezone: pageData.page.timezone,
      },
    });
  }
}
