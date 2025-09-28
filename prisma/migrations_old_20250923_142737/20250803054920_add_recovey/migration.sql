-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('PENDING', 'DONE', 'CANCELED');

-- CreateTable
CREATE TABLE "RecoverySession" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "shareSessionId" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareReceipt" (
    "id" TEXT NOT NULL,
    "recoveryId" TEXT NOT NULL,
    "shareholderId" TEXT NOT NULL,
    "ciphertext" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareReceipt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecoverySession" ADD CONSTRAINT "RecoverySession_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoverySession" ADD CONSTRAINT "RecoverySession_shareSessionId_fkey" FOREIGN KEY ("shareSessionId") REFERENCES "ShamirSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareReceipt" ADD CONSTRAINT "ShareReceipt_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "RecoverySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareReceipt" ADD CONSTRAINT "ShareReceipt_shareholderId_fkey" FOREIGN KEY ("shareholderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
