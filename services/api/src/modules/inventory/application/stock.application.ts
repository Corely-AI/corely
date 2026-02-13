import type { GetOnHandUseCase } from "./use-cases/get-on-hand.usecase";
import type { GetAvailableUseCase } from "./use-cases/get-available.usecase";
import type { ListStockMovesUseCase } from "./use-cases/list-stock-moves.usecase";
import type { ListReservationsUseCase } from "./use-cases/list-reservations.usecase";
import type { ListReorderPoliciesUseCase } from "./use-cases/list-reorder-policies.usecase";
import type { CreateReorderPolicyUseCase } from "./use-cases/create-reorder-policy.usecase";
import type { UpdateReorderPolicyUseCase } from "./use-cases/update-reorder-policy.usecase";
import type { GetReorderSuggestionsUseCase } from "./use-cases/get-reorder-suggestions.usecase";
import type { GetLowStockUseCase } from "./use-cases/get-low-stock.usecase";
import type { PickForDeliveryUseCase } from "./use-cases/pick-for-delivery.usecase";

export class StockApplication {
  constructor(
    public readonly getOnHand: GetOnHandUseCase,
    public readonly getAvailable: GetAvailableUseCase,
    public readonly listStockMoves: ListStockMovesUseCase,
    public readonly listReservations: ListReservationsUseCase,
    public readonly listReorderPolicies: ListReorderPoliciesUseCase,
    public readonly createReorderPolicy: CreateReorderPolicyUseCase,
    public readonly updateReorderPolicy: UpdateReorderPolicyUseCase,
    public readonly getReorderSuggestions: GetReorderSuggestionsUseCase,
    public readonly getLowStock: GetLowStockUseCase,
    public readonly pickForDelivery: PickForDeliveryUseCase
  ) {}
}
