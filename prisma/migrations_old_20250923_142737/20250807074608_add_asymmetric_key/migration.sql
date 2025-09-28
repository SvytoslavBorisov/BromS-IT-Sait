-- CreateEnum
CREATE TYPE "ShamirSessionStatus" AS ENUM ('CUSTOM', 'ASYMMETRIC');

-- AlterTable
ALTER TABLE "ShamirSession" ADD COLUMN     "type" "ShamirSessionStatus" NOT NULL DEFAULT 'CUSTOM';
