-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_RESERVATION', 'RESERVATION_CANCELLED', 'RESERVATION_CHECKED_IN', 'RESERVATION_CHECKED_OUT');

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "checkInFrom" TEXT,
ADD COLUMN     "checkInUntil" TEXT,
ADD COLUMN     "checkOutUntil" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_hotelId_isRead_idx" ON "notifications"("hotelId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_hotelId_createdAt_idx" ON "notifications"("hotelId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
