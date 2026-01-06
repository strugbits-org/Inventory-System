/*
  Warnings:

  - A unique constraint covering the columns `[materialId,name,color]` on the table `MaterialVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "MaterialVariant_materialId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "MaterialVariant_materialId_name_color_key" ON "MaterialVariant"("materialId", "name", "color");
