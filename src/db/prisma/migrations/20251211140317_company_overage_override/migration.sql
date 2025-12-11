/*
  Warnings:

  - You are about to drop the column `clientName` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `lowStockThreshold` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `materialId` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the `CompanyPricingOverride` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GlobalPricing` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[jobId,companyId]` on the table `Job` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[jobId,variantId]` on the table `JobMaterial` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,locationId,variantId]` on the table `Stock` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `areaSqFt` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientFirstName` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `installDate` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobCost` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobId` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variantId` to the `JobMaterial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inStock` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variantId` to the `Stock` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CompanyPricingOverride" DROP CONSTRAINT "CompanyPricingOverride_companyId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyPricingOverride" DROP CONSTRAINT "CompanyPricingOverride_materialId_fkey";

-- DropForeignKey
ALTER TABLE "GlobalPricing" DROP CONSTRAINT "GlobalPricing_materialId_fkey";

-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_materialId_fkey";

-- DropIndex
DROP INDEX "JobMaterial_materialId_idx";

-- DropIndex
DROP INDEX "Stock_companyId_locationId_materialId_key";

-- DropIndex
DROP INDEX "Stock_materialId_idx";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "clientName",
DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "areaSqFt" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "clientFirstName" TEXT NOT NULL,
ADD COLUMN     "clientLastName" TEXT,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "duration" INTEGER NOT NULL,
ADD COLUMN     "installDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "jobCost" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "jobId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "JobMaterial" ADD COLUMN     "variantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Stock" DROP COLUMN "lowStockThreshold",
DROP COLUMN "materialId",
DROP COLUMN "quantity",
DROP COLUMN "unit",
ADD COLUMN     "inStock" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "useQty" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "variantId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CompanyPricingOverride";

-- DropTable
DROP TABLE "GlobalPricing";

-- CreateTable
CREATE TABLE "MaterialVariant" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "type" TEXT,
    "pricePerGallon" DECIMAL(10,2) NOT NULL,
    "coverageArea" DECIMAL(10,2) NOT NULL,
    "overageRate" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyOverageOverride" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "overageRate" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyOverageOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialVariant_materialId_idx" ON "MaterialVariant"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialVariant_materialId_name_key" ON "MaterialVariant"("materialId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyOverageOverride_companyId_variantId_key" ON "CompanyOverageOverride"("companyId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobId_companyId_key" ON "Job"("jobId", "companyId");

-- CreateIndex
CREATE INDEX "JobMaterial_variantId_idx" ON "JobMaterial"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "JobMaterial_jobId_variantId_key" ON "JobMaterial"("jobId", "variantId");

-- CreateIndex
CREATE INDEX "Stock_variantId_idx" ON "Stock"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_companyId_locationId_variantId_key" ON "Stock"("companyId", "locationId", "variantId");

-- AddForeignKey
ALTER TABLE "MaterialVariant" ADD CONSTRAINT "MaterialVariant_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MaterialVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMaterial" ADD CONSTRAINT "JobMaterial_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MaterialVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOverageOverride" ADD CONSTRAINT "CompanyOverageOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOverageOverride" ADD CONSTRAINT "CompanyOverageOverride_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MaterialVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
