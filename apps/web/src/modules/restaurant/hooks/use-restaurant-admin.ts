import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  KitchenTicketStatus,
  UpsertDiningRoomInput,
  UpsertKitchenStationInput,
  UpsertRestaurantModifierGroupInput,
  UpsertRestaurantTableInput,
} from "@corely/contracts";
import { restaurantApi } from "@/lib/restaurant-api";

export const restaurantAdminKeys = {
  floorPlan: ["restaurant", "floor-plan"] as const,
  modifierGroups: ["restaurant", "modifier-groups"] as const,
  kitchenStations: ["restaurant", "kitchen-stations"] as const,
  kitchenTickets: (status?: KitchenTicketStatus | "ALL") =>
    ["restaurant", "kitchen-tickets", status ?? "ALL"] as const,
};

export function useRestaurantFloorPlan() {
  return useQuery({
    queryKey: restaurantAdminKeys.floorPlan,
    queryFn: () => restaurantApi.getFloorPlan(),
  });
}

export function useUpsertDiningRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertDiningRoomInput) => restaurantApi.upsertDiningRoom(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: restaurantAdminKeys.floorPlan });
    },
  });
}

export function useUpsertRestaurantTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertRestaurantTableInput) => restaurantApi.upsertTable(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: restaurantAdminKeys.floorPlan });
    },
  });
}

export function useRestaurantModifierGroups() {
  return useQuery({
    queryKey: restaurantAdminKeys.modifierGroups,
    queryFn: () => restaurantApi.listModifierGroups(),
  });
}

export function useUpsertRestaurantModifierGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertRestaurantModifierGroupInput) =>
      restaurantApi.upsertModifierGroup(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: restaurantAdminKeys.modifierGroups });
    },
  });
}

export function useKitchenStations() {
  return useQuery({
    queryKey: restaurantAdminKeys.kitchenStations,
    queryFn: () => restaurantApi.listKitchenStations(),
  });
}

export function useUpsertKitchenStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertKitchenStationInput) => restaurantApi.upsertKitchenStation(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: restaurantAdminKeys.kitchenStations });
      await queryClient.invalidateQueries({ queryKey: restaurantAdminKeys.kitchenTickets() });
    },
  });
}

export function useKitchenTickets(status?: KitchenTicketStatus | "ALL") {
  return useQuery({
    queryKey: restaurantAdminKeys.kitchenTickets(status),
    queryFn: () =>
      restaurantApi.listKitchenTickets(status && status !== "ALL" ? { status } : undefined),
    refetchInterval: 5000,
  });
}

export function useUpdateKitchenTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: KitchenTicketStatus }) =>
      restaurantApi.updateKitchenTicketStatus(ticketId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["restaurant", "kitchen-tickets"] });
    },
  });
}
