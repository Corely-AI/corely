CREATE TYPE "commerce"."RestaurantTableShape" AS ENUM ('SQUARE', 'ROUND', 'RECTANGLE');
CREATE TYPE "commerce"."RestaurantTableAvailabilityStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'DIRTY', 'OUT_OF_SERVICE');
CREATE TYPE "commerce"."RestaurantTableSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'TRANSFERRED');
CREATE TYPE "commerce"."RestaurantOrderStatus" AS ENUM ('DRAFT', 'PARTIALLY_SENT', 'SENT', 'PAID', 'CLOSED', 'CANCELLED');
CREATE TYPE "commerce"."ModifierSelectionMode" AS ENUM ('SINGLE', 'MULTI');
CREATE TYPE "commerce"."KitchenTicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE', 'BUMPED');
CREATE TYPE "commerce"."RestaurantApprovalType" AS ENUM ('VOID', 'DISCOUNT');
CREATE TYPE "commerce"."RestaurantApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED');

CREATE TABLE "commerce"."restaurant_dining_rooms" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_dining_rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_tables" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "diningRoomId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER,
  "posX" INTEGER,
  "posY" INTEGER,
  "shape" "commerce"."RestaurantTableShape" NOT NULL DEFAULT 'SQUARE',
  "availabilityStatus" "commerce"."RestaurantTableAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_modifier_groups" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "selectionMode" "commerce"."ModifierSelectionMode" NOT NULL DEFAULT 'MULTI',
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_modifier_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_modifier_options" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "modifierGroupId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_modifier_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_menu_item_modifier_groups" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "catalogItemId" TEXT NOT NULL,
  "modifierGroupId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_menu_item_modifier_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_table_sessions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "registerId" TEXT,
  "shiftSessionId" TEXT,
  "openedByUserId" TEXT NOT NULL,
  "openedAt" TIMESTAMPTZ(6) NOT NULL,
  "closedAt" TIMESTAMPTZ(6),
  "status" "commerce"."RestaurantTableSessionStatus" NOT NULL DEFAULT 'OPEN',
  "transferCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_table_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_orders" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "tableSessionId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "status" "commerce"."RestaurantOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMPTZ(6),
  "paidAt" TIMESTAMPTZ(6),
  "closedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_order_items" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "catalogItemId" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "sentQuantity" INTEGER NOT NULL DEFAULT 0,
  "unitPriceCents" INTEGER NOT NULL,
  "taxRateBps" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "lineSubtotalCents" INTEGER NOT NULL,
  "lineTotalCents" INTEGER NOT NULL,
  "voidedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_order_payments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_order_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_order_item_modifiers" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "modifierGroupId" TEXT,
  "optionName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_order_item_modifiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."kitchen_stations" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kitchen_stations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."kitchen_tickets" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "tableSessionId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "stationId" TEXT,
  "sendKey" TEXT NOT NULL,
  "status" "commerce"."KitchenTicketStatus" NOT NULL DEFAULT 'NEW',
  "sentAt" TIMESTAMPTZ(6) NOT NULL,
  "bumpedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kitchen_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."kitchen_ticket_items" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kitchen_ticket_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce"."restaurant_approval_requests" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "type" "commerce"."RestaurantApprovalType" NOT NULL,
  "status" "commerce"."RestaurantApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "amountCents" INTEGER,
  "workflowInstanceId" TEXT,
  "requestedByUserId" TEXT NOT NULL,
  "decidedByUserId" TEXT,
  "decidedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_dining_rooms_tenant_workspace_name_key"
ON "commerce"."restaurant_dining_rooms"("tenantId", "workspaceId", "name");
CREATE UNIQUE INDEX "restaurant_tables_tenant_workspace_room_name_key"
ON "commerce"."restaurant_tables"("tenantId", "workspaceId", "diningRoomId", "name");
CREATE UNIQUE INDEX "restaurant_modifier_groups_tenant_workspace_name_key"
ON "commerce"."restaurant_modifier_groups"("tenantId", "workspaceId", "name");
CREATE UNIQUE INDEX "restaurant_modifier_options_group_name_key"
ON "commerce"."restaurant_modifier_options"("tenantId", "workspaceId", "modifierGroupId", "name");
CREATE UNIQUE INDEX "restaurant_menu_item_modifier_groups_unique_key"
ON "commerce"."restaurant_menu_item_modifier_groups"("tenantId", "workspaceId", "catalogItemId", "modifierGroupId");
CREATE UNIQUE INDEX "kitchen_stations_tenant_workspace_name_key"
ON "commerce"."kitchen_stations"("tenantId", "workspaceId", "name");
CREATE UNIQUE INDEX "kitchen_stations_tenant_workspace_code_key"
ON "commerce"."kitchen_stations"("tenantId", "workspaceId", "code");
CREATE UNIQUE INDEX "kitchen_tickets_send_key_station_key"
ON "commerce"."kitchen_tickets"("tenantId", "workspaceId", "sendKey", "stationId");

