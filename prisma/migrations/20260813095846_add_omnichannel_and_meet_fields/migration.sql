-- AlterEnum
ALTER TYPE "CommType" ADD VALUE 'MEETING';

-- AlterTable
ALTER TABLE "CommunicationLog" ADD COLUMN     "content" TEXT,
ADD COLUMN     "meetUrl" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "lastCommunicatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "CommunicationLog_leadId_idx" ON "CommunicationLog"("leadId");

-- CreateIndex
CREATE INDEX "CommunicationLog_counsellorId_idx" ON "CommunicationLog"("counsellorId");
