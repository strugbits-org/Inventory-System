-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('PRODUCTION_MANAGER', 'INSTALLER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeType" "EmployeeType" DEFAULT 'INSTALLER';
