/*
  Warnings:

  - You are about to drop the column `prime` on the `ShamirSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShamirSession" DROP COLUMN "prime",
ADD COLUMN     "commitments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "g" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "p" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "q" TEXT NOT NULL DEFAULT '';
