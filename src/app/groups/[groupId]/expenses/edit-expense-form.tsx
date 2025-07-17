'use client'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { ExpenseForm } from './expense-form'
import { PasswordCrypto, PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { ExpenseFormValues } from '@/lib/schemas'

export function EditExpenseForm({
  groupId,
  expenseId,
  runtimeFeatureFlags,
}: {
  groupId: string
  expenseId: string
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const group = groupData?.group

  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories

  const { data: expenseData } = trpc.groups.expenses.get.useQuery({
    groupId,
    expenseId,
  })
  const expense = expenseData?.expense

  const { mutateAsync: updateExpenseMutateAsync } =
    trpc.groups.expenses.update.useMutation()
  const { mutateAsync: deleteExpenseMutateAsync } =
    trpc.groups.expenses.delete.useMutation()

  const utils = trpc.useUtils()
  const router = useRouter()

  if (!group || !categories || !expense) return null

  return (
    <ExpenseForm
      group={group}
      expense={expense}
      categories={categories}
      onSubmit={async (expenseFormValues, participantId) => {
        let processedExpenseFormValues: ExpenseFormValues = { ...expenseFormValues }
        
        // If group is encrypted, encrypt the expense data
        if (group.isEncrypted && group.encryptionSalt) {
          const password = PasswordSession.getPassword(groupId)
          if (!password) {
            throw new Error('Password is required for encrypted groups. Please unlock the group first.')
          }
          
          try {
            const { encryptedData, iv } = await PasswordCrypto.encryptExpenseData(
              expenseFormValues.title,
              expenseFormValues.notes ?? '',
              password,
              group.encryptionSalt
            )
            
            // Validate encryption result
            if (!encryptedData || !iv) {
              throw new Error('Encryption failed - invalid result')
            }
            
            processedExpenseFormValues = {
              ...expenseFormValues,
              // Clear plaintext data for encrypted expenses
              title: '[Encrypted]',
              notes: '[Encrypted]',
              // Add encrypted data
              encryptedData,
              encryptionIv: iv
            }
          } catch (error) {
            console.error('Failed to encrypt expense data:', error)
            throw new Error('Failed to encrypt expense data. Please try again.')
          }
        }
        
        await updateExpenseMutateAsync({
          expenseId,
          groupId,
          expenseFormValues: processedExpenseFormValues,
          participantId,
        })
        utils.groups.expenses.invalidate()
        router.push(`/groups/${group.id}`)
      }}
      onDelete={async (participantId) => {
        await deleteExpenseMutateAsync({
          expenseId,
          groupId,
          participantId,
        })
        utils.groups.expenses.invalidate()
        router.push(`/groups/${group.id}`)
      }}
      runtimeFeatureFlags={runtimeFeatureFlags}
    />
  )
}
