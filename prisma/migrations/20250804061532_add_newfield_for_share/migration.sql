-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Share" ADD COLUMN     "comment" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "encryptionAlgorithm" TEXT NOT NULL DEFAULT 'RSA-OAEP-SHA256',
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "status" "ShareStatus" NOT NULL DEFAULT 'ACTIVE';
