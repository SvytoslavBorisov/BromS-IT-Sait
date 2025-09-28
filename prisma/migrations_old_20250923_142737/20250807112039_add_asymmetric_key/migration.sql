/*
  Warnings:

  - A unique constraint covering the columns `[recoveryId]` on the table `documentSignSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "documentSignSession_recoveryId_key" ON "documentSignSession"("recoveryId");
