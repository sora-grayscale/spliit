'use client'
import { PasswordCrypto, PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { ExpenseFormValues } from '@/lib/schemas'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { ExpenseForm } from './expense-form'

export function CreateExpenseForm({
  groupId,
  runtimeFeatureFlags,
}: {
  groupId: string
  expenseId?: string
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const group = groupData?.group

  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories

  const { mutateAsync: createExpenseMutateAsync } =
    trpc.groups.expenses.create.useMutation()

  const utils = trpc.useUtils()
  const router = useRouter()

  if (!group || !categories) return null

  return (
    <ExpenseForm
      group={group}
      categories={categories}
      onSubmit={async (expenseFormValues, participantId) => {
        let processedExpenseFormValues: ExpenseFormValues = {
          ...expenseFormValues,
        }

        // If group is encrypted, encrypt the expense data
        if (group.isEncrypted && group.encryptionSalt) {
          const password = PasswordSession.getPassword(groupId)
          if (!password) {
            throw new Error(
              'Password is required for encrypted groups. Please unlock the group first.',
            )
          }

          try {
            const { encryptedData, iv } =
              await PasswordCrypto.encryptExpenseData(
                expenseFormValues.title,
                expenseFormValues.notes || '',
                password,
                group.encryptionSalt,
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
              encryptionIv: iv,
            }
          } catch (error) {
            console.error('Failed to encrypt expense data:', error)
            throw new Error('Failed to encrypt expense data. Please try again.')
          }
        }

        await createExpenseMutateAsync({
          groupId,
          expenseFormValues: processedExpenseFormValues,
          participantId,
        })
        utils.groups.expenses.invalidate()
        router.push(`/groups/${group.id}`)
      }}
      runtimeFeatureFlags={runtimeFeatureFlags}
    />
  )
}
