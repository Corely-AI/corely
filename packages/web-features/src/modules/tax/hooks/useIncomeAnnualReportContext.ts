import { taxApi } from "@corely/web-shared/lib/tax-api";
import { useQuery } from "@tanstack/react-query";

export const useIncomeAnnualReportContext = (year: number) =>
  useQuery({
    queryKey: ["tax", "income-annual-report-context", year],
    queryFn: async () => {
      const result = await taxApi.listFilings({
        type: "income-annual",
        year,
        page: 1,
        pageSize: 10,
      });
      const filing = result.items[0];
      if (!filing) {
        return null;
      }

      return {
        filingId: filing.id,
        reportId: filing.id,
      };
    },
    enabled: Number.isFinite(year) && year >= 2000,
  });
