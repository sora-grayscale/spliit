-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "twoFactorBackupCodes" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- AlterTable
ALTER TABLE "WhitelistUser" ADD COLUMN     "twoFactorBackupCodes" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateIndex
CREATE INDEX "Activity_groupId_time_idx" ON "Activity"("groupId", "time" DESC);

-- CreateIndex
CREATE INDEX "Expense_groupId_expenseDate_idx" ON "Expense"("groupId", "expenseDate" DESC);

-- CreateIndex
CREATE INDEX "Expense_groupId_createdAt_idx" ON "Expense"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Expense_paidById_idx" ON "Expense"("paidById");

-- CreateIndex
CREATE INDEX "ExpensePaidFor_participantId_idx" ON "ExpensePaidFor"("participantId");

-- CreateIndex
CREATE INDEX "Group_createdAt_idx" ON "Group"("createdAt");

-- CreateIndex
CREATE INDEX "Group_deletedAt_idx" ON "Group"("deletedAt");
