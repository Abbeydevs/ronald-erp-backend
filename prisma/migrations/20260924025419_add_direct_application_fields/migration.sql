-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE 'DIRECT_APPLICATION';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "additionalComments" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "highestQualification" TEXT,
ADD COLUMN     "preferredContact" TEXT;
