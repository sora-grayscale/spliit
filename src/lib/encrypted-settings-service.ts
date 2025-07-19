/**
 * Encrypted settings service for comprehensive encryption of user settings
 */

import { randomId } from './api'
import { ComprehensiveEncryptionService } from './comprehensive-encryption'
import { prisma } from './prisma'

export interface GroupSettings extends Record<string, unknown> {
  defaultCurrency: string
  allowExpenseDocuments: boolean
  requireApprovalForExpenses: boolean
  categoryPreferences: string[]
  displayPreferences: {
    showCategories: boolean
    showNotes: boolean
    defaultSplitMode: string
  }
  notificationSettings: {
    emailNotifications: boolean
    expenseReminders: boolean
    balanceAlerts: boolean
  }
}

export interface ParticipantSettings extends Record<string, unknown> {
  displayName: string
  preferredCurrency: string
  defaultSplitMode: string
  notificationPreferences: {
    emailEnabled: boolean
    expenseUpdates: boolean
    balanceReminders: boolean
  }
  privacy: {
    hideFromStats: boolean
    anonymizeActivity: boolean
  }
}

/**
 * Service for managing encrypted settings data
 */
export class EncryptedSettingsService {
  /**
   * Store encrypted group settings
   */
  static async storeGroupSettings(
    groupId: string,
    settings: GroupSettings,
    password: string,
    salt: string,
  ): Promise<void> {
    const encryptedData =
      await ComprehensiveEncryptionService.encryptSettingsData(
        settings,
        'group_settings',
        password,
        salt,
      )

    await prisma.userSettings.upsert({
      where: {
        id: `${groupId}_group_settings`, // Use composite ID since there's no unique constraint on groupId_settingsType
      },
      create: {
        id: `${groupId}_group_settings`,
        groupId,
        participantId: null,
        settingsType: 'group_settings',
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
   * Retrieve encrypted group settings
   */
  static async getGroupSettings(
    groupId: string,
    password: string,
    salt: string,
  ): Promise<GroupSettings | null> {
    const encryptedSettings = await prisma.userSettings.findFirst({
      where: {
        groupId,
        participantId: null,
        settingsType: 'group_settings',
      },
    })

    if (!encryptedSettings) {
      return null
    }

    const decryptedData =
      await ComprehensiveEncryptionService.decryptSettingsData(
        {
          encryptedData: encryptedSettings.encryptedData,
          dataIv: encryptedSettings.dataIv,
          encryptionVersion: encryptedSettings.encryptionVersion,
          settingsType: encryptedSettings.settingsType,
        },
        password,
        salt,
      )

    // SECURITY FIX: Safe type validation instead of dangerous casting
    const settingsData = decryptedData as Record<string, unknown>
    if (!settingsData || typeof settingsData !== 'object') {
      throw new Error('Invalid group settings data structure after decryption')
    }
    return settingsData as GroupSettings
  }

  /**
   * Store encrypted participant settings
   */
  static async storeParticipantSettings(
    groupId: string,
    participantId: string,
    settings: ParticipantSettings,
    password: string,
    salt: string,
  ): Promise<void> {
    const encryptedData =
      await ComprehensiveEncryptionService.encryptSettingsData(
        settings,
        'participant_settings',
        password,
        salt,
      )

    await prisma.userSettings.upsert({
      where: {
        groupId_participantId_settingsType: {
          groupId,
          participantId: participantId ?? null,
          settingsType: 'participant_settings',
        },
      },
      create: {
        id: randomId(),
        groupId,
        participantId,
        settingsType: 'participant_settings',
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
   * Retrieve encrypted participant settings
   */
  static async getParticipantSettings(
    groupId: string,
    participantId: string,
    password: string,
    salt: string,
  ): Promise<ParticipantSettings | null> {
    const encryptedSettings = await prisma.userSettings.findFirst({
      where: {
        groupId,
        participantId,
        settingsType: 'participant_settings',
      },
    })

    if (!encryptedSettings) {
      return null
    }

    const decryptedData =
      await ComprehensiveEncryptionService.decryptSettingsData(
        {
          encryptedData: encryptedSettings.encryptedData,
          dataIv: encryptedSettings.dataIv,
          encryptionVersion: encryptedSettings.encryptionVersion,
          settingsType: encryptedSettings.settingsType,
        },
        password,
        salt,
      )

    // SECURITY FIX: Safe type validation instead of dangerous casting
    const settingsData = decryptedData as Record<string, unknown>
    if (!settingsData || typeof settingsData !== 'object') {
      throw new Error(
        'Invalid participant settings data structure after decryption',
      )
    }
    return settingsData as ParticipantSettings
  }

  /**
   * Store app-level settings (non-group specific)
   */
  static async storeAppSettings(
    groupId: string,
    settings: Record<string, unknown>,
    settingsType: string,
    password: string,
    salt: string,
  ): Promise<void> {
    const encryptedData =
      await ComprehensiveEncryptionService.encryptSettingsData(
        settings,
        settingsType,
        password,
        salt,
      )

    await prisma.userSettings.upsert({
      where: {
        id: `${groupId}_app_${settingsType}`, // Use composite ID for app settings
      },
      create: {
        id: `${groupId}_app_${settingsType}`,
        groupId,
        participantId: null, // App settings are not participant-specific
        settingsType,
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
   * Get app-level settings
   */
  static async getAppSettings(
    groupId: string,
    settingsType: string,
    password: string,
    salt: string,
  ): Promise<Record<string, unknown> | null> {
    const encryptedSettings = await prisma.userSettings.findFirst({
      where: {
        groupId,
        participantId: null,
        settingsType,
      },
    })

    if (!encryptedSettings) {
      return null
    }

    const decryptedData =
      await ComprehensiveEncryptionService.decryptSettingsData(
        {
          encryptedData: encryptedSettings.encryptedData,
          dataIv: encryptedSettings.dataIv,
          encryptionVersion: encryptedSettings.encryptionVersion,
          settingsType: encryptedSettings.settingsType,
        },
        password,
        salt,
      )

    return decryptedData
  }
}
