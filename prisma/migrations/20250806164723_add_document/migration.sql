-- CreateTable
CREATE TABLE "documentSignSession" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "hash" TEXT,
    "documentId" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "recoveryId" TEXT NOT NULL,

    CONSTRAINT "documentSignSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "RecoverySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
