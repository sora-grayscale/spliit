-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "categoryIv" TEXT,
ADD COLUMN     "encryptedCategory" TEXT,
ADD COLUMN     "encryptedShares" TEXT,
ADD COLUMN     "encryptionFields" TEXT[],
ADD COLUMN     "encryptionVersion" INTEGER DEFAULT 1,
ADD COLUMN     "sharesIv" TEXT;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "encryptedInformation" TEXT,
ADD COLUMN     "encryptedName" TEXT,
ADD COLUMN     "encryptionFields" TEXT[],
ADD COLUMN     "encryptionVersion" INTEGER DEFAULT 1,
ADD COLUMN     "informationIv" TEXT,
ADD COLUMN     "nameIv" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "encryptedName" TEXT,
ADD COLUMN     "encryptionVersion" INTEGER DEFAULT 1,
ADD COLUMN     "nameIv" TEXT;
