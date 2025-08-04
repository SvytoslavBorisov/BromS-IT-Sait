/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,userId]` on the table `Share` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Share_sessionId_userId_key" ON "Share"("sessionId", "userId");
