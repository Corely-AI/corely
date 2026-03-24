import { z } from "zod";

export const RestaurantEventTypeSchema = z.enum([
  "restaurant.table-opened",
  "restaurant.table-transferred",
  "restaurant.order-draft-updated",
  "restaurant.order-sent-to-kitchen",
  "restaurant.kitchen-ticket-bumped",
  "restaurant.payment-captured",
  "restaurant.table-closed",
  "restaurant.shift-opened",
  "restaurant.shift-closed",
  "restaurant.void-requested",
  "restaurant.discount-requested",
]);
export type RestaurantEventType = z.infer<typeof RestaurantEventTypeSchema>;
