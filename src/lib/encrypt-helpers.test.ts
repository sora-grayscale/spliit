/**
 * @jest-environment jsdom
 */

import {
  encryptGroupFormValues,
  decryptGroup,
  encryptExpenseFormValues,
  decryptExpense,
  decryptExpenses,
  looksEncrypted,
} from './encrypt-helpers'
import { generateMasterKey, keyToBase64, base64ToKey, encrypt } from './crypto'

describe('encrypt-helpers', () => {
  describe('looksEncrypted', () => {
    it('should return true for encrypted-looking data', () => {
      expect(looksEncrypted('abcdefghijklmnopqrstuvwxyz')).toBe(true)
      expect(looksEncrypted('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(true)
      expect(looksEncrypted('0123456789-_ABCDEFabcdef')).toBe(true)
    })

    it('should return false for short strings', () => {
      expect(looksEncrypted('short')).toBe(false)
      expect(looksEncrypted('')).toBe(false)
    })

    it('should return false for strings with invalid characters', () => {
      expect(looksEncrypted('this has spaces and is long enough')).toBe(false)
      expect(looksEncrypted('has+plus+signs+and+is+long')).toBe(false)
    })

    it('should return true for actual encrypted data', async () => {
      const key = generateMasterKey()
      const encrypted = await encrypt('test data', key)
      expect(looksEncrypted(encrypted)).toBe(true)
    })
  })

  describe('encryptGroupFormValues and decryptGroup', () => {
    it('should encrypt and decrypt group form values', async () => {
      const key = generateMasterKey()
      const groupFormValues = {
        name: 'Test Group',
        information: 'Some information about the group',
        currency: '$',
        currencyCode: 'USD',
        participants: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ],
      }

      const encrypted = await encryptGroupFormValues(groupFormValues, key)

      // Check that values are encrypted (not readable)
      expect(encrypted.name).not.toBe(groupFormValues.name)
      expect(encrypted.information).not.toBe(groupFormValues.information)
      expect(encrypted.participants[0].name).not.toBe('Alice')
      expect(encrypted.participants[1].name).not.toBe('Bob')

      // Check that non-sensitive values are preserved
      expect(encrypted.currency).toBe(groupFormValues.currency)
      expect(encrypted.currencyCode).toBe(groupFormValues.currencyCode)

      // Decrypt and verify
      const groupData = {
        id: 'test-id',
        ...encrypted,
        information: encrypted.information || null,
        currencyCode: encrypted.currencyCode || null,
        participants: encrypted.participants.map((p, i) => ({
          id: p.id || `${i + 1}`,
          name: p.name,
        })),
      }

      const decrypted = await decryptGroup(groupData, key)

      expect(decrypted.name).toBe(groupFormValues.name)
      expect(decrypted.information).toBe(groupFormValues.information)
      expect(decrypted.participants[0].name).toBe('Alice')
      expect(decrypted.participants[1].name).toBe('Bob')
    })

    it('should handle group without information', async () => {
      const key = generateMasterKey()
      const groupFormValues = {
        name: 'Minimal Group',
        currency: '€',
        currencyCode: 'EUR',
        participants: [{ name: 'Solo' }],
      }

      const encrypted = await encryptGroupFormValues(groupFormValues, key)
      expect(encrypted.information).toBeUndefined()

      const groupData = {
        id: 'test-id',
        name: encrypted.name,
        information: null,
        currency: encrypted.currency,
        currencyCode: encrypted.currencyCode || null,
        participants: encrypted.participants.map((p, i) => ({
          id: `${i + 1}`,
          name: p.name,
        })),
      }

      const decrypted = await decryptGroup(groupData, key)
      expect(decrypted.name).toBe('Minimal Group')
      expect(decrypted.information).toBeNull()
    })
  })

  describe('encryptExpenseFormValues and decryptExpense', () => {
    it('should encrypt and decrypt expense form values', async () => {
      const key = generateMasterKey()
      // Use minimal type that matches what encryptExpenseFormValues expects
      const expenseFormValues = {
        title: 'Dinner',
        notes: 'Great restaurant',
        amount: 50,
        expenseDate: new Date('2024-01-15'),
        category: 1,
        splitMode: 'EVENLY' as const,
        paidFor: [] as { participant: string; shares: number }[],
        paidBy: '1',
        isReimbursement: false,
        documents: [] as { id: string; url: string; width: number; height: number }[],
        saveDefaultSplittingOptions: false,
        recurrenceRule: 'NONE' as const,
      }

      const encrypted = await encryptExpenseFormValues(expenseFormValues, key)

      // Check that sensitive values are encrypted
      expect(encrypted.title).not.toBe(expenseFormValues.title)
      expect(encrypted.notes).not.toBe(expenseFormValues.notes)
      expect(encrypted.amount).not.toBe(expenseFormValues.amount) // Amount is also encrypted

      // Check that non-sensitive values are preserved
      expect(encrypted.category).toBe(expenseFormValues.category)

      // Decrypt and verify (use type assertion since encrypted has different paidFor structure)
      const decrypted = await decryptExpense(encrypted as unknown as Parameters<typeof decryptExpense>[0], key)
      expect(decrypted.title).toBe('Dinner')
      expect(decrypted.notes).toBe('Great restaurant')
      expect(decrypted.amount).toBe(50)
    })

    it('should handle expense without notes', async () => {
      const key = generateMasterKey()
      const expenseFormValues = {
        title: 'Coffee',
        amount: 5,
        expenseDate: new Date('2024-01-15'),
        category: 1,
        splitMode: 'EVENLY' as const,
        paidFor: [] as { participant: string; shares: number }[],
        paidBy: '1',
        isReimbursement: false,
        documents: [] as { id: string; url: string; width: number; height: number }[],
        saveDefaultSplittingOptions: false,
        recurrenceRule: 'NONE' as const,
      }

      const encrypted = await encryptExpenseFormValues(expenseFormValues, key)
      expect(encrypted.notes).toBeUndefined()

      const decrypted = await decryptExpense(encrypted as unknown as Parameters<typeof decryptExpense>[0], key)
      expect(decrypted.title).toBe('Coffee')
      expect(decrypted.notes).toBeUndefined()
    })
  })

  describe('decryptExpenses', () => {
    it('should decrypt multiple expenses', async () => {
      const key = generateMasterKey()

      const expenses = [
        { title: await encrypt('Expense 1', key), notes: null, amount: 100 },
        { title: await encrypt('Expense 2', key), notes: await encrypt('Note', key), amount: 200 },
        { title: await encrypt('Expense 3', key), notes: undefined, amount: 300 },
      ]

      const decrypted = await decryptExpenses(expenses, key)

      expect(decrypted[0].title).toBe('Expense 1')
      expect(decrypted[1].title).toBe('Expense 2')
      expect(decrypted[1].notes).toBe('Note')
      expect(decrypted[2].title).toBe('Expense 3')
    })
  })

  describe('backward compatibility', () => {
    it('should handle unencrypted legacy data', async () => {
      const key = generateMasterKey()

      // Simulate unencrypted legacy expense
      const legacyExpense = {
        title: 'Plain text title',
        notes: 'Plain text notes',
        amount: 50,
      }

      const decrypted = await decryptExpense(legacyExpense, key)

      // Should return original data since decryption fails
      expect(decrypted.title).toBe('Plain text title')
      expect(decrypted.notes).toBe('Plain text notes')
      expect(decrypted.amount).toBe(50)
    })
  })
})
