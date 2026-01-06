-- AlterTable
ALTER TABLE "JobMaterial" ADD COLUMN     "additionalCost" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "additionalQty" DECIMAL(10,2) DEFAULT 0;
