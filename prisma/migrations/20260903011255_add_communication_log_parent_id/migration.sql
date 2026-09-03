-- AlterTable
ALTER TABLE "CommunicationLog" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunicationLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
