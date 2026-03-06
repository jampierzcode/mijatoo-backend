/*
  Warnings:

  - You are about to drop the column `amenities` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerNight` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `rooms` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `rooms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "amenities",
DROP COLUMN "capacity",
DROP COLUMN "description",
DROP COLUMN "imageUrl",
DROP COLUMN "pricePerNight",
DROP COLUMN "type",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "room_categories" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "pricePerNight" DOUBLE PRECISION NOT NULL,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverImageUrl" TEXT,
    "galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_categories_hotelId_slug_key" ON "room_categories"("hotelId", "slug");

-- AddForeignKey
ALTER TABLE "room_categories" ADD CONSTRAINT "room_categories_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "room_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
