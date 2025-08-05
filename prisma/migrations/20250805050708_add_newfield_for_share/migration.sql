/*
  Warnings:

  - Added the required column `senderId` to the `ShareReceipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `ShareReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShareReceipt" ADD COLUMN     "senderId" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ShareReceipt" ADD CONSTRAINT "ShareReceipt_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
