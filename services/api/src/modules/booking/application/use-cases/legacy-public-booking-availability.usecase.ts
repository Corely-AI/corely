import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PublicBookingAvailabilityOutputSchema,
  type PublicBookingAvailabilityInput,
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
} from "../ports/booking-repo.ports";
import type { BookingResource, ServiceOffering } from "../../domain/booking.entities";
import type { StudioScope } from "../ports/openbuk-repository.port";

export const withinBookingWorkspace = (
  record: { workspaceId: string | null },
  workspaceId: string
) => record.workspaceId === null || record.workspaceId === workspaceId;

const MAX_AVAILABILITY_RANGE_DAYS = 45;
const MAX_SLOTS_PER_REQUEST = 600;

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

@Injectable()
export class LegacyPublicBookingAvailabilityUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly serviceRepo: ServiceRepositoryPort,
    @Inject(RESOURCE_REPOSITORY) private readonly resourceRepo: ResourceRepositoryPort,
    @Inject(AVAILABILITY_RULE_REPOSITORY)
    private readonly availabilityRuleRepo: AvailabilityRuleRepositoryPort,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: BookingRepositoryPort,
    @Inject(HOLD_REPOSITORY) private readonly holdRepo: HoldRepositoryPort
  ) {}

  async publicService(scope: StudioScope, id: string) {
    const service = await this.serviceRepo.findById(id, scope.tenantId);
    if (!service || !service.isActive || !withinBookingWorkspace(service, scope.workspaceId)) {
      throw new NotFoundException("Service not found");
    }
    return service;
  }

  async execute(parsed: PublicBookingAvailabilityInput, scope: StudioScope, timezone: string) {
    const service = await this.publicService(scope, parsed.serviceId);

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
      ...scope,
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
      const rule = await this.availabilityRuleRepo.findByResourceId(resource.id, scope.tenantId);
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
              scope.tenantId,
              resource.id,
              startAt,
              endAt
            );
            if (hasBookingConflict) {
              continue;
            }

            const hasHoldConflict = await this.holdRepo.hasActiveOverlap(
              scope.tenantId,
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
      timezone,
      availableDays,
      timeSlots,
    });
  }

  private async resolveCandidateResources(input: {
    tenantId: string;
    workspaceId: string;
    service: ServiceOffering;
    staffId?: string;
  }): Promise<BookingResource[]> {
    if (input.staffId) {
      const staff = await this.resourceRepo.findById(input.staffId, input.tenantId);
      if (!staff || !staff.isActive || !withinBookingWorkspace(staff, input.workspaceId)) {
        return [];
      }
      return [staff];
    }

    const preferredType = input.service.requiredResourceTypes[0] ?? "STAFF";
    const page = await this.resourceRepo.findMany(
      input.tenantId,
      { type: preferredType, isActive: true, workspaceId: input.workspaceId },
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
      { type: "STAFF", isActive: true, workspaceId: input.workspaceId },
      1,
      200
    );
    return fallback.items.filter((resource) => resource.isActive);
  }

  async resolveResourceForSelection(input: {
    tenantId: string;
    workspaceId: string;
    service: ServiceOffering;
    resourceId?: string;
    staffId?: string;
    startAt: Date;
    endAt: Date;
  }): Promise<BookingResource | null> {
    const explicitId = input.resourceId ?? input.staffId;
    if (explicitId) {
      const resource = await this.resourceRepo.findById(explicitId, input.tenantId);
      if (!resource || !resource.isActive || !withinBookingWorkspace(resource, input.workspaceId)) {
        return null;
      }
      return resource;
    }

    const candidates = await this.resolveCandidateResources({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
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
}
