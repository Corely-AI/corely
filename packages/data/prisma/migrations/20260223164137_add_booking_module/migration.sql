-- CreateEnum
CREATE TYPE "commerce"."BookingResourceType" AS ENUM ('STAFF', 'ROOM', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "commerce"."BookingStatus" AS ENUM ('DRAFT', 'HOLD', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "commerce"."BookingAllocationRole" AS ENUM ('PRIMARY', 'SUPPORT', 'ROOM', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "commerce"."BookingHoldStatus" AS ENUM ('ACTIVE', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "commerce"."BookingResource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "commerce"."BookingResourceType" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(500),
    "capacity" INTEGER,
    "tags" TEXT[],
    "attributes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BookingResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."BookingServiceOffering" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER,
    "currency" VARCHAR(3),
    "depositCents" INTEGER,
    "requiredResourceTypes" TEXT[],
    "requiredTags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BookingServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."BookingAvailabilityRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "weeklySlots" JSONB NOT NULL,
    "blackouts" JSONB NOT NULL DEFAULT '[]',
    "effectiveFrom" TIMESTAMPTZ(6),
    "effectiveTo" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BookingAvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."Booking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" "commerce"."BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6) NOT NULL,
    "referenceNumber" VARCHAR(40),
    "serviceOfferingId" TEXT,
    "bookedByPartyId" TEXT,
    "bookedByName" VARCHAR(200),
    "bookedByEmail" VARCHAR(320),
    "notes" TEXT,
    "holdId" TEXT,
    "cancelledAt" TIMESTAMPTZ(6),
    "cancelledReason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."BookingAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "role" "commerce"."BookingAllocationRole" NOT NULL DEFAULT 'PRIMARY',
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."BookingHold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" "commerce"."BookingHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6) NOT NULL,
    "serviceOfferingId" TEXT,
    "resourceIds" TEXT[],
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "bookedByPartyId" TEXT,
    "bookedByName" VARCHAR(200),
    "bookedByEmail" VARCHAR(320),
    "notes" TEXT,
    "confirmedBookingId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingResource_tenantId_idx" ON "commerce"."BookingResource"("tenantId");

-- CreateIndex
CREATE INDEX "BookingResource_tenantId_workspaceId_idx" ON "commerce"."BookingResource"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "BookingResource_tenantId_type_idx" ON "commerce"."BookingResource"("tenantId", "type");

-- CreateIndex
CREATE INDEX "BookingResource_tenantId_isActive_idx" ON "commerce"."BookingResource"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "BookingServiceOffering_tenantId_idx" ON "commerce"."BookingServiceOffering"("tenantId");

-- CreateIndex
CREATE INDEX "BookingServiceOffering_tenantId_workspaceId_idx" ON "commerce"."BookingServiceOffering"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "BookingServiceOffering_tenantId_isActive_idx" ON "commerce"."BookingServiceOffering"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "BookingAvailabilityRule_tenantId_resourceId_idx" ON "commerce"."BookingAvailabilityRule"("tenantId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingAvailabilityRule_tenantId_resourceId_key" ON "commerce"."BookingAvailabilityRule"("tenantId", "resourceId");

-- CreateIndex
CREATE INDEX "Booking_tenantId_idx" ON "commerce"."Booking"("tenantId");

-- CreateIndex
CREATE INDEX "Booking_tenantId_workspaceId_idx" ON "commerce"."Booking"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "Booking_tenantId_status_idx" ON "commerce"."Booking"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Booking_tenantId_startAt_idx" ON "commerce"."Booking"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "Booking_tenantId_endAt_idx" ON "commerce"."Booking"("tenantId", "endAt");

-- CreateIndex
CREATE INDEX "Booking_tenantId_bookedByPartyId_idx" ON "commerce"."Booking"("tenantId", "bookedByPartyId");

-- CreateIndex
CREATE INDEX "Booking_tenantId_serviceOfferingId_idx" ON "commerce"."Booking"("tenantId", "serviceOfferingId");

-- CreateIndex
CREATE INDEX "BookingAllocation_tenantId_bookingId_idx" ON "commerce"."BookingAllocation"("tenantId", "bookingId");

-- CreateIndex
CREATE INDEX "BookingAllocation_tenantId_resourceId_idx" ON "commerce"."BookingAllocation"("tenantId", "resourceId");

-- CreateIndex
CREATE INDEX "BookingAllocation_tenantId_resourceId_startAt_idx" ON "commerce"."BookingAllocation"("tenantId", "resourceId", "startAt");

-- CreateIndex
CREATE INDEX "BookingHold_tenantId_idx" ON "commerce"."BookingHold"("tenantId");

-- CreateIndex
CREATE INDEX "BookingHold_tenantId_status_idx" ON "commerce"."BookingHold"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BookingHold_tenantId_expiresAt_idx" ON "commerce"."BookingHold"("tenantId", "expiresAt");

-- AddForeignKey
ALTER TABLE "commerce"."BookingAvailabilityRule" ADD CONSTRAINT "BookingAvailabilityRule_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "commerce"."BookingResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."Booking" ADD CONSTRAINT "Booking_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES "commerce"."BookingServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."Booking" ADD CONSTRAINT "Booking_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "commerce"."BookingHold"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."BookingAllocation" ADD CONSTRAINT "BookingAllocation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "commerce"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."BookingAllocation" ADD CONSTRAINT "BookingAllocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "commerce"."BookingResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."BookingHold" ADD CONSTRAINT "BookingHold_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES "commerce"."BookingServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;
