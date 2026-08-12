-- CreateEnum
CREATE TYPE "CommType" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP');

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "counsellorId" TEXT NOT NULL,
    "type" "CommType" NOT NULL,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
