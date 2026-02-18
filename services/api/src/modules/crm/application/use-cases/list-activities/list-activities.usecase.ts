import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { ListActivitiesInput, ListActivitiesOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@RequireTenant()
@Injectable()
export class ListActivitiesUseCase extends BaseUseCase<ListActivitiesInput, ListActivitiesOutput> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: ListActivitiesInput): ListActivitiesInput {
    return input;
  }

  protected async handle(
    input: ListActivitiesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListActivitiesOutput, UseCaseError>> {
    const filters = {
      partyId: input.partyId,
      dealId: input.dealId,
      type: input.type,
      status: input.status,
      channelKey: input.channelKey,
      direction: input.direction,
      communicationStatus: input.communicationStatus,
      activityDateFrom: input.activityDateFrom ? new Date(input.activityDateFrom) : undefined,
      activityDateTo: input.activityDateTo ? new Date(input.activityDateTo) : undefined,
      assignedToUserId: input.assignedToUserId,
    };

    const result = await this.activityRepo.list(ctx.tenantId, filters, input.limit, input.cursor);

    return ok({
      items: result.items.map(toActivityDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
