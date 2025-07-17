'use client'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { ExpenseForm } from './expense-form'
import { PasswordCrypto, PasswordSession } from '@/lib/e2ee-crypto'
import { ExpenseFormValues } from '@/lib/schemas'

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
        let processedExpenseFormValues: ExpenseFormValues = { ...expenseFormValues }
        
        // If group is encrypted, encrypt the expense data
        if (group.isEncrypted && group.encryptionSalt) {
          const password = PasswordSession.getPassword(groupId)
          if (password) {
            const { encryptedData, iv } = await PasswordCrypto.encryptExpenseData(
              expenseFormValues.title,
              expenseFormValues.notes || '',
              password,
              group.encryptionSalt
            )
            
            processedExpenseFormValues = {
              ...expenseFormValues,
              // Clear plaintext data for encrypted expenses
              title: '[Encrypted]',
              notes: '[Encrypted]',
              // Add encrypted data
              encryptedData,
              encryptionIv: iv
            }
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
