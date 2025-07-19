/**
 * Service for decrypting encrypted payment relationship data in expenses
 * CRITICAL: Handles paidFor data decryption for encrypted groups
 */

import { getGroup } from './api'
import { ComprehensiveEncryptionService } from './comprehensive-encryption'
import { PasswordSession } from './e2ee-crypto-refactored'

export interface DecryptedPaymentData {
  paidBy: {
    id: string
    name: string
  }
  paidFor: Array<{
    participant: {
      id: string
      name: string
    }
    shares: number
  }>
}

export interface EncryptedExpenseWithPayment {
  id: string
  paidBy: { id: string; name: string }
  paidFor: Array<{
    participant: { id: string; name: string }
    shares: number
  }>
  encryptedPaidBy?: string | null
  paidByIv?: string | null
  encryptedPaidFor?: string | null
  paidForIv?: string | null
  encryptionVersion?: number | null
}

/**
 * Decrypted Payment Service for encrypted groups
 */
export class DecryptedPaymentService {
  /**
   * Decrypt payment relationship data for an expense
   */
  static async decryptExpensePaymentData(
    expense: EncryptedExpenseWithPayment,
    groupId: string,
  ): Promise<DecryptedPaymentData | null> {
    // Check if this expense has encrypted payment data
    if (
      !expense.encryptedPaidBy ||
      !expense.encryptedPaidFor ||
      !expense.paidByIv ||
      !expense.paidForIv
    ) {
      // Return existing data if not encrypted
      return {
        paidBy: expense.paidBy,
        paidFor: expense.paidFor,
      }
    }

    // Get group information
    const group = await getGroup(groupId)
    if (!group || !group.isEncrypted || !group.encryptionSalt) {
      return null
    }

    // Get password for decryption
    const password = PasswordSession.getPassword(groupId)
    if (!password) {
      // Return fallback data structure if no password
      return {
        paidBy: expense.paidBy.id
          ? expense.paidBy
          : { id: 'unknown', name: 'Encrypted User' },
        paidFor:
          expense.paidFor.length > 0
            ? expense.paidFor
            : [
                {
                  participant: {
                    id: 'unknown',
                    name: 'Encrypted Participants',
                  },
                  shares: 1,
                },
              ],
      }
    }

    try {
      // Decrypt payment relationship data
      const decryptedPayment =
        await ComprehensiveEncryptionService.decryptPaymentRelationshipData(
          {
            encryptedPaidBy: expense.encryptedPaidBy,
            paidByIv: expense.paidByIv,
            encryptedPaidFor: expense.encryptedPaidFor,
            paidForIv: expense.paidForIv,
            encryptionVersion: expense.encryptionVersion || 1,
          },
          password,
          group.encryptionSalt,
        )

      // Map participant IDs to participant objects from the group
      const participantMap = new Map(group.participants.map((p) => [p.id, p]))

      const paidByParticipant = participantMap.get(decryptedPayment.paidById)
      if (!paidByParticipant) {
        throw new Error(
          `PaidBy participant not found: ${decryptedPayment.paidById}`,
        )
      }

      const paidForMapped = decryptedPayment.paidFor.map((pf) => {
        const participant = participantMap.get(pf.participantId)
        if (!participant) {
          throw new Error(`PaidFor participant not found: ${pf.participantId}`)
        }
        return {
          participant: {
            id: participant.id,
            name: participant.name,
          },
          shares: pf.shares,
        }
      })

      return {
        paidBy: {
          id: paidByParticipant.id,
          name: paidByParticipant.name,
        },
        paidFor: paidForMapped,
      }
    } catch (error) {
      console.warn(
        'Failed to decrypt payment data for expense:',
        expense.id,
        error,
      )

      // Return fallback data structure
      return {
        paidBy: expense.paidBy.id
          ? expense.paidBy
          : { id: 'unknown', name: 'Encrypted User' },
        paidFor:
          expense.paidFor.length > 0
            ? expense.paidFor
            : [
                {
                  participant: {
                    id: 'unknown',
                    name: 'Encrypted Participants',
                  },
                  shares: 1,
                },
              ],
      }
    }
  }

  /**
   * Decrypt payment data for multiple expenses
   */
  static async decryptMultipleExpensePaymentData(
    expenses: EncryptedExpenseWithPayment[],
    groupId: string,
  ): Promise<(DecryptedPaymentData | null)[]> {
    const results: (DecryptedPaymentData | null)[] = []

    for (const expense of expenses) {
      try {
        const decryptedData = await this.decryptExpensePaymentData(
          expense,
          groupId,
        )
        results.push(decryptedData)
      } catch (error) {
        console.warn(
          'Failed to decrypt payment data for expense:',
          expense.id,
          error,
        )
        results.push(null)
      }
    }

    return results
  }

  /**
   * Check if expense has encrypted payment data
   */
  static hasEncryptedPaymentData(
    expense: EncryptedExpenseWithPayment,
  ): boolean {
    return !!(
      expense.encryptedPaidBy &&
      expense.encryptedPaidFor &&
      expense.paidByIv &&
      expense.paidForIv
    )
  }

  /**
   * Get fallback payment data for encrypted expenses without password
   */
  static getFallbackPaymentData(): DecryptedPaymentData {
    return {
      paidBy: { id: 'encrypted', name: 'Encrypted User' },
      paidFor: [
        {
          participant: { id: 'encrypted', name: 'Encrypted Participants' },
          shares: 1,
        },
      ],
    }
  }
}
