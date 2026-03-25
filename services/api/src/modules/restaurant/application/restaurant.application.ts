import { Injectable } from "@nestjs/common";
import type {
  CloseRestaurantTableInput,
  CloseRestaurantTableOutput,
  DecideRestaurantApprovalInput,
  GetActiveRestaurantOrderInput,
  GetActiveRestaurantOrderOutput,
  GetRestaurantFloorPlanInput,
  GetRestaurantFloorPlanOutput,
  ListKitchenStationsInput,
  ListKitchenStationsOutput,
  ListKitchenTicketsInput,
  ListKitchenTicketsOutput,
  ListRestaurantModifierGroupsInput,
  ListRestaurantModifierGroupsOutput,
  MergeRestaurantChecksInput,
  MergeRestaurantChecksOutput,
  OpenRestaurantTableInput,
  OpenRestaurantTableOutput,
  PutRestaurantDraftOrderInput,
  PutRestaurantDraftOrderOutput,
  RequestRestaurantDiscountInput,
  RequestRestaurantVoidInput,
  RestaurantApprovalMutationOutput,
  SendRestaurantOrderToKitchenInput,
  SendRestaurantOrderToKitchenOutput,
  TransferRestaurantTableInput,
  TransferRestaurantTableOutput,
  UpdateKitchenTicketStatusInput,
  UpdateKitchenTicketStatusOutput,
  UpsertDiningRoomInput,
  UpsertDiningRoomOutput,
  UpsertKitchenStationInput,
  UpsertKitchenStationOutput,
  UpsertRestaurantModifierGroupInput,
  UpsertRestaurantModifierGroupOutput,
  UpsertRestaurantTableInput,
  UpsertRestaurantTableOutput,
} from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import { RestaurantApprovalApplication } from "./restaurant-approval.application";
import { RestaurantOrderApplication } from "./restaurant-order.application";
import { RestaurantSetupApplication } from "./restaurant-setup.application";

@Injectable()
export class RestaurantApplication {
  constructor(
    private readonly setup: RestaurantSetupApplication,
    private readonly order: RestaurantOrderApplication,
    private readonly approval: RestaurantApprovalApplication
  ) {}

  getFloorPlan(
    input: GetRestaurantFloorPlanInput,
    ctx: UseCaseContext
  ): Promise<GetRestaurantFloorPlanOutput> {
    return this.setup.getFloorPlan(input, ctx);
  }
  upsertDiningRoom(
    input: UpsertDiningRoomInput,
    ctx: UseCaseContext
  ): Promise<UpsertDiningRoomOutput> {
    return this.setup.upsertDiningRoom(input, ctx);
  }
  upsertTable(
    input: UpsertRestaurantTableInput,
    ctx: UseCaseContext
  ): Promise<UpsertRestaurantTableOutput> {
    return this.setup.upsertTable(input, ctx);
  }
  listModifierGroups(
    input: ListRestaurantModifierGroupsInput,
    ctx: UseCaseContext
  ): Promise<ListRestaurantModifierGroupsOutput> {
    return this.setup.listModifierGroups(input, ctx);
  }
  upsertModifierGroup(
    input: UpsertRestaurantModifierGroupInput,
    ctx: UseCaseContext
  ): Promise<UpsertRestaurantModifierGroupOutput> {
    return this.setup.upsertModifierGroup(input, ctx);
  }
  listKitchenStations(
    input: ListKitchenStationsInput,
    ctx: UseCaseContext
  ): Promise<ListKitchenStationsOutput> {
    return this.setup.listKitchenStations(input, ctx);
  }
  upsertKitchenStation(
    input: UpsertKitchenStationInput,
    ctx: UseCaseContext
  ): Promise<UpsertKitchenStationOutput> {
    return this.setup.upsertKitchenStation(input, ctx);
  }
  openTable(
    input: OpenRestaurantTableInput,
    ctx: UseCaseContext
  ): Promise<OpenRestaurantTableOutput> {
    return this.order.openTable(input, ctx);
  }
  getActiveOrder(
    input: GetActiveRestaurantOrderInput,
    ctx: UseCaseContext
  ): Promise<GetActiveRestaurantOrderOutput> {
    return this.order.getActiveOrder(input, ctx);
  }
  putDraftOrder(
    input: PutRestaurantDraftOrderInput,
    ctx: UseCaseContext
  ): Promise<PutRestaurantDraftOrderOutput> {
    return this.order.putDraftOrder(input, ctx);
  }
  transferTable(
    input: TransferRestaurantTableInput,
    ctx: UseCaseContext
  ): Promise<TransferRestaurantTableOutput> {
    return this.order.transferTable(input, ctx);
  }
  mergeChecks(
    input: MergeRestaurantChecksInput,
    ctx: UseCaseContext
  ): Promise<MergeRestaurantChecksOutput> {
    return this.order.mergeChecks(input, ctx);
  }
  sendOrderToKitchen(
    input: SendRestaurantOrderToKitchenInput,
    ctx: UseCaseContext
  ): Promise<SendRestaurantOrderToKitchenOutput> {
    return this.order.sendOrderToKitchen(input, ctx);
  }
  listKitchenTickets(
    input: ListKitchenTicketsInput,
    ctx: UseCaseContext
  ): Promise<ListKitchenTicketsOutput> {
    return this.setup.listKitchenTickets(input, ctx);
  }
  updateKitchenTicketStatus(
    input: UpdateKitchenTicketStatusInput,
    ctx: UseCaseContext
  ): Promise<UpdateKitchenTicketStatusOutput> {
    return this.setup.updateKitchenTicketStatus(input, ctx);
  }
  requestVoid(
    input: RequestRestaurantVoidInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.approval.requestVoid(input, ctx);
  }
  requestDiscount(
    input: RequestRestaurantDiscountInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.approval.requestDiscount(input, ctx);
  }
  approveApproval(
    input: DecideRestaurantApprovalInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.approval.approveApproval(input, ctx);
  }
  rejectApproval(
    input: DecideRestaurantApprovalInput,
    ctx: UseCaseContext
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.approval.rejectApproval(input, ctx);
  }
  closeTable(
    input: CloseRestaurantTableInput,
    ctx: UseCaseContext
  ): Promise<CloseRestaurantTableOutput> {
    return this.order.closeTable(input, ctx);
  }
}
