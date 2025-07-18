'use client'
import { DecryptedExpenseContent } from '@/components/decrypted-expense-content'
import { Button } from '@/components/ui/button'
import { DateTimeStyle, cn, formatDate } from '@/lib/utils'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ActivityType, Participant } from '@prisma/client'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment } from 'react'

export type Activity =
  AppRouterOutput['groups']['activities']['list']['activities'][number]

type Props = {
  groupId: string
  activity: Activity
  participant?: Participant
  dateStyle: DateTimeStyle
  isEncrypted?: boolean
  encryptionSalt?: string | null
}

function useSummary(
  activity: Activity,
  participantName?: string,
  isEncrypted?: boolean,
  encryptionSalt?: string | null,
  groupId?: string,
) {
  const t = useTranslations('Activity')
  const participant = participantName ?? t('someone')

  // Helper function to render participant details
  const renderParticipantDetails = () => {
    if (!activity.expense) return null

    const paidFor = activity.expense.paidFor?.map((paidFor, index) => (
      <Fragment key={index}>
        {index !== 0 && <>, </>}
        <strong>{paidFor.participant.name}</strong>
      </Fragment>
    ))

    if (!paidFor || paidFor.length === 0) return null

    return (
      <div className="text-xs text-muted-foreground mt-1">
        Paid by <strong>{activity.expense.paidBy?.name}</strong> for {paidFor}
      </div>
    )
  }

  // Direct template construction - most reliable approach
  const renderExpenseActivity = (templateKey: string) => {
    const expenseTitle =
      isEncrypted && encryptionSalt ? (
        // For encrypted groups, try to decrypt using expense data if available
        activity.expense ? (
          <DecryptedExpenseContent
            encryptedData={activity.expense.encryptedData}
            encryptionIv={activity.expense.encryptionIv}
            encryptionSalt={encryptionSalt}
            groupId={groupId || ''}
            fallbackTitle={activity.data ?? ''}
          />
        ) : // For deleted expenses, data might be the only source of title
        activity.data === '[Encrypted]' ? (
          'Encrypted Expense'
        ) : (
          activity.data ?? ''
        )
      ) : (
        activity.data ?? ''
      )

    // Build the message manually based on the template structure
    if (templateKey === 'expenseCreated') {
      return (
        <div>
          <div>
            Expense <em>{expenseTitle}</em> created by{' '}
            <strong>{participant}</strong>.
          </div>
          {renderParticipantDetails()}
        </div>
      )
    } else if (templateKey === 'expenseUpdated') {
      return (
        <div>
          <div>
            Expense <em>{expenseTitle}</em> updated by{' '}
            <strong>{participant}</strong>.
          </div>
          {renderParticipantDetails()}
        </div>
      )
    } else if (templateKey === 'expenseDeleted') {
      return (
        <div>
          <div>
            Expense <em>{expenseTitle}</em> deleted by{' '}
            <strong>{participant}</strong>.
          </div>
          {renderParticipantDetails()}
        </div>
      )
    }

    // Fallback to basic display
    return (
      <div>
        <div>
          {t(templateKey)} {expenseTitle} by {participant}
        </div>
        {renderParticipantDetails()}
      </div>
    )
  }

  if (activity.activityType == ActivityType.UPDATE_GROUP) {
    return (
      <>
        {t.rich('settingsModified', {
          participant,
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </>
    )
  } else if (activity.activityType == ActivityType.CREATE_EXPENSE) {
    return renderExpenseActivity('expenseCreated')
  } else if (activity.activityType == ActivityType.UPDATE_EXPENSE) {
    return renderExpenseActivity('expenseUpdated')
  } else if (activity.activityType == ActivityType.DELETE_EXPENSE) {
    return renderExpenseActivity('expenseDeleted')
  }
}

export function ActivityItem({
  groupId,
  activity,
  participant,
  dateStyle,
  isEncrypted,
  encryptionSalt,
}: Props) {
  const router = useRouter()
  const locale = useLocale()

  const expenseExists = activity.expense !== undefined
  const summary = useSummary(
    activity,
    participant?.name,
    isEncrypted,
    encryptionSalt,
    groupId,
  )

  return (
    <div
      className={cn(
        'flex justify-between sm:rounded-lg px-2 sm:pr-1 sm:pl-2 py-2 text-sm hover:bg-accent gap-1 items-stretch',
        expenseExists && 'cursor-pointer',
      )}
      onClick={() => {
        if (expenseExists) {
          router.push(`/groups/${groupId}/expenses/${activity.expenseId}/edit`)
        }
      }}
    >
      <div className="flex flex-col justify-between items-start">
        {dateStyle !== undefined && (
          <div className="mt-1 text-xs/5 text-muted-foreground">
            {formatDate(activity.time, locale, { dateStyle })}
          </div>
        )}
        <div className="my-1 text-xs/5 text-muted-foreground">
          {formatDate(activity.time, locale, { timeStyle: 'short' })}
        </div>
      </div>
      <div className="flex-1">
        <div className="m-1">{summary}</div>
      </div>
      {expenseExists && (
        <Button
          size="icon"
          variant="link"
          className="self-center hidden sm:flex w-5 h-5"
          asChild
        >
          <Link href={`/groups/${groupId}/expenses/${activity.expenseId}/edit`}>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}
