import { Injectable } from "@nestjs/common";
import type { ExportTaxPaymentsInput, ExportTaxPaymentsResponse } from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { ListTaxPaymentsUseCase } from "./list-tax-payments.use-case";

@RequireTenant()
@Injectable()
export class ExportTaxPaymentsUseCase extends BaseUseCase<
  ExportTaxPaymentsInput,
  ExportTaxPaymentsResponse
> {
  constructor(private readonly listPaymentsUseCase: ListTaxPaymentsUseCase) {
    super({ logger: null as any });
  }

  protected async handle(
    input: ExportTaxPaymentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ExportTaxPaymentsResponse, UseCaseError>> {
    const listInput = {
      ...input,
      page: 1,
      pageSize: Math.max(input.pageSize ?? 0, 10_000),
    };

    const result = await this.listPaymentsUseCase.execute(listInput, ctx);
    if ("error" in result) {
      return result;
    }

    const csv = this.toCsv(result.value.items);
    return ok({ csv });
  }

  private toCsv(
    items: {
      filingId: string;
      filingType: string;
      periodLabel: string;
      dueDate: string;
      amount: { value: number; currency: string; direction: string };
      paymentStatus: string;
      paidAt?: string | null;
      method?: string | null;
      proofDocumentId?: string | null;
    }[]
  ): string {
    const headers = [
      "Filing ID",
      "Filing Type",
      "Period",
      "Due Date",
      "Amount",
      "Currency",
      "Direction",
      "Status",
      "Paid At",
      "Method",
      "Proof Document ID",
    ];

    const rows = items.map((item) => [
      item.filingId,
      item.filingType,
      item.periodLabel,
      item.dueDate,
      String(item.amount.value),
      item.amount.currency,
      item.amount.direction,
      item.paymentStatus,
      item.paidAt ?? "",
      item.method ?? "",
      item.proofDocumentId ?? "",
    ]);

    return [headers, ...rows].map((row) => row.map(this.escapeCsv).join(",")).join("\n");
  }

  private escapeCsv(value: string): string {
    if (value.includes('"') || value.includes(",") || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
