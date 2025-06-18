-- CreateTable
CREATE TABLE "AdStatusLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adArchiveId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    CONSTRAINT "AdStatusLog_adArchiveId_fkey" FOREIGN KEY ("adArchiveId") REFERENCES "Ad" ("adArchiveId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdStatusLog_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("pageId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdStatusLog_adArchiveId_idx" ON "AdStatusLog"("adArchiveId");

-- CreateIndex
CREATE INDEX "AdStatusLog_pageId_idx" ON "AdStatusLog"("pageId");

-- CreateIndex
CREATE INDEX "AdStatusLog_timestamp_idx" ON "AdStatusLog"("timestamp");
