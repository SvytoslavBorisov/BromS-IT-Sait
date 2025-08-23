-- CreateEnum
CREATE TYPE "DkgRecoveryStatus" AS ENUM ('OPEN', 'VERIFYING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "DkgRecoverySession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceSessionId" TEXT NOT NULL,
    "qHash" TEXT NOT NULL,
    "n" INTEGER NOT NULL,
    "t" INTEGER NOT NULL,
    "epoch" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "requesterPubKey" TEXT NOT NULL,
    "status" "DkgRecoveryStatus" NOT NULL DEFAULT 'OPEN',
    "resultCiphertext" TEXT,
    "resultMeta" TEXT,

    CONSTRAINT "DkgRecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgRecoveryParticipant" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recoveryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "e2ePublicKey" TEXT,

    CONSTRAINT "DkgRecoveryParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgRecoveryShare" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recoveryId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "s_i_hex" TEXT NOT NULL,
    "proofOk" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DkgRecoveryShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DkgRecoverySession_sourceSessionId_status_createdAt_idx" ON "DkgRecoverySession"("sourceSessionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DkgRecoveryParticipant_recoveryId_idx" ON "DkgRecoveryParticipant"("recoveryId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgRecoveryParticipant_recoveryId_userId_key" ON "DkgRecoveryParticipant"("recoveryId", "userId");

-- CreateIndex
CREATE INDEX "DkgRecoveryShare_recoveryId_idx" ON "DkgRecoveryShare"("recoveryId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgRecoveryShare_recoveryId_fromUserId_key" ON "DkgRecoveryShare"("recoveryId", "fromUserId");

-- AddForeignKey
ALTER TABLE "DkgRecoverySession" ADD CONSTRAINT "DkgRecoverySession_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoverySession" ADD CONSTRAINT "DkgRecoverySession_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoveryParticipant" ADD CONSTRAINT "DkgRecoveryParticipant_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "DkgRecoverySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoveryParticipant" ADD CONSTRAINT "DkgRecoveryParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoveryShare" ADD CONSTRAINT "DkgRecoveryShare_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "DkgRecoverySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoveryShare" ADD CONSTRAINT "DkgRecoveryShare_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
