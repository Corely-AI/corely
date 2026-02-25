import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import {
  type ListUpcomingBirthdaysInput,
  type ListUpcomingBirthdaysOutput,
} from "@corely/contracts";
import { toUpcomingBirthdayDto } from "../mappers/engagement-dto.mappers";
import type { BirthdayRepositoryPort } from "../ports/birthday-repository.port";

type Deps = {
  logger: LoggerPort;
  birthdays: BirthdayRepositoryPort;
};

const toStartOfDayUtc = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const parseLocalDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export class ListUpcomingBirthdaysUseCase extends BaseUseCase<
  ListUpcomingBirthdaysInput,
  ListUpcomingBirthdaysOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListUpcomingBirthdaysInput,
    ctx: UseCaseContext
  ): Promise<Result<ListUpcomingBirthdaysOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const fromDate = input.from ? parseLocalDate(input.from) : toStartOfDayUtc(new Date());
    const toDate = input.to
      ? parseLocalDate(input.to)
      : new Date(fromDate.getTime() + 29 * 24 * 60 * 60 * 1000);

    if (toDate < fromDate) {
      return err(new ValidationError("to must be greater than or equal to from"));
    }

    const pageSize = input.pageSize ?? 100;
    const allBirthdays = await this.deps.birthdays.listCustomerBirthdays(ctx.tenantId);

    const filtered = allBirthdays
      .map((record) => toUpcomingBirthdayDto(record, fromDate))
      .filter((item) => {
        const nextBirthday = parseLocalDate(item.nextBirthday);
        return nextBirthday >= fromDate && nextBirthday <= toDate;
      })
      .sort((a, b) => {
        if (a.daysUntilBirthday !== b.daysUntilBirthday) {
          return a.daysUntilBirthday - b.daysUntilBirthday;
        }
        return a.displayName.localeCompare(b.displayName);
      });

    const startIndex = input.cursor
      ? Math.max(filtered.findIndex((item) => item.customerPartyId === input.cursor) + 1, 0)
      : 0;

    const items = filtered.slice(startIndex, startIndex + pageSize);
    const nextCursor =
      startIndex + pageSize < filtered.length
        ? (items[items.length - 1]?.customerPartyId ?? null)
        : null;

    return ok({ items, nextCursor });
  }
}
