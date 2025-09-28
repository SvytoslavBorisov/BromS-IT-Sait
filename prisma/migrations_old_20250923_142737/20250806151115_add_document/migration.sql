-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('NOTECRYPT', 'ECRYPT');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "type" "DocumentStatus" DEFAULT 'NOTECRYPT';
