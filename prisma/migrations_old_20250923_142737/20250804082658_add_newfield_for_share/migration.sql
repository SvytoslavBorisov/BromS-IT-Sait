/*
  Warnings:

  - Added the required column `shareSessionId` to the `ShareReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShareReceipt" ADD COLUMN     "shareSessionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ShareReceipt" ADD CONSTRAINT "ShareReceipt_shareSessionId_shareholderId_fkey" FOREIGN KEY ("shareSessionId", "shareholderId") REFERENCES "Share"("sessionId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
