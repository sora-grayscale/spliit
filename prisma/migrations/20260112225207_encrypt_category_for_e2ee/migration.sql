-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_categoryId_fkey";

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "categoryId" SET DEFAULT '0',
ALTER COLUMN "categoryId" SET DATA TYPE TEXT;
