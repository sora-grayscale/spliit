import { prisma } from '@/lib/prisma'
import { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import {
  ActivityType,
  Expense,
  RecurrenceRule,
  RecurringExpenseLink,
} from '@prisma/client'
import { nanoid } from 'nanoid'
import { ComprehensiveEncryptionService } from './comprehensive-encryption'

export function randomId() {
  return nanoid()
}

export async function createGroup(groupFormValues: GroupFormValues) {
  const isComprehensivelyEncrypted =
    groupFormValues.isEncrypted &&
    groupFormValues.password &&
    groupFormValues.encryptionSalt

  // Prepare comprehensive encryption if enabled
  let encryptedGroupData = null
  let encryptedParticipantData: Awaited<
    ReturnType<typeof ComprehensiveEncryptionService.encryptParticipantData>
  > | null = null

  if (isComprehensivelyEncrypted) {
    // Encrypt group basic data
    encryptedGroupData =
      await ComprehensiveEncryptionService.encryptGroupBasicData(
        groupFormValues.name,
        groupFormValues.information || null,
        groupFormValues.password!,
        groupFormValues.encryptionSalt!,
      )

    // Encrypt participant data
    encryptedParticipantData =
      await ComprehensiveEncryptionService.encryptParticipantData(
        groupFormValues.participants,
        groupFormValues.password!,
        groupFormValues.encryptionSalt!,
      )
  }

  return prisma.group.create({
    data: {
      id: randomId(),
      name: isComprehensivelyEncrypted ? '' : groupFormValues.name,
      information: isComprehensivelyEncrypted
        ? ''
        : groupFormValues.information || null,
      currency: groupFormValues.currency,
      // E2EE fields
      isEncrypted: groupFormValues.isEncrypted ?? false,
      encryptionSalt: groupFormValues.encryptionSalt || null,
      testEncryptedData: groupFormValues.testEncryptedData || null,
      testIv: groupFormValues.testIv || null,
      // Comprehensive encryption fields
      encryptedName: encryptedGroupData?.encryptedName,
      nameIv: encryptedGroupData?.nameIv,
      encryptedInformation: encryptedGroupData?.encryptedInformation,
      informationIv: encryptedGroupData?.informationIv,
      encryptionVersion: encryptedGroupData?.encryptionVersion,
      encryptionFields: encryptedGroupData?.encryptionFields || [],
      participants: {
        createMany: {
          data: groupFormValues.participants.map((participant, index) => {
            const encryptedParticipant = encryptedParticipantData?.[index]
            return {
              id: randomId(),
              name: isComprehensivelyEncrypted ? '' : participant.name,
              // Comprehensive encryption fields for participants
              encryptedName: encryptedParticipant?.encryptedName,
              nameIv: encryptedParticipant?.nameIv,
              encryptionVersion: encryptedParticipant?.encryptionVersion,
            }
          }),
        },
      },
    },
    include: { participants: true },
  })
}

export async function createExpense(
  expenseFormValues: ExpenseFormValues,
  groupId: string,
  participantId?: string,
): Promise<Expense> {
  const group = await getGroup(groupId)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor.map((p) => p.participant),
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  // Security: Clear plaintext fields for encrypted expenses
  const isEncryptedExpense = !!(
    expenseFormValues.encryptedData && expenseFormValues.encryptionIv
  )

  // Check if group has comprehensive encryption enabled
  const isComprehensivelyEncrypted = group.isEncrypted && group.encryptionSalt

  let comprehensiveEncryptionData = null
  if (isComprehensivelyEncrypted && isEncryptedExpense) {
    // Get category name for encryption
    const categories = await getCategories()
    const category = categories.find((c) => c.id === expenseFormValues.category)

    // Prepare share data for encryption with validation
    const shareData = expenseFormValues.paidFor.reduce(
      (acc, paidFor) => {
        // Runtime validation for numeric values
        if (typeof paidFor.shares !== 'number' || isNaN(paidFor.shares)) {
          throw new Error(
            `Invalid share value for participant ${paidFor.participant}: ${paidFor.shares}`,
          )
        }
        acc[paidFor.participant] = paidFor.shares
        return acc
      },
      Object.create(null) as Record<string, number>,
    )

    // We would need the password here - this is a limitation
    // In a real implementation, the password should be passed from the client
    // For now, we'll only encrypt if password is available in the session
    // This would need to be handled at the API layer
  }

  const expenseId = randomId()
  await logActivity(groupId, ActivityType.CREATE_EXPENSE, {
    participantId,
    expenseId,
    data: isEncryptedExpense ? '[Encrypted]' : expenseFormValues.title,
  })

  const isCreateRecurrence =
    expenseFormValues.recurrenceRule !== RecurrenceRule.NONE
  const recurringExpenseLinkPayload = createPayloadForNewRecurringExpenseLink(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    expenseFormValues.expenseDate,
    groupId,
  )

  return prisma.expense.create({
    data: {
      id: expenseId,
      groupId,
      expenseDate: expenseFormValues.expenseDate,
      categoryId: expenseFormValues.category,
      amount: expenseFormValues.amount,
      title: isEncryptedExpense ? '' : expenseFormValues.title,
      paidById: expenseFormValues.paidBy,
      splitMode: expenseFormValues.splitMode,
      recurrenceRule: expenseFormValues.recurrenceRule,
      recurringExpenseLink: {
        ...(isCreateRecurrence
          ? {
              create: recurringExpenseLinkPayload,
            }
          : {}),
      },
      paidFor: {
        createMany: {
          data: expenseFormValues.paidFor.map((paidFor) => ({
            participantId: paidFor.participant,
            shares: paidFor.shares,
          })),
        },
      },
      isReimbursement: expenseFormValues.isReimbursement,
      documents: {
        createMany: {
          data: expenseFormValues.documents.map((doc) => ({
            id: randomId(),
            url: doc.url,
            width: doc.width,
            height: doc.height,
          })),
        },
      },
      notes: isEncryptedExpense ? '' : expenseFormValues.notes,
      // E2EE fields
      encryptedData: expenseFormValues.encryptedData,
      encryptionIv: expenseFormValues.encryptionIv,
      // Comprehensive encryption fields (placeholders for now)
      encryptedCategory: null,
      categoryIv: null,
      encryptedShares: null,
      sharesIv: null,
      encryptionVersion: isComprehensivelyEncrypted ? 1 : null,
      encryptionFields: [],
    },
  })
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  participantId?: string,
) {
  const existingExpense = await getExpense(groupId, expenseId)
  await logActivity(groupId, ActivityType.DELETE_EXPENSE, {
    participantId,
    expenseId,
    data: existingExpense?.title,
  })

  await prisma.expense.delete({
    where: { id: expenseId },
    include: { paidFor: true, paidBy: true },
  })
}

export async function getGroupExpensesParticipants(groupId: string) {
  const expenses = await getGroupExpenses(groupId)
  return Array.from(
    new Set(
      expenses.flatMap((e) => [
        e.paidBy.id,
        ...e.paidFor.map((pf) => pf.participant.id),
      ]),
    ),
  )
}

export async function getGroups(groupIds: string[]) {
  return (
    await prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: { _count: { select: { participants: true } } },
    })
  ).map((group) => ({
    ...group,
    createdAt: group.createdAt.toISOString(),
  }))
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  expenseFormValues: ExpenseFormValues,
  participantId?: string,
) {
  const group = await getGroup(groupId)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  const existingExpense = await getExpense(groupId, expenseId)
  if (!existingExpense) throw new Error(`Invalid expense ID: ${expenseId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor.map((p) => p.participant),
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  // Security: Clear plaintext fields for encrypted expenses
  const isEncryptedExpense = !!(
    expenseFormValues.encryptedData && expenseFormValues.encryptionIv
  )

  // Check if group has comprehensive encryption enabled
  const isComprehensivelyEncrypted = group.isEncrypted && group.encryptionSalt

  await logActivity(groupId, ActivityType.UPDATE_EXPENSE, {
    participantId,
    expenseId,
    data: isEncryptedExpense ? '[Encrypted]' : expenseFormValues.title,
  })

  const isDeleteRecurrenceExpenseLink =
    existingExpense.recurrenceRule !== RecurrenceRule.NONE &&
    expenseFormValues.recurrenceRule === RecurrenceRule.NONE &&
    // Delete the existing RecurrenceExpenseLink only if it has not been acted upon yet
    existingExpense.recurringExpenseLink?.nextExpenseCreatedAt === null

  const isUpdateRecurrenceExpenseLink =
    existingExpense.recurrenceRule !== expenseFormValues.recurrenceRule &&
    // Update the exisiting RecurrenceExpenseLink only if it has not been acted upon yet
    existingExpense.recurringExpenseLink?.nextExpenseCreatedAt === null
  const isCreateRecurrenceExpenseLink =
    existingExpense.recurrenceRule === RecurrenceRule.NONE &&
    expenseFormValues.recurrenceRule !== RecurrenceRule.NONE &&
    // Create a new RecurrenceExpenseLink only if one does not already exist for the expense
    existingExpense.recurringExpenseLink === null

  const newRecurringExpenseLink = createPayloadForNewRecurringExpenseLink(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    expenseFormValues.expenseDate,
    groupId,
  )

  const updatedRecurrenceExpenseLinkNextExpenseDate = calculateNextDate(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    existingExpense.expenseDate,
  )

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      expenseDate: expenseFormValues.expenseDate,
      amount: expenseFormValues.amount,
      title: isEncryptedExpense ? '' : expenseFormValues.title,
      categoryId: expenseFormValues.category,
      paidById: expenseFormValues.paidBy,
      splitMode: expenseFormValues.splitMode,
      recurrenceRule: expenseFormValues.recurrenceRule,
      paidFor: {
        create: expenseFormValues.paidFor
          .filter(
            (p) =>
              !existingExpense.paidFor.some(
                (pp) => pp.participantId === p.participant,
              ),
          )
          .map((paidFor) => ({
            participantId: paidFor.participant,
            shares: paidFor.shares,
          })),
        update: expenseFormValues.paidFor.map((paidFor) => ({
          where: {
            expenseId_participantId: {
              expenseId,
              participantId: paidFor.participant,
            },
          },
          data: {
            shares: paidFor.shares,
          },
        })),
        deleteMany: existingExpense.paidFor.filter(
          (paidFor) =>
            !expenseFormValues.paidFor.some(
              (pf) => pf.participant === paidFor.participantId,
            ),
        ),
      },
      recurringExpenseLink: {
        ...(isCreateRecurrenceExpenseLink
          ? {
              create: newRecurringExpenseLink,
            }
          : {}),
        ...(isUpdateRecurrenceExpenseLink
          ? {
              update: {
                nextExpenseDate: updatedRecurrenceExpenseLinkNextExpenseDate,
              },
            }
          : {}),
        delete: isDeleteRecurrenceExpenseLink,
      },
      isReimbursement: expenseFormValues.isReimbursement,
      documents: {
        connectOrCreate: expenseFormValues.documents.map((doc) => ({
          create: doc,
          where: { id: doc.id },
        })),
        deleteMany: existingExpense.documents
          .filter(
            (existingDoc) =>
              !expenseFormValues.documents.some(
                (doc) => doc.id === existingDoc.id,
              ),
          )
          .map((doc) => ({
            id: doc.id,
          })),
      },
      notes: isEncryptedExpense ? '' : expenseFormValues.notes,
      // E2EE fields
      encryptedData: expenseFormValues.encryptedData,
      encryptionIv: expenseFormValues.encryptionIv,
      // Comprehensive encryption fields (placeholders for now)
      encryptedCategory: null,
      categoryIv: null,
      encryptedShares: null,
      sharesIv: null,
      encryptionVersion: isComprehensivelyEncrypted ? 1 : null,
      encryptionFields: [],
    },
  })
}

export async function updateGroup(
  groupId: string,
  groupFormValues: GroupFormValues,
  participantId?: string,
) {
  const existingGroup = await getGroup(groupId)
  if (!existingGroup) throw new Error('Invalid group ID')

  await logActivity(groupId, ActivityType.UPDATE_GROUP, { participantId })

  const isComprehensivelyEncrypted =
    existingGroup.isEncrypted &&
    existingGroup.encryptionSalt &&
    groupFormValues.password

  // Prepare comprehensive encryption if enabled and password provided
  let encryptedGroupData = null
  let encryptedParticipantData: Awaited<
    ReturnType<typeof ComprehensiveEncryptionService.encryptParticipantData>
  > | null = null

  if (isComprehensivelyEncrypted) {
    // Encrypt group basic data
    encryptedGroupData =
      await ComprehensiveEncryptionService.encryptGroupBasicData(
        groupFormValues.name,
        groupFormValues.information || null,
        groupFormValues.password!,
        existingGroup.encryptionSalt!,
      )

    // Encrypt participant data for all participants (new and existing)
    encryptedParticipantData =
      await ComprehensiveEncryptionService.encryptParticipantData(
        groupFormValues.participants,
        groupFormValues.password!,
        existingGroup.encryptionSalt!,
      )
  }

  return prisma.group.update({
    where: { id: groupId },
    data: {
      name: isComprehensivelyEncrypted ? '' : groupFormValues.name,
      information: isComprehensivelyEncrypted
        ? ''
        : groupFormValues.information || null,
      currency: groupFormValues.currency,
      // Update comprehensive encryption fields if encrypted
      ...(isComprehensivelyEncrypted && encryptedGroupData
        ? {
            encryptedName: encryptedGroupData.encryptedName,
            nameIv: encryptedGroupData.nameIv,
            encryptedInformation: encryptedGroupData.encryptedInformation,
            informationIv: encryptedGroupData.informationIv,
            encryptionVersion: encryptedGroupData.encryptionVersion,
            encryptionFields: encryptedGroupData.encryptionFields,
          }
        : {}),
      participants: {
        deleteMany: existingGroup.participants.filter(
          (p) => !groupFormValues.participants.some((p2) => p2.id === p.id),
        ),
        updateMany: groupFormValues.participants
          .filter((participant) => participant.id !== undefined)
          .map((participant, index) => {
            const encryptedParticipant = encryptedParticipantData?.[index]
            return {
              where: { id: participant.id },
              data: {
                name: isComprehensivelyEncrypted ? '' : participant.name,
                // Update comprehensive encryption fields for participants
                ...(isComprehensivelyEncrypted && encryptedParticipant
                  ? {
                      encryptedName: encryptedParticipant.encryptedName,
                      nameIv: encryptedParticipant.nameIv,
                      encryptionVersion: encryptedParticipant.encryptionVersion,
                    }
                  : {}),
              },
            }
          }),
        createMany: {
          data: groupFormValues.participants
            .filter((participant) => participant.id === undefined)
            .map((participant) => {
              // Find the encrypted data for new participants
              const participantIndex =
                groupFormValues.participants.indexOf(participant)
              const encryptedParticipant =
                encryptedParticipantData?.[participantIndex]

              return {
                id: randomId(),
                name: isComprehensivelyEncrypted ? '' : participant.name,
                // Comprehensive encryption fields for new participants
                encryptedName: encryptedParticipant?.encryptedName,
                nameIv: encryptedParticipant?.nameIv,
                encryptionVersion: encryptedParticipant?.encryptionVersion,
              }
            }),
        },
      },
    },
  })
}

export async function getGroup(groupId: string) {
  return prisma.group.findUnique({
    where: { id: groupId },
    include: { participants: true },
  })
}

export async function getCategories() {
  return prisma.category.findMany()
}

export async function getGroupExpenses(
  groupId: string,
  options?: { offset?: number; length?: number; filter?: string },
) {
  await createRecurringExpenses()

  return prisma.expense.findMany({
    select: {
      amount: true,
      category: true,
      createdAt: true,
      expenseDate: true,
      id: true,
      isReimbursement: true,
      paidBy: { select: { id: true, name: true } },
      paidFor: {
        select: {
          participant: { select: { id: true, name: true } },
          shares: true,
        },
      },
      splitMode: true,
      recurrenceRule: true,
      title: true,
      // E2EE fields
      encryptedData: true,
      encryptionIv: true,
      _count: { select: { documents: true } },
    },
    where: {
      groupId,
      title: options?.filter
        ? { contains: options.filter, mode: 'insensitive' }
        : undefined,
    },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    skip: options && options.offset,
    take: options && options.length,
  })
}

export async function getGroupExpenseCount(groupId: string) {
  return prisma.expense.count({ where: { groupId } })
}

export async function getExpense(groupId: string, expenseId: string) {
  return prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      paidBy: true,
      paidFor: true,
      category: true,
      documents: true,
      recurringExpenseLink: true,
    },
  })
}

export async function getActivities(
  groupId: string,
  options?: { offset?: number; length?: number },
) {
  const activities = await prisma.activity.findMany({
    where: { groupId },
    orderBy: [{ time: 'desc' }],
    skip: options?.offset,
    take: options?.length,
  })

  const expenseIds = activities
    .map((activity) => activity.expenseId)
    .filter(Boolean)
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      id: { in: expenseIds },
    },
    include: {
      paidBy: true,
      paidFor: {
        include: {
          participant: true,
        },
      },
    },
  })

  return activities.map((activity) => ({
    ...activity,
    expense:
      activity.expenseId !== null
        ? expenses.find((expense) => expense.id === activity.expenseId)
        : undefined,
  }))
}

export async function logActivity(
  groupId: string,
  activityType: ActivityType,
  extra?: { participantId?: string; expenseId?: string; data?: string },
) {
  // Check if group has comprehensive encryption enabled
  const group = await getGroup(groupId)
  const isComprehensivelyEncrypted = group?.isEncrypted && group?.encryptionSalt

  let encryptedActivityData: Awaited<
    ReturnType<typeof ComprehensiveEncryptionService.encryptActivityData>
  > | null = null
  let activityData = extra?.data || null

  if (isComprehensivelyEncrypted && activityData && group?.encryptionSalt) {
    // Note: In a real implementation, password should be available from session/context
    // For now, we'll skip encryption if password is not available
    // This would need to be handled at the API layer with proper session management
    try {
      // This is a placeholder - actual password retrieval would be implemented
      // encryptedActivityData = await ComprehensiveEncryptionService.encryptActivityData(
      //   activityData,
      //   password,
      //   group.encryptionSalt
      // )
      // activityData = '' // Clear plaintext when encrypted
    } catch (error) {
      console.warn('Activity encryption failed, storing as plaintext:', error)
    }
  }

  return prisma.activity.create({
    data: {
      id: randomId(),
      groupId,
      activityType,
      participantId: extra?.participantId,
      expenseId: extra?.expenseId,
      data: activityData,
      // Comprehensive encryption fields (conditionally set)
      ...(encryptedActivityData
        ? {
            encryptedData: encryptedActivityData.encryptedData || undefined,
            dataIv: encryptedActivityData.dataIv || undefined,
            encryptionVersion:
              encryptedActivityData.encryptionVersion || undefined,
          }
        : {}),
    },
  })
}

async function createRecurringExpenses() {
  const localDate = new Date() // Current local date
  const utcDateFromLocal = new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      // More precision beyond date is required to ensure that recurring Expenses are created within <most precises unit> of when expected
      localDate.getUTCHours(),
      localDate.getUTCMinutes(),
    ),
  )

  const recurringExpenseLinksWithExpensesToCreate =
    await prisma.recurringExpenseLink.findMany({
      where: {
        nextExpenseCreatedAt: null,
        nextExpenseDate: {
          lte: utcDateFromLocal,
        },
      },
      include: {
        currentFrameExpense: {
          include: {
            paidBy: true,
            paidFor: true,
            category: true,
            documents: true,
          },
        },
      },
    })

  for (const recurringExpenseLink of recurringExpenseLinksWithExpensesToCreate) {
    let newExpenseDate = recurringExpenseLink.nextExpenseDate

    let currentExpenseRecord = recurringExpenseLink.currentFrameExpense
    let currentReccuringExpenseLinkId = recurringExpenseLink.id

    while (newExpenseDate < utcDateFromLocal) {
      const newExpenseId = randomId()
      const newRecurringExpenseLinkId = randomId()

      const newRecurringExpenseNextExpenseDate = calculateNextDate(
        currentExpenseRecord.recurrenceRule as RecurrenceRule,
        newExpenseDate,
      )

      const {
        category,
        paidBy,
        paidFor,
        documents,
        ...destructeredCurrentExpenseRecord
      } = currentExpenseRecord

      // Use a transacton to ensure that the only one expense is created for the RecurringExpenseLink
      // just in case two clients are processing the same RecurringExpenseLink at the same time
      const newExpense = await prisma
        .$transaction(async (transaction) => {
          const newExpense = await transaction.expense.create({
            data: {
              ...destructeredCurrentExpenseRecord,
              categoryId: currentExpenseRecord.categoryId,
              paidById: currentExpenseRecord.paidById,
              paidFor: {
                createMany: {
                  data: currentExpenseRecord.paidFor.map((paidFor) => ({
                    participantId: paidFor.participantId,
                    shares: paidFor.shares,
                  })),
                },
              },
              documents: {
                connect: currentExpenseRecord.documents.map(
                  (documentRecord) => ({
                    id: documentRecord.id,
                  }),
                ),
              },
              id: newExpenseId,
              expenseDate: newExpenseDate,
              recurringExpenseLink: {
                create: {
                  groupId: currentExpenseRecord.groupId,
                  id: newRecurringExpenseLinkId,
                  nextExpenseDate: newRecurringExpenseNextExpenseDate,
                },
              },
            },
            // Ensure that the same information is available on the returned record that was created
            include: {
              paidFor: true,
              documents: true,
              category: true,
              paidBy: true,
            },
          })

          // Mark the RecurringExpenseLink as being "completed" since the new Expense was created
          // if an expense hasn't been created for this RecurringExpenseLink yet
          await transaction.recurringExpenseLink.update({
            where: {
              id: currentReccuringExpenseLinkId,
              nextExpenseCreatedAt: null,
            },
            data: {
              nextExpenseCreatedAt: newExpense.createdAt,
            },
          })

          return newExpense
        })
        .catch(() => {
          console.error(
            'Failed to created recurringExpense for expenseId: %s',
            currentExpenseRecord.id,
          )
          return null
        })

      // If the new expense failed to be created, break out of the while-loop
      if (newExpense === null) break

      // Set the values for the next iteration of the for-loop in case multiple recurring Expenses need to be created
      currentExpenseRecord = newExpense
      currentReccuringExpenseLinkId = newRecurringExpenseLinkId
      newExpenseDate = newRecurringExpenseNextExpenseDate
    }
  }
}

function createPayloadForNewRecurringExpenseLink(
  recurrenceRule: RecurrenceRule,
  priorDateToNextRecurrence: Date,
  groupId: String,
): RecurringExpenseLink {
  const nextExpenseDate = calculateNextDate(
    recurrenceRule,
    priorDateToNextRecurrence,
  )

  const recurringExpenseLinkId = randomId()
  const recurringExpenseLinkPayload = {
    id: recurringExpenseLinkId,
    groupId: groupId,
    nextExpenseDate: nextExpenseDate,
  }

  return recurringExpenseLinkPayload as RecurringExpenseLink
}

// TODO: Modify this function to use a more comprehensive recurrence Rule library like rrule (https://github.com/jkbrzt/rrule)
//
// Current limitations:
// - If a date is intended to be repeated monthly on the 29th, 30th or 31st, it will change to repeating on the smallest
// date that the reccurence has encountered. Ex. If a recurrence is created for Jan 31st on 2025, the recurring expense
// will be created for Feb 28th, March 28, etc. until it is cancelled or fixed
function calculateNextDate(
  recurrenceRule: RecurrenceRule,
  priorDateToNextRecurrence: Date,
): Date {
  const nextDate = new Date(priorDateToNextRecurrence)
  switch (recurrenceRule) {
    case RecurrenceRule.DAILY:
      nextDate.setUTCDate(nextDate.getUTCDate() + 1)
      break
    case RecurrenceRule.WEEKLY:
      nextDate.setUTCDate(nextDate.getUTCDate() + 7)
      break
    case RecurrenceRule.MONTHLY:
      const nextYear = nextDate.getUTCFullYear()
      const nextMonth = nextDate.getUTCMonth() + 1
      let nextDay = nextDate.getUTCDate()

      // Reduce the next day until it is within the direct next month
      while (!isDateInNextMonth(nextYear, nextMonth, nextDay)) {
        nextDay -= 1
      }
      nextDate.setUTCMonth(nextMonth, nextDay)
      break
  }

  return nextDate
}

function isDateInNextMonth(
  utcYear: number,
  utcMonth: number,
  utcDate: number,
): Boolean {
  const testDate = new Date(Date.UTC(utcYear, utcMonth, utcDate))

  // We're not concerned if the year or month changes. We only want to make sure that the date is our target date
  if (testDate.getUTCDate() !== utcDate) {
    return false
  }

  return true
}

export async function deleteGroup(groupId: string): Promise<void> {
  // Verify that the group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      participants: true,
      expenses: {
        include: {
          paidFor: true,
          documents: true,
        },
      },
    },
  })

  if (!group) {
    throw new Error('Group not found')
  }

  // Delete all related data in the correct order to avoid foreign key constraints
  await prisma.$transaction(async (tx) => {
    const expenseIds = group.expenses.map((e) => e.id)

    // Delete all expense documents in a single call
    if (expenseIds.length > 0) {
      await tx.expenseDocument.deleteMany({
        where: { expenseId: { in: expenseIds } },
      })
    }

    // Delete expense paid-for relationships
    await tx.expensePaidFor.deleteMany({
      where: { expenseId: { in: expenseIds } },
    })

    // Delete expenses
    await tx.expense.deleteMany({
      where: { groupId },
    })

    // Delete activities
    await tx.activity.deleteMany({
      where: { groupId },
    })

    // Delete participants
    await tx.participant.deleteMany({
      where: { groupId },
    })

    // Finally, delete the group itself
    await tx.group.delete({
      where: { id: groupId },
    })
  })
}
