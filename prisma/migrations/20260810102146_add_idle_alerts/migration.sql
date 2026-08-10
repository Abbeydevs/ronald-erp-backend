-- CreateTable
CREATE TABLE "idle_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "idle_alerts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "idle_alerts" ADD CONSTRAINT "idle_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
