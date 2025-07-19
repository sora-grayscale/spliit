/**
 * Encrypted statistics service for comprehensive encryption of statistics data
 */

import { randomId } from './api'
import { ComprehensiveEncryptionService } from './comprehensive-encryption'
import { isGroupStatsData, isParticipantStatsData } from './type-guards'
import type { SafeGroupStatsData, SafeParticipantStatsData } from './type-guards'
import { prisma } from './prisma'

export interface GroupStatsData extends Record<string, unknown> {
  totalExpenses: number
  totalParticipants: number
  averageExpenseAmount: number
  categoryBreakdown: Record<string, number>
  monthlyTrends: Array<{
    month: string
    amount: number
    count: number
  }>
  topSpenders: Array<{
    participantId: string
    amount: number
  }>
}

export interface ParticipantStatsData extends Record<string, unknown> {
  totalPaid: number
  totalOwed: number
  balance: number
  expenseCount: number
  averageExpense: number
  categoryPreferences: Record<string, number>
}

/**
 * Service for managing encrypted statistics data
 */
export class EncryptedStatsService {
  /**
   * Store encrypted group statistics
   */
  static async storeGroupStats(
    groupId: string,
    statsData: GroupStatsData,
    password: string,
    salt: string,
  ): Promise<void> {
    const encryptedData = await ComprehensiveEncryptionService.encryptStatsData(
      statsData,
      'group_stats',
      password,
      salt,
    )

    await prisma.encryptedStats.upsert({
      where: {
        groupId_statsType: {
          groupId,
          statsType: 'group_stats',
        },
      },
      create: {
        id: randomId(),
        groupId,
        statsType: 'group_stats',
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
   * Retrieve encrypted group statistics
   */
  static async getGroupStats(
    groupId: string,
    password: string,
    salt: string,
  ): Promise<GroupStatsData | null> {
    const encryptedStats = await prisma.encryptedStats.findFirst({
      where: {
        groupId,
        statsType: 'group_stats',
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

    // SECURITY FIX: Safe type validation instead of dangerous casting
    if (!isGroupStatsData(decryptedData)) {
      throw new Error('Invalid group stats data structure after decryption')
    }
    return decryptedData as unknown as GroupStatsData
  }

  /**
   * Store encrypted participant statistics
   */
  static async storeParticipantStats(
    groupId: string,
    participantId: string,
    statsData: ParticipantStatsData,
    password: string,
    salt: string,
  ): Promise<void> {
    const statsType = `participant_stats_${participantId}`

    const encryptedData = await ComprehensiveEncryptionService.encryptStatsData(
      statsData,
      statsType,
      password,
      salt,
    )

    await prisma.encryptedStats.upsert({
      where: {
        groupId_statsType: {
          groupId,
          statsType,
        },
      },
      create: {
        id: randomId(),
        groupId,
        statsType,
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
   * Retrieve encrypted participant statistics
   */
  static async getParticipantStats(
    groupId: string,
    participantId: string,
    password: string,
    salt: string,
  ): Promise<ParticipantStatsData | null> {
    const statsType = `participant_stats_${participantId}`

    const encryptedStats = await prisma.encryptedStats.findFirst({
      where: {
        groupId,
        statsType,
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

    // SECURITY FIX: Safe type validation instead of dangerous casting
    if (!isParticipantStatsData(decryptedData)) {
      throw new Error('Invalid participant stats data structure after decryption')
    }
    return decryptedData as unknown as ParticipantStatsData
  }

  /**
   * Store category statistics
   */
  static async storeCategoryStats(
    groupId: string,
    categoryStats: Record<string, { count: number; totalAmount: number }>,
    password: string,
    salt: string,
  ): Promise<void> {
    const encryptedData = await ComprehensiveEncryptionService.encryptStatsData(
      categoryStats,
      'category_stats',
      password,
      salt,
    )

    await prisma.encryptedStats.upsert({
      where: {
        groupId_statsType: {
          groupId,
          statsType: 'category_stats',
        },
      },
      create: {
        id: randomId(),
        groupId,
        statsType: 'category_stats',
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
   * Get category statistics
   */
  static async getCategoryStats(
    groupId: string,
    password: string,
    salt: string,
  ): Promise<Record<string, { count: number; totalAmount: number }>> {
    const encryptedStats = await prisma.encryptedStats.findFirst({
      where: {
        groupId,
        statsType: 'category_stats',
      },
    })

    if (!encryptedStats) {
      return {}
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

    return decryptedData as Record<
      string,
      { count: number; totalAmount: number }
    >
  }
}
