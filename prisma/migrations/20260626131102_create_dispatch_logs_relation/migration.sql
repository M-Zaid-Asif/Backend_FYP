-- CreateTable
CREATE TABLE "DispatchLog" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "quantitySent" INTEGER NOT NULL,
    "dispatchedTo" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispatchLog_resourceId_idx" ON "DispatchLog"("resourceId");

-- AddForeignKey
ALTER TABLE "DispatchLog" ADD CONSTRAINT "DispatchLog_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
