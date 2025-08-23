/*
  Warnings:

  - A unique constraint covering the columns `[e2ePublicKey]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DkgSessionStatus" AS ENUM ('LOBBY', 'ROUND1', 'ROUND2', 'ROUND3', 'FINAL', 'ABORTED');

-- CreateEnum
CREATE TYPE "DkgShareDelivery" AS ENUM ('SENT', 'DELIVERED', 'READ', 'REJECTED');

-- CreateEnum
CREATE TYPE "DkgComplaintStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "e2ePublicKey" TEXT,
ADD COLUMN     "e2ePublicKeyAlg" TEXT NOT NULL DEFAULT 'ECIES-GOST-2012-256';

-- CreateTable
CREATE TABLE "DkgSession" (
    "id" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "n" INTEGER NOT NULL,
    "t" INTEGER NOT NULL,
    "epoch" TEXT NOT NULL DEFAULT '2025Q3',
    "status" "DkgSessionStatus" NOT NULL DEFAULT 'LOBBY',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DkgSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "e2ePublicKey" TEXT NOT NULL,
    "e2ePublicKeyAlg" TEXT NOT NULL DEFAULT 'ECIES-GOST-2012-256',
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "DkgParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgCommitment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "commitments" JSONB NOT NULL,
    "commitmentsHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DkgCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgShareOutbox" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "transcriptHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "DkgShareDelivery" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "DkgShareOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgReady" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "Qhash" TEXT NOT NULL,
    "transcriptHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DkgReady_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgComplaint" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "accuserId" TEXT NOT NULL,
    "accusedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL,
    "status" "DkgComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DkgComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DkgSession_status_createdAt_idx" ON "DkgSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DkgParticipant_sessionId_idx" ON "DkgParticipant"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgParticipant_sessionId_userId_key" ON "DkgParticipant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "DkgCommitment_sessionId_idx" ON "DkgCommitment"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgCommitment_sessionId_fromUserId_key" ON "DkgCommitment"("sessionId", "fromUserId");

-- CreateIndex
CREATE INDEX "DkgShareOutbox_sessionId_toUserId_status_idx" ON "DkgShareOutbox"("sessionId", "toUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DkgShareOutbox_sessionId_fromUserId_toUserId_key" ON "DkgShareOutbox"("sessionId", "fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "DkgReady_sessionId_idx" ON "DkgReady"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgReady_sessionId_userId_key" ON "DkgReady"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "DkgComplaint_sessionId_status_idx" ON "DkgComplaint"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_e2ePublicKey_key" ON "User"("e2ePublicKey");

-- AddForeignKey
ALTER TABLE "DkgSession" ADD CONSTRAINT "DkgSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgParticipant" ADD CONSTRAINT "DkgParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgParticipant" ADD CONSTRAINT "DkgParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgCommitment" ADD CONSTRAINT "DkgCommitment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgCommitment" ADD CONSTRAINT "DkgCommitment_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgShareOutbox" ADD CONSTRAINT "DkgShareOutbox_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgShareOutbox" ADD CONSTRAINT "DkgShareOutbox_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgShareOutbox" ADD CONSTRAINT "DkgShareOutbox_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgReady" ADD CONSTRAINT "DkgReady_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgReady" ADD CONSTRAINT "DkgReady_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgComplaint" ADD CONSTRAINT "DkgComplaint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgComplaint" ADD CONSTRAINT "DkgComplaint_accuserId_fkey" FOREIGN KEY ("accuserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgComplaint" ADD CONSTRAINT "DkgComplaint_accusedId_fkey" FOREIGN KEY ("accusedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
