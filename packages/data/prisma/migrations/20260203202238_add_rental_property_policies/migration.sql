-- AlterTable
ALTER TABLE "content"."RentalProperty" ADD COLUMN     "checkIn" TEXT,
ADD COLUMN     "checkOut" TEXT,
ADD COLUMN     "offers" TEXT[] DEFAULT ARRAY[]::TEXT[];
