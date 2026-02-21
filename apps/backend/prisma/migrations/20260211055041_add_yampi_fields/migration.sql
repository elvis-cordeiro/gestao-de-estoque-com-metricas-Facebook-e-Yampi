/*
  Warnings:

  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalSku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Product_sku_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sku",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSku" TEXT,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_externalId_key" ON "Product"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_externalSku_key" ON "Product"("externalSku");
