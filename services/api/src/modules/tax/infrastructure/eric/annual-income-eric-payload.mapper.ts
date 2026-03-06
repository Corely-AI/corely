import { Injectable } from "@nestjs/common";
import {
  EricPayloadMapperPort,
  type TaxEricReportSnapshot,
  type TaxEricRequest,
} from "../../application/ports/eric-payload-mapper.port";
import { calculateAnnualIncomeTotals } from "../../application/services/annual-income-report.service";

@Injectable()
export class AnnualIncomeEricPayloadMapper extends EricPayloadMapperPort {
  mapReportToEricPayload(snapshot: TaxEricReportSnapshot): TaxEricRequest {
    const totals = calculateAnnualIncomeTotals(snapshot.annualIncome);

    return {
      gateway: "elster-gateway",
      version: "stub-v1",
      reportType: "annual_income_report",
      payload: {
        filingId: snapshot.filingId,
        reportId: snapshot.reportId,
        taxYear: snapshot.taxYear,
        incomeSourceCount: snapshot.annualIncome.incomeSources.length,
        noIncomeFlag: snapshot.annualIncome.noIncomeFlag,
        totals,
        incomeSources: snapshot.annualIncome.incomeSources,
      },
      notes:
        "TODO: replace stub payload with ERiC-native payload via external .NET elster-gateway.",
    };
  }
}
