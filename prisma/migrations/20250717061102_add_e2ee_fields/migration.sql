-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "encryptedData" TEXT,
ADD COLUMN     "encryptionIv" TEXT;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "encryptionSalt" TEXT,
ADD COLUMN     "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testEncryptedData" TEXT,
ADD COLUMN     "testIv" TEXT;
