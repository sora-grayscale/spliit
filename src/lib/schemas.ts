import { RecurrenceRule, SplitMode } from '@prisma/client'
import * as z from 'zod'
import { SECURITY_CONSTANTS } from './security-constants'

export const groupFormSchema = z
  .object({
    name: z.string().min(2, 'min2').max(50, 'max50'),
    information: z.string().optional(),
    currency: z.string().min(1, 'min1').max(5, 'max5'),
    isEncrypted: z.boolean().default(false),
    password: z.string().optional(),
    passwordConfirm: z.string().optional(),
    encryptionSalt: z.string().optional(),
    testEncryptedData: z.string().optional(),
    testIv: z.string().optional(),
    participants: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(2, 'min2').max(50, 'max50'),
        }),
      )
      .min(1),
  })
  .superRefine(
    (
      { participants, isEncrypted, password, passwordConfirm, encryptionSalt },
      ctx,
    ) => {
      participants.forEach((participant, i) => {
        participants.slice(0, i).forEach((otherParticipant) => {
          if (otherParticipant.name === participant.name) {
            ctx.addIssue({
              code: 'custom',
              message: 'duplicateParticipantName',
              path: ['participants', i, 'name'],
            })
          }
        })
      })

      // Validate password requirement for encrypted groups
      // Only check password if encryption is enabled and no encryptionSalt exists (new group creation)
      // For existing groups (encryptionSalt exists), password validation is optional
      if (
        isEncrypted &&
        !encryptionSalt &&
        (!password || password.length < SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'passwordRequired',
          path: ['password'],
        })
      }

      // Validate password confirmation match
      if (
        isEncrypted &&
        !encryptionSalt &&
        password &&
        passwordConfirm &&
        password !== passwordConfirm
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'passwordConfirmMismatch',
          path: ['passwordConfirm'],
        })
      }
    },
  )

export type GroupFormValues = z.infer<typeof groupFormSchema>

export const expenseFormSchema = z
  .object({
    expenseDate: z.coerce.date(),
    title: z.string({ required_error: 'titleRequired' }).min(2, 'min2'),
    category: z.coerce.number().default(0),
    amount: z
      .union(
        [
          z.number(),
          z.string().transform((value, ctx) => {
            const valueAsNumber = Number(value)
            if (Number.isNaN(valueAsNumber))
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'invalidNumber',
              })
            return Math.round(valueAsNumber * 100)
          }),
        ],
        { required_error: 'amountRequired' },
      )
      .refine((amount) => amount != 0, 'amountNotZero')
      .refine((amount) => amount <= 10_000_000_00, 'amountTenMillion'),
    paidBy: z.string({ required_error: 'paidByRequired' }),
    paidFor: z
      .array(
        z.object({
          participant: z.string(),
          shares: z.union([
            z.number(),
            z.string().transform((value, ctx) => {
              const normalizedValue = value.replace(/,/g, '.')
              const valueAsNumber = Number(normalizedValue)
              if (Number.isNaN(valueAsNumber))
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'invalidNumber',
                })
              return Math.round(valueAsNumber * 100)
            }),
          ]),
        }),
      )
      .min(1, 'paidForMin1')
      .superRefine((paidFor, ctx) => {
        let sum = 0
        for (const { shares } of paidFor) {
          sum += shares
          if (shares < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'noZeroShares',
            })
          }
        }
      }),
    splitMode: z
      .enum<SplitMode, [SplitMode, ...SplitMode[]]>(
        Object.values(SplitMode) as any,
      )
      .default('EVENLY'),
    saveDefaultSplittingOptions: z.boolean(),
    isReimbursement: z.boolean(),
    documents: z
      .array(
        z.object({
          id: z.string(),
          url: z.string().url(),
          width: z.number().int().min(1),
          height: z.number().int().min(1),
        }),
      )
      .default([]),
    notes: z.string().optional(),
    recurrenceRule: z
      .enum<RecurrenceRule, [RecurrenceRule, ...RecurrenceRule[]]>(
        Object.values(RecurrenceRule) as any,
      )
      .default('NONE'),
    // E2EE fields for encrypted expenses
    encryptedData: z.string().optional(),
    encryptionIv: z.string().optional(),
  })
  .superRefine((expense, ctx) => {
    let sum = 0
    for (const { shares } of expense.paidFor) {
      sum +=
        typeof shares === 'number' ? shares : Math.round(Number(shares) * 100)
    }
    switch (expense.splitMode) {
      case 'EVENLY':
        break // noop
      case 'BY_SHARES':
        break // noop
      case 'BY_AMOUNT': {
        if (sum !== expense.amount) {
          const detail =
            sum < expense.amount
              ? `${((expense.amount - sum) / 100).toFixed(2)} missing`
              : `${((sum - expense.amount) / 100).toFixed(2)} surplus`
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'amountSum',
            path: ['paidFor'],
          })
        }
        break
      }
      case 'BY_PERCENTAGE': {
        if (sum !== 10000) {
          const detail =
            sum < 10000
              ? `${((10000 - sum) / 100).toFixed(0)}% missing`
              : `${((sum - 10000) / 100).toFixed(0)}% surplus`
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'percentageSum',
            path: ['paidFor'],
          })
        }
        break
      }
    }
  })

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

export type SplittingOptions = {
  // Used for saving default splitting options in localStorage
  splitMode: SplitMode
  paidFor: ExpenseFormValues['paidFor'] | null
}
