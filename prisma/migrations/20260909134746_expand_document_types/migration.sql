/*
  Warnings:

  - The values [PASSPORT,TRANSCRIPT] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('WAEC_NECO_CERTIFICATE', 'PASSPORT_DATA_PAGE', 'SS1_SS3_TRANSCRIPT', 'ACADEMIC_TRANSCRIPT', 'CV_RESUME', 'STATEMENT_OF_PURPOSE', 'BIRTH_CERTIFICATE', 'TESTIMONIAL', 'IELTS_RESULT', 'WORK_REFERENCE_LETTER', 'SCHOOL_REFERENCE_LETTER', 'HND_BSC_CERTIFICATE', 'RESEARCH_PROPOSAL', 'BANK_STATEMENT', 'MEDICAL', 'OFFER_LETTER', 'OTHER');
ALTER TABLE "documents" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;
