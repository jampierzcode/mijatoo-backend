/*
  Warnings:

  - You are about to drop the column `stripeAccountId` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentIntentId` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the `snack_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `snack_sales` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SubPaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'YAPE', 'PLIN', 'CARD', 'OTHER');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING_PAYMENT';

-- DropForeignKey
ALTER TABLE "snack_items" DROP CONSTRAINT "snack_items_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "snack_sales" DROP CONSTRAINT "snack_sales_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "snack_sales" DROP CONSTRAINT "snack_sales_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "snack_sales" DROP CONSTRAINT "snack_sales_roomId_fkey";

-- DropForeignKey
ALTER TABLE "snack_sales" DROP CONSTRAINT "snack_sales_snackItemId_fkey";

-- DropIndex
DROP INDEX "subscriptions_hotelId_key";

-- AlterTable
ALTER TABLE "hotels" DROP COLUMN "stripeAccountId",
ADD COLUMN     "culqiPublicKey" TEXT,
ADD COLUMN     "culqiSecretKey" TEXT;

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "stripePaymentIntentId",
ADD COLUMN     "culqiChargeId" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "culqiCardId" TEXT,
ADD COLUMN     "culqiCustomerId" TEXT,
ADD COLUMN     "culqiSubscriptionId" TEXT,
ADD COLUMN     "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExp" TIMESTAMP(3);

-- DropTable
DROP TABLE "snack_items";

-- DropTable
DROP TABLE "snack_sales";

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "SubPaymentMethod" NOT NULL,
    "notes" TEXT,
    "receiptNumber" TEXT,
    "registeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_hotelId_idx" ON "subscriptions"("hotelId");

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
