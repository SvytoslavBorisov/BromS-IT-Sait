-- DropForeignKey
ALTER TABLE "documentSignSession" DROP CONSTRAINT "documentSignSession_publicKeyId_fkey";

-- AlterTable
ALTER TABLE "documentSignSession" ALTER COLUMN "publicKeyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_publicKeyId_fkey" FOREIGN KEY ("publicKeyId") REFERENCES "AsymmetricKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
