-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING_ADMIN_CONFIG', 'CALCULATED', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "SchoolApplicationStatus" AS ENUM ('PENDING', 'CONDITIONAL_OFFER', 'UNCONDITIONAL_OFFER', 'REJECTED', 'WITHDRAWN', 'ENROLLED_FINAL');

-- CreateTable
CREATE TABLE "agent_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "swiftCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "rpCommissionPercentage" DOUBLE PRECISION,
    "agentCommissionPercentage" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_schools" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "institutionId" TEXT,
    "customInstitutionName" TEXT,
    "status" "SchoolApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "tuitionFeeAmount" DOUBLE PRECISION,
    "agentCommissionAmount" DOUBLE PRECISION,
    "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'PENDING_ADMIN_CONFIG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_schools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_profiles_userId_key" ON "agent_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_name_key" ON "institutions"("name");

-- AddForeignKey
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_schools" ADD CONSTRAINT "target_schools_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_schools" ADD CONSTRAINT "target_schools_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
