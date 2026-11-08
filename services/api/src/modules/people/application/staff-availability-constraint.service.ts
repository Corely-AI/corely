import { absenceBlocks, subtractAbsences } from "../domain/staff-absence";
import { STAFF_ABSENCE_REPOSITORY, type StaffAbsenceRepository } from "./ports/staff-absence.port";
import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import type { StaffLinkScope } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import { STAFF_REPOSITORY, type StaffRepositoryPort } from "./ports/staff-repository.port";
import {
  STAFF_AVAILABILITY_REPOSITORY,
  type StaffAvailabilityRepository,
} from "./ports/staff-availability.port";
import { staffAvailabilityWindows } from "../domain/staff-availability";

@Injectable()
export class StaffAvailabilityConstraintService {
  constructor(
    @Inject(STAFF_REPOSITORY) private readonly staff: StaffRepositoryPort,
    @Inject(STAFF_AVAILABILITY_REPOSITORY) private readonly schedules: StaffAvailabilityRepository,
    @Inject(STAFF_ABSENCE_REPOSITORY) private readonly absences: StaffAbsenceRepository
  ) {}
  async windows(
    scope: StaffLinkScope,
    resourceId: string,
    from: Date,
    to: Date,
    tx?: TransactionContext
  ) {
    const profiles = (await this.staff.list(scope, tx)).filter((p) => p.resourceId === resourceId);
    if (!profiles.length) {
      return null;
    } // Unlinked legacy resources retain their own Booking rules.
    if (profiles.length !== 1 || profiles[0].archivedAt) {
      return [];
    }
    if (!(from < to) || to.getTime() - from.getTime() > 62 * 86400000) {
      throw new BadRequestException(
        "Staff availability ranges must be positive and at most 62 days"
      );
    }
    return subtractAbsences(
      staffAvailabilityWindows(await this.schedules.get(scope, profiles[0].id, tx), from, to),
      absenceBlocks(await this.absences.list(scope, profiles[0].id, tx))
    );
  }
  async assertAvailable(
    scope: StaffLinkScope,
    resourceId: string,
    from: Date,
    to: Date,
    tx?: TransactionContext
  ) {
    const windows = await this.windows(scope, resourceId, from, to, tx);
    if (
      windows &&
      !windows.some(
        (w) => Date.parse(w.startAt) <= from.getTime() && Date.parse(w.endAt) >= to.getTime()
      )
    ) {
      throw new ConflictException("Booking:StaffUnavailable");
    }
  }
}
