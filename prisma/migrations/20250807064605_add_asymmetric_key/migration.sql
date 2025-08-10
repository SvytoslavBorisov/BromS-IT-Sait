-- CreateTable
CREATE TABLE "AsymmetricKey" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "privateKeySharingId" TEXT NOT NULL,
    "p" TEXT NOT NULL,
    "a" TEXT NOT NULL,
    "b" TEXT NOT NULL,
    "m" TEXT NOT NULL,
    "q" TEXT NOT NULL,
    "xp" TEXT NOT NULL,
    "yp" TEXT NOT NULL,
    "Q" TEXT NOT NULL,

    CONSTRAINT "AsymmetricKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsymmetricKey_privateKeySharingId_key" ON "AsymmetricKey"("privateKeySharingId");

-- AddForeignKey
ALTER TABLE "AsymmetricKey" ADD CONSTRAINT "AsymmetricKey_privateKeySharingId_fkey" FOREIGN KEY ("privateKeySharingId") REFERENCES "ShamirSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
