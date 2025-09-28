/*
  Warnings:

  - A unique constraint covering the columns `[recoveryId,shareholderId]` on the table `ShareReceipt` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ShareReceipt_recoveryId_shareholderId_key" ON "ShareReceipt"("recoveryId", "shareholderId");
