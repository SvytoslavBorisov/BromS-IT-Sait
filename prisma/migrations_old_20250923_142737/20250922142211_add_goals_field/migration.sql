/*
  Warnings:

  - You are about to drop the column `defending` on the `players_fifa` table. All the data in the column will be lost.
  - You are about to drop the `players` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `stamina` on table `players_fifa` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pass` on table `players_fifa` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "players" DROP CONSTRAINT "players_teamId_fkey";

-- AlterTable
ALTER TABLE "players_fifa" DROP COLUMN "defending",
ADD COLUMN     "defense" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "dribble" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Unnamed',
ADD COLUMN     "pace" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "shot" INTEGER NOT NULL DEFAULT 50,
ALTER COLUMN "stamina" SET NOT NULL,
ALTER COLUMN "stamina" SET DEFAULT 50,
ALTER COLUMN "pass" SET NOT NULL,
ALTER COLUMN "pass" SET DEFAULT 50;

-- DropTable
DROP TABLE "players";
