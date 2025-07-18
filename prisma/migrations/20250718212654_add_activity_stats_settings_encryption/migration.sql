-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "dataIv" TEXT,
ADD COLUMN     "encryptedData" TEXT,
ADD COLUMN     "encryptionVersion" INTEGER DEFAULT 1;

-- CreateTable
CREATE TABLE "EncryptedStats" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "statsType" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "dataIv" TEXT NOT NULL,
    "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncryptedStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "participantId" TEXT,
    "settingsType" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "dataIv" TEXT NOT NULL,
    "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EncryptedStats_groupId_statsType_idx" ON "EncryptedStats"("groupId", "statsType");

-- CreateIndex
CREATE INDEX "UserSettings_groupId_participantId_settingsType_idx" ON "UserSettings"("groupId", "participantId", "settingsType");

-- AddForeignKey
ALTER TABLE "EncryptedStats" ADD CONSTRAINT "EncryptedStats_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
