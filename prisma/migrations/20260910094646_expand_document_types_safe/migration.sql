-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'WAEC_NECO_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'PASSPORT_DATA_PAGE';
ALTER TYPE "DocumentType" ADD VALUE 'SS1_SS3_TRANSCRIPT';
ALTER TYPE "DocumentType" ADD VALUE 'ACADEMIC_TRANSCRIPT';
ALTER TYPE "DocumentType" ADD VALUE 'CV_RESUME';
ALTER TYPE "DocumentType" ADD VALUE 'STATEMENT_OF_PURPOSE';
ALTER TYPE "DocumentType" ADD VALUE 'BIRTH_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'TESTIMONIAL';
ALTER TYPE "DocumentType" ADD VALUE 'IELTS_RESULT';
ALTER TYPE "DocumentType" ADD VALUE 'WORK_REFERENCE_LETTER';
ALTER TYPE "DocumentType" ADD VALUE 'SCHOOL_REFERENCE_LETTER';
ALTER TYPE "DocumentType" ADD VALUE 'HND_BSC_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'RESEARCH_PROPOSAL';
