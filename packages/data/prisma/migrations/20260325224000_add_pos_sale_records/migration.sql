CREATE TABLE "commerce"."pos_sale_records" (
    "id" UUID NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "session_id" UUID,
    "register_id" UUID NOT NULL,
    "receipt_number" VARCHAR(100) NOT NULL,
    "sale_date" TIMESTAMPTZ NOT NULL,
    "cashier_employee_party_id" UUID NOT NULL,
    "customer_party_id" UUID,
    "subtotal_cents" INTEGER NOT NULL,
    "tax_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
    "line_items_json" JSONB NOT NULL,
    "payments_json" JSONB NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "server_invoice_id" UUID,
    "server_payment_id" UUID,
    "synced_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sale_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pos_sale_records_workspace_idempotency" ON "commerce"."pos_sale_records"("workspace_id", "idempotency_key");
CREATE INDEX "pos_sale_records_workspace_id_sale_date_status_idx" ON "commerce"."pos_sale_records"("workspace_id", "sale_date", "status");
CREATE INDEX "pos_sale_records_workspace_id_register_id_sale_date_idx" ON "commerce"."pos_sale_records"("workspace_id", "register_id", "sale_date");
CREATE INDEX "pos_sale_records_workspace_id_receipt_number_idx" ON "commerce"."pos_sale_records"("workspace_id", "receipt_number");

ALTER TABLE "commerce"."pos_sale_records"
ADD CONSTRAINT "pos_sale_records_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce"."pos_sale_records"
ADD CONSTRAINT "pos_sale_records_register_id_fkey"
FOREIGN KEY ("register_id") REFERENCES "commerce"."registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
