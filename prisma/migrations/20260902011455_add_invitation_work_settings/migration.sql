-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "remoteDays" "DayOfWeek"[],
ADD COLUMN     "workMode" "WorkMode" NOT NULL DEFAULT 'ONSITE';
