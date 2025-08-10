/*
  Warnings:

  - Added the required column `publicKeyId` to the `documentSignSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "documentSignSession" ADD COLUMN     "publicKeyId" TEXT NOT NULL,
ADD COLUMN     "r" TEXT DEFAULT '',
ADD COLUMN     "s" TEXT DEFAULT '';

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_publicKeyId_fkey" FOREIGN KEY ("publicKeyId") REFERENCES "AsymmetricKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
