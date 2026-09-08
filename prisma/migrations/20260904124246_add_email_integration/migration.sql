-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailPassword" TEXT,
ADD COLUMN     "emailSignature" TEXT,
ADD COLUMN     "isEmailConnected" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "email_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_drafts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
