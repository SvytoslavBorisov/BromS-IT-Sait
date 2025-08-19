/*
  Warnings:

  - A unique constraint covering the columns `[asymmetricKeyId]` on the table `Certification` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pem` to the `Certification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Certification" ADD COLUMN     "asymmetricKeyId" TEXT,
ADD COLUMN     "pem" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Certification_asymmetricKeyId_key" ON "Certification"("asymmetricKeyId");

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_asymmetricKeyId_fkey" FOREIGN KEY ("asymmetricKeyId") REFERENCES "AsymmetricKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
