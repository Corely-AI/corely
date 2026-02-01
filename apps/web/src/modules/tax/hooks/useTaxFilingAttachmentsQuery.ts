import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { taxFilingAttachmentsQueryKey } from "../queries";

export function useTaxFilingAttachmentsQuery(id: string | undefined) {
  return useQuery({
    queryKey: taxFilingAttachmentsQueryKey(id ?? "missing"),
    queryFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing filing id"));
      }
      return taxApi.listFilingAttachments(id);
    },
    enabled: Boolean(id),
  });
}
