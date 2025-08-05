/*
  Warnings:

  - You are about to drop the column `status` on the `ShareReceipt` table. All the data in the column will be lost.
  - Added the required column `comment` to the `RecoverySession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RecoverySession" ADD COLUMN     "comment" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ShareReceipt" DROP COLUMN "status";
