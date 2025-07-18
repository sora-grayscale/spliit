/**
 * Encrypted balance service for comprehensive encryption of balance information
 */

import { randomId } from './api'
import { Balances, Reimbursement } from './balances'
import { ComprehensiveEncryptionService } from './comprehensive-encryption'
import { prisma } from './prisma'

export interface EncryptedBalanceData extends Record<string, unknown> {
  balances: Balances
  reimbursements: Reimbursement[]
  totalExpenses: number
  participantTotals: Record<string, number>
}

/**
 * Service for managing encrypted balance information
 */
export class EncryptedBalanceService {
  /**
   * Store encrypted balance data
   */
  static async storeEncryptedBalances(
    groupId: string,
    balanceData: EncryptedBalanceData,
    password: string,
    salt: string,
  ): Promise<void> {
    const encryptedData = await ComprehensiveEncryptionService.encryptStatsData(
      balanceData,
      'balances',
      password,
      salt,
    )

    await prisma.encryptedStats.upsert({
      where: {
        groupId_statsType: {
          groupId,
          statsType: 'balances',
        },
      },
      create: {
        id: randomId(),
        groupId,
        statsType: 'balances',
        encryptedData: encryptedData.encryptedData,
        dataIv: encryptedData.dataIv,
        encryptionVersion: encryptedData.encryptionVersion,
      },
      update: {
        encryptedData: encryptedData.encryptedData,
        dataIv: encryptedData.dataIv,
        encryptionVersion: encryptedData.encryptionVersion,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Retrieve encrypted balance data
   */
  static async getEncryptedBalances(
    groupId: string,
    password: string,
    salt: string,
  ): Promise<EncryptedBalanceData | null> {
    const encryptedStats = await prisma.encryptedStats.findFirst({
      where: {
        groupId,
        statsType: 'balances',
      },
    })

    if (!encryptedStats) {
      return null
    }

    const decryptedData = await ComprehensiveEncryptionService.decryptStatsData(
      {
        encryptedData: encryptedStats.encryptedData,
        dataIv: encryptedStats.dataIv,
        encryptionVersion: encryptedStats.encryptionVersion,
        statsType: encryptedStats.statsType,
      },
      password,
      salt,
    )

    return decryptedData as unknown as EncryptedBalanceData
  }

  /**
   * Store encrypted reimbursement data
   */
  static async storeEncryptedReimbursements(
    groupId: string,
    reimbursements: Reimbursement[],
    password: string,
    salt: string,
  ): Promise<void> {
    const encryptedData = await ComprehensiveEncryptionService.encryptStatsData(
      { reimbursements },
      'reimbursements',
      password,
      salt,
    )

    await prisma.encryptedStats.upsert({
      where: {
        groupId_statsType: {
          groupId,
          statsType: 'reimbursements',
        },
      },
      create: {
        id: randomId(),
        groupId,
        statsType: 'reimbursements',
        encryptedData: encryptedData.encryptedData,
        dataIv: encryptedData.dataIv,
        encryptionVersion: encryptedData.encryptionVersion,
      },
      update: {
        encryptedData: encryptedData.encryptedData,
        dataIv: encryptedData.dataIv,
        encryptionVersion: encryptedData.encryptionVersion,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Get encrypted reimbursements
   */
  static async getEncryptedReimbursements(
    groupId: string,
    password: string,
    salt: string,
  ): Promise<Reimbursement[]> {
    const encryptedStats = await prisma.encryptedStats.findFirst({
      where: {
        groupId,
        statsType: 'reimbursements',
      },
    })

    if (!encryptedStats) {
      return []
    }

    const decryptedData = await ComprehensiveEncryptionService.decryptStatsData(
      {
        encryptedData: encryptedStats.encryptedData,
        dataIv: encryptedStats.dataIv,
        encryptionVersion: encryptedStats.encryptionVersion,
        statsType: encryptedStats.statsType,
      },
      password,
      salt,
    )

    return (decryptedData as { reimbursements: Reimbursement[] }).reimbursements
  }
}
