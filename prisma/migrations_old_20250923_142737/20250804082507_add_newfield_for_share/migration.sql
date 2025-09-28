/*
  Warnings:

  - You are about to drop the column `shareSessionId` on the `ShareReceipt` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ShareReceipt" DROP CONSTRAINT "ShareReceipt_shareSessionId_shareholderId_fkey";

-- AlterTable
ALTER TABLE "ShareReceipt" DROP COLUMN "shareSessionId";
