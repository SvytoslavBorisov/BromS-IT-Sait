/*
  Warnings:

  - Made the column `ciphertext` on table `ShareReceipt` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ShareReceipt" ALTER COLUMN "ciphertext" SET NOT NULL,
ALTER COLUMN "ciphertext" SET DEFAULT '[]';
