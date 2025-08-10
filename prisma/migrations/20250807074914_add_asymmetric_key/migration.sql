/*
  Warnings:

  - A unique constraint covering the columns `[publicKey]` on the table `AsymmetricKey` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publicKey` to the `AsymmetricKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AsymmetricKey" ADD COLUMN     "publicKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AsymmetricKey_publicKey_key" ON "AsymmetricKey"("publicKey");
