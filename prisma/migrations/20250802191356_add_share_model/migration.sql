-- AlterTable
ALTER TABLE "Share" ADD COLUMN     "sessionId" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ShamirSession" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "prime" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShamirSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ShamirSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
