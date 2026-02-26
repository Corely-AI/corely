import { usePosLocalService } from "@/hooks/usePosLocalService";

export function useSalesService() {
  const { initialized, service } = usePosLocalService();

  return {
    initialized,
    salesService: service,
  };
}
