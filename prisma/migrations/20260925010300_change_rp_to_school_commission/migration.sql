/*
  Warnings:

  - You are about to drop the column `rpCommissionPercentage` on the `institutions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "institutions" DROP COLUMN "rpCommissionPercentage",
ADD COLUMN     "schoolCommissionAmount" DOUBLE PRECISION;
