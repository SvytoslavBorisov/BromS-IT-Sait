-- DropForeignKey
ALTER TABLE "Signatures" DROP CONSTRAINT "Signatures_documentId_fkey";

-- AlterTable
ALTER TABLE "Signatures" ALTER COLUMN "documentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Signatures" ADD CONSTRAINT "Signatures_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
