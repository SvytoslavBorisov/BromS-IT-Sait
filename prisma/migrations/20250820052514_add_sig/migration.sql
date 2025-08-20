/*
  Warnings:

  - Added the required column `type` to the `Signatures` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Signatures" ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "pem" TEXT,
ADD COLUMN     "shamirSessionId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Signatures" ADD CONSTRAINT "Signatures_shamirSessionId_fkey" FOREIGN KEY ("shamirSessionId") REFERENCES "ShamirSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
