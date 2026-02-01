import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type TimeService,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  parseLocalDate,
  RequireTenant,
} from "@corely/kernel";
import { type ListInvoicesInput, type ListInvoicesOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";
import { buildPageInfo } from "../../../../../shared/http/pagination";

type Deps = { logger: LoggerPort; invoiceRepo: InvoiceRepoPort; timeService: TimeService };

@RequireTenant()
export class ListInvoicesUseCase extends BaseUseCase<ListInvoicesInput, ListInvoicesOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ListInvoicesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListInvoicesOutput, UseCaseError>> {
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;

    const fromDate =
      input.fromDate !== undefined && input.fromDate !== null
        ? await this.useCaseDeps.timeService.localDateToTenantStartOfDayUtc(
            ctx.tenantId,
            parseLocalDate(input.fromDate)
          )
        : undefined;
    const toDate =
      input.toDate !== undefined && input.toDate !== null
        ? await this.useCaseDeps.timeService.localDateToTenantEndOfDayUtc(
            ctx.tenantId,
            parseLocalDate(input.toDate)
          )
        : undefined;

    const { items, nextCursor, total } = await this.useCaseDeps.invoiceRepo.list(
      ctx.workspaceId,
      {
        status: input.status,
        customerPartyId: input.customerPartyId,
        fromDate,
        toDate,
        q: input.q,
        sort: typeof input.sort === "string" ? input.sort : undefined,
        structuredFilters: Array.isArray(input.filters) ? input.filters : undefined,
      },
      {
        page,
        pageSize,
        cursor: input.cursor,
      }
    );

    const pageInfo = buildPageInfo(total, page, pageSize);

    return ok({ items: items.map(toInvoiceDto), nextCursor: nextCursor ?? null, pageInfo });
  }
}
