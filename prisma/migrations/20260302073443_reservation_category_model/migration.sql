-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_roomId_fkey";

-- AlterTable: add categoryId as nullable first
ALTER TABLE "reservations" ADD COLUMN "categoryId" TEXT;

-- Data migration: populate categoryId from room.categoryId for existing reservations
UPDATE "reservations" r SET "categoryId" = rm."categoryId" FROM "rooms" rm WHERE r."roomId" = rm."id";

-- Now make categoryId required
ALTER TABLE "reservations" ALTER COLUMN "categoryId" SET NOT NULL;

-- Make roomId nullable
ALTER TABLE "reservations" ALTER COLUMN "roomId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "room_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