CREATE INDEX "restaurant_dining_rooms_sort_idx"
ON "commerce"."restaurant_dining_rooms"("tenantId", "workspaceId", "sortOrder");
CREATE INDEX "restaurant_tables_room_idx"
ON "commerce"."restaurant_tables"("tenantId", "workspaceId", "diningRoomId");
CREATE INDEX "restaurant_table_sessions_table_status_idx"
ON "commerce"."restaurant_table_sessions"("tenantId", "workspaceId", "tableId", "status");
CREATE INDEX "restaurant_orders_table_status_idx"
ON "commerce"."restaurant_orders"("tenantId", "workspaceId", "tableId", "status");
CREATE INDEX "restaurant_order_items_order_idx"
ON "commerce"."restaurant_order_items"("tenantId", "workspaceId", "orderId");
CREATE INDEX "restaurant_order_payments_order_idx"
ON "commerce"."restaurant_order_payments"("tenantId", "workspaceId", "orderId");
CREATE INDEX "kitchen_tickets_status_idx"
ON "commerce"."kitchen_tickets"("tenantId", "workspaceId", "status", "sentAt");
CREATE INDEX "restaurant_approval_requests_status_idx"
ON "commerce"."restaurant_approval_requests"("tenantId", "workspaceId", "orderId", "status");

ALTER TABLE "commerce"."restaurant_tables"
ADD CONSTRAINT "restaurant_tables_dining_room_fkey"
FOREIGN KEY ("diningRoomId") REFERENCES "commerce"."restaurant_dining_rooms"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_modifier_options"
ADD CONSTRAINT "restaurant_modifier_options_group_fkey"
FOREIGN KEY ("modifierGroupId") REFERENCES "commerce"."restaurant_modifier_groups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_menu_item_modifier_groups"
ADD CONSTRAINT "restaurant_menu_item_modifier_groups_group_fkey"
FOREIGN KEY ("modifierGroupId") REFERENCES "commerce"."restaurant_modifier_groups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_table_sessions"
ADD CONSTRAINT "restaurant_table_sessions_table_fkey"
FOREIGN KEY ("tableId") REFERENCES "commerce"."restaurant_tables"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_orders"
ADD CONSTRAINT "restaurant_orders_session_fkey"
FOREIGN KEY ("tableSessionId") REFERENCES "commerce"."restaurant_table_sessions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_order_items"
ADD CONSTRAINT "restaurant_order_items_order_fkey"
FOREIGN KEY ("orderId") REFERENCES "commerce"."restaurant_orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_order_payments"
ADD CONSTRAINT "restaurant_order_payments_order_fkey"
FOREIGN KEY ("orderId") REFERENCES "commerce"."restaurant_orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_order_item_modifiers"
ADD CONSTRAINT "restaurant_order_item_modifiers_item_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "commerce"."restaurant_order_items"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."kitchen_tickets"
ADD CONSTRAINT "kitchen_tickets_order_fkey"
FOREIGN KEY ("orderId") REFERENCES "commerce"."restaurant_orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."kitchen_tickets"
ADD CONSTRAINT "kitchen_tickets_station_fkey"
FOREIGN KEY ("stationId") REFERENCES "commerce"."kitchen_stations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commerce"."kitchen_ticket_items"
ADD CONSTRAINT "kitchen_ticket_items_ticket_fkey"
FOREIGN KEY ("ticketId") REFERENCES "commerce"."kitchen_tickets"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."kitchen_ticket_items"
ADD CONSTRAINT "kitchen_ticket_items_order_item_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "commerce"."restaurant_order_items"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_approval_requests"
ADD CONSTRAINT "restaurant_approval_requests_order_fkey"
FOREIGN KEY ("orderId") REFERENCES "commerce"."restaurant_orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."restaurant_approval_requests"
ADD CONSTRAINT "restaurant_approval_requests_order_item_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "commerce"."restaurant_order_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
