import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import {
  DiningRoomSchema,
  KitchenStationSchema,
  ModifierSelectionModeSchema,
  RestaurantModifierGroupSchema,
  RestaurantTableAvailabilityStatusSchema,
  RestaurantTableSchema,
  RestaurantTableShapeSchema,
} from "./models";

export const UpsertDiningRoomInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative().default(0),
  idempotencyKey: z.string().optional(),
});
export type UpsertDiningRoomInput = z.infer<typeof UpsertDiningRoomInputSchema>;

export const UpsertDiningRoomOutputSchema = z.object({
  room: DiningRoomSchema,
});
export type UpsertDiningRoomOutput = z.infer<typeof UpsertDiningRoomOutputSchema>;

export const UpsertRestaurantTableInputSchema = z.object({
  id: z.string().optional(),
  diningRoomId: z.string(),
  name: z.string().min(1),
  capacity: z.number().int().positive().nullable().optional(),
  posX: z.number().int().nullable().optional(),
  posY: z.number().int().nullable().optional(),
  shape: RestaurantTableShapeSchema.default("SQUARE"),
  availabilityStatus: RestaurantTableAvailabilityStatusSchema.default("AVAILABLE"),
  idempotencyKey: z.string().optional(),
});
export type UpsertRestaurantTableInput = z.infer<typeof UpsertRestaurantTableInputSchema>;

export const UpsertRestaurantTableOutputSchema = z.object({
  table: RestaurantTableSchema,
});
export type UpsertRestaurantTableOutput = z.infer<typeof UpsertRestaurantTableOutputSchema>;

export const ListRestaurantModifierGroupsInputSchema = ListQuerySchema.extend({});
export type ListRestaurantModifierGroupsInput = z.infer<
  typeof ListRestaurantModifierGroupsInputSchema
>;

export const ListRestaurantModifierGroupsOutputSchema = z.object({
  items: z.array(RestaurantModifierGroupSchema),
  pageInfo: PageInfoSchema,
});
export type ListRestaurantModifierGroupsOutput = z.infer<
  typeof ListRestaurantModifierGroupsOutputSchema
>;

export const UpsertRestaurantModifierGroupInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  selectionMode: ModifierSelectionModeSchema.default("MULTI"),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  linkedCatalogItemIds: z.array(z.string()).default([]),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        priceDeltaCents: z.number().int().default(0),
        sortOrder: z.number().int().nonnegative().default(0),
      })
    )
    .default([]),
  idempotencyKey: z.string().optional(),
});
export type UpsertRestaurantModifierGroupInput = z.infer<
  typeof UpsertRestaurantModifierGroupInputSchema
>;

export const UpsertRestaurantModifierGroupOutputSchema = z.object({
  modifierGroup: RestaurantModifierGroupSchema,
});
export type UpsertRestaurantModifierGroupOutput = z.infer<
  typeof UpsertRestaurantModifierGroupOutputSchema
>;

export const ListKitchenStationsInputSchema = ListQuerySchema.extend({});
export type ListKitchenStationsInput = z.infer<typeof ListKitchenStationsInputSchema>;

export const ListKitchenStationsOutputSchema = z.object({
  items: z.array(KitchenStationSchema),
  pageInfo: PageInfoSchema,
});
export type ListKitchenStationsOutput = z.infer<typeof ListKitchenStationsOutputSchema>;

export const UpsertKitchenStationInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  idempotencyKey: z.string().optional(),
});
export type UpsertKitchenStationInput = z.infer<typeof UpsertKitchenStationInputSchema>;

export const UpsertKitchenStationOutputSchema = z.object({
  station: KitchenStationSchema,
});
export type UpsertKitchenStationOutput = z.infer<typeof UpsertKitchenStationOutputSchema>;
