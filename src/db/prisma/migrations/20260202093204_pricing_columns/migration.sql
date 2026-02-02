/*
  Warnings:

  - You are about to drop the column `pricePerGallon` on the `MaterialVariant` table. All the data in the column will be lost.
  - Added the required column `preferredPrice` to the `MaterialVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `regularPrice` to the `MaterialVariant` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MaterialVariant_materialId_name_color_key";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "preferredPriceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MaterialVariant" DROP COLUMN "pricePerGallon",
ADD COLUMN     "preferredPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "regularPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
