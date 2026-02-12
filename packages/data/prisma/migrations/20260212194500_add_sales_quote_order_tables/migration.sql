-- CreateTable
CREATE TABLE "commerce"."SalesQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT,
    "status" "commerce"."SalesQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "customerPartyId" TEXT NOT NULL,
    "customerContactPartyId" TEXT,
    "issueDate" DATE,
    "validUntilDate" DATE,
    "currency" VARCHAR(3) NOT NULL,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "sentAt" TIMESTAMPTZ(6),
    "acceptedAt" TIMESTAMPTZ(6),
    "rejectedAt" TIMESTAMPTZ(6),
    "convertedToSalesOrderId" TEXT,
    "convertedToInvoiceId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SalesQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."SalesQuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCents" INTEGER,
    "taxCode" TEXT,
    "revenueCategory" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "SalesQuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."SalesOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT,
    "status" "commerce"."SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerPartyId" TEXT NOT NULL,
    "customerContactPartyId" TEXT,
    "orderDate" DATE,
    "deliveryDate" DATE,
    "currency" VARCHAR(3) NOT NULL,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMPTZ(6),
    "fulfilledAt" TIMESTAMPTZ(6),
    "canceledAt" TIMESTAMPTZ(6),
    "sourceQuoteId" TEXT,
    "sourceInvoiceId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."SalesOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCents" INTEGER,
    "taxCode" TEXT,
    "revenueCategory" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesQuote_tenantId_number_key" ON "commerce"."SalesQuote"("tenantId", "number");

-- CreateIndex
CREATE INDEX "SalesQuote_tenantId_status_idx" ON "commerce"."SalesQuote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesQuote_tenantId_customerPartyId_idx" ON "commerce"."SalesQuote"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "SalesQuote_tenantId_createdAt_idx" ON "commerce"."SalesQuote"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesQuoteLine_quoteId_idx" ON "commerce"."SalesQuoteLine"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_tenantId_number_key" ON "commerce"."SalesOrder"("tenantId", "number");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_status_idx" ON "commerce"."SalesOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_customerPartyId_idx" ON "commerce"."SalesOrder"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_createdAt_idx" ON "commerce"."SalesOrder"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOrderLine_orderId_idx" ON "commerce"."SalesOrderLine"("orderId");

-- AddForeignKey
ALTER TABLE "commerce"."SalesQuoteLine" ADD CONSTRAINT "SalesQuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "commerce"."SalesQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "commerce"."SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
