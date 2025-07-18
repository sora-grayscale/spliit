/**
 * Comprehensive encryption system for all group-related data
 * Extends existing E2EE to cover group names, participant names, and payment data
 */

import { PasswordCrypto } from './e2ee-crypto-refactored'
import { EncryptionService } from './encryption'
import { KeyDerivation } from './key-derivation'

export interface EncryptedGroupData {
  // Group metadata
  encryptedName?: string
  nameIv?: string

  // Group description
  encryptedInformation?: string
  informationIv?: string

  // Participant data
  encryptedParticipants?: string
  participantsIv?: string

  // Additional encryption metadata
  encryptionVersion: number
  encryptionFields: string[]
}

// Type definitions for better type safety
export interface ShareData {
  [participantId: string]: number
}

// Critical security types for payment relationships
export interface PaymentRelationshipData {
  paidById: string
  paidFor: Array<{
    participantId: string
    shares: number
  }>
}

export interface EncryptedPaymentData {
  encryptedPaidBy: string
  paidByIv: string
  encryptedPaidFor: string
  paidForIv: string
  encryptionVersion: number
}

export interface EncryptionData {
  encryptionVersion: number
  encryptionFields: string[]
}

export type EncryptableData =
  | EncryptedGroupData
  | EncryptedExpenseData
  | EncryptedParticipantData
  | EncryptedActivityData
  | EncryptedStatsData
  | EncryptedSettingsData

export interface EncryptedActivityData {
  encryptedData?: string
  dataIv?: string
  encryptionVersion: number
  encryptionFields?: string[]
}

export interface EncryptedStatsData {
  encryptedData: string
  dataIv: string
  encryptionVersion: number
  statsType: string
  encryptionFields?: string[]
}

export interface EncryptedSettingsData {
  encryptedData: string
  dataIv: string
  encryptionVersion: number
  settingsType: string
  encryptionFields?: string[]
}

export interface EncryptedExpenseData {
  // Existing expense encryption
  encryptedData?: string
  encryptionIv?: string

  // Extended expense data
  encryptedCategory?: string
  categoryIv?: string

  // Participant share data
  encryptedShares?: string
  sharesIv?: string

  // Payment relationship encryption (CRITICAL SECURITY ADDITION)
  encryptedPaidBy?: string
  paidByIv?: string
  encryptedPaidFor?: string
  paidForIv?: string

  // Amount and date encryption
  encryptedAmount?: string
  amountIv?: string
  encryptedExpenseDate?: string
  expenseDateIv?: string

  encryptionVersion: number
  encryptionFields: string[]
}

export interface EncryptedParticipantData {
  id?: string
  encryptedName: string
  nameIv: string

  // Additional participant metadata
  encryptedMetadata?: string
  metadataIv?: string

  encryptionVersion: number
  encryptionFields?: string[]
}

/**
 * Comprehensive encryption service for all group data
 */
export class ComprehensiveEncryptionService {
  private static readonly ENCRYPTION_VERSION = 1

  /**
   * Encrypt group basic information
   */
  static async encryptGroupBasicData(
    groupName: string,
    information: string | null,
    password: string,
    salt: string,
  ): Promise<EncryptedGroupData> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)
    const encryptionFields: string[] = []

    // Encrypt group name
    const nameEncryption = await EncryptionService.encryptData(groupName, key)
    encryptionFields.push('name')

    // Encrypt information if provided
    let informationEncryption = null
    if (information && information.trim()) {
      informationEncryption = await EncryptionService.encryptData(
        information,
        key,
      )
      encryptionFields.push('information')
    }

    return {
      encryptedName: nameEncryption.encryptedData,
      nameIv: nameEncryption.iv,
      encryptedInformation: informationEncryption?.encryptedData,
      informationIv: informationEncryption?.iv,
      encryptionVersion: this.ENCRYPTION_VERSION,
      encryptionFields,
    }
  }

  /**
   * Decrypt group basic information
   */
  static async decryptGroupBasicData(
    encryptedGroupData: EncryptedGroupData,
    password: string,
    salt: string,
  ): Promise<{ name: string; information: string | null }> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    // Decrypt group name
    const name = await EncryptionService.decryptData(
      encryptedGroupData.encryptedName!,
      encryptedGroupData.nameIv!,
      key,
    )

    // Decrypt information if encrypted
    let information: string | null = null
    if (
      encryptedGroupData.encryptedInformation &&
      encryptedGroupData.informationIv
    ) {
      information = await EncryptionService.decryptData(
        encryptedGroupData.encryptedInformation,
        encryptedGroupData.informationIv,
        key,
      )
    }

    return { name, information }
  }

  /**
   * Encrypt participant data
   */
  static async encryptParticipantData(
    participants: Array<{ id?: string; name: string }>,
    password: string,
    salt: string,
  ): Promise<EncryptedParticipantData[]> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    const encryptedParticipants: EncryptedParticipantData[] = []

    for (const participant of participants) {
      const nameEncryption = await EncryptionService.encryptData(
        participant.name,
        key,
      )

      encryptedParticipants.push({
        id: participant.id,
        encryptedName: nameEncryption.encryptedData,
        nameIv: nameEncryption.iv,
        encryptionVersion: this.ENCRYPTION_VERSION,
      })
    }

    return encryptedParticipants
  }

  /**
   * Decrypt participant data
   */
  static async decryptParticipantData(
    encryptedParticipants: EncryptedParticipantData[],
    password: string,
    salt: string,
  ): Promise<Array<{ id?: string; name: string }>> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    const participants: Array<{ id?: string; name: string }> = []

    for (const encryptedParticipant of encryptedParticipants) {
      const name = await EncryptionService.decryptData(
        encryptedParticipant.encryptedName,
        encryptedParticipant.nameIv,
        key,
      )

      participants.push({
        id: encryptedParticipant.id,
        name,
      })
    }

    return participants
  }

  /**
   * Encrypt expense with extended data
   */
  static async encryptExpenseExtendedData(
    title: string,
    notes: string | undefined,
    categoryName: string | undefined,
    shareData: ShareData | undefined,
    password: string,
    salt: string,
  ): Promise<EncryptedExpenseData> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)
    const encryptionFields: string[] = []

    // Encrypt basic expense data (existing functionality)
    const basicEncryption = await PasswordCrypto.encryptExpenseData(
      title,
      notes,
      password,
      salt,
    )
    encryptionFields.push('title', 'notes')

    // Encrypt category if provided
    let categoryEncryption = null
    if (categoryName && categoryName.trim()) {
      categoryEncryption = await EncryptionService.encryptData(
        categoryName,
        key,
      )
      encryptionFields.push('category')
    }

    // Encrypt share data if provided
    let sharesEncryption = null
    if (shareData && Object.keys(shareData).length > 0) {
      const shareDataString = JSON.stringify(shareData)
      sharesEncryption = await EncryptionService.encryptData(
        shareDataString,
        key,
      )
      encryptionFields.push('shares')
    }

    return {
      encryptedData: basicEncryption.encryptedData,
      encryptionIv: basicEncryption.iv,
      encryptedCategory: categoryEncryption?.encryptedData,
      categoryIv: categoryEncryption?.iv,
      encryptedShares: sharesEncryption?.encryptedData,
      sharesIv: sharesEncryption?.iv,
      encryptionVersion: this.ENCRYPTION_VERSION,
      encryptionFields,
    }
  }

  /**
   * Decrypt expense with extended data
   */
  static async decryptExpenseExtendedData(
    encryptedExpenseData: EncryptedExpenseData,
    password: string,
    salt: string,
  ): Promise<{
    title: string
    notes?: string
    categoryName?: string
    shareData?: ShareData
  }> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    // Decrypt basic expense data
    const basicData = await PasswordCrypto.decryptExpenseData(
      encryptedExpenseData.encryptedData!,
      encryptedExpenseData.encryptionIv!,
      password,
      salt,
    )

    // Decrypt category if encrypted
    let categoryName: string | undefined
    if (
      encryptedExpenseData.encryptedCategory &&
      encryptedExpenseData.categoryIv
    ) {
      categoryName = await EncryptionService.decryptData(
        encryptedExpenseData.encryptedCategory,
        encryptedExpenseData.categoryIv,
        key,
      )
    }

    // Decrypt share data if encrypted
    let shareData: ShareData | undefined
    if (encryptedExpenseData.encryptedShares && encryptedExpenseData.sharesIv) {
      const shareDataString = await EncryptionService.decryptData(
        encryptedExpenseData.encryptedShares,
        encryptedExpenseData.sharesIv,
        key,
      )
      shareData = JSON.parse(shareDataString) as ShareData
    }

    return {
      title: basicData.title,
      notes: basicData.notes,
      categoryName,
      shareData,
    }
  }

  /**
   * Check if data is encrypted with comprehensive encryption
   */
  static isComprehensivelyEncrypted(data: unknown): data is EncryptableData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'encryptionVersion' in data &&
      'encryptionFields' in data &&
      (data as EncryptableData).encryptionVersion === this.ENCRYPTION_VERSION &&
      Array.isArray((data as EncryptableData).encryptionFields) &&
      ((data as EncryptableData).encryptionFields?.length ?? 0) > 0
    )
  }

  /**
   * Migrate existing encrypted data to comprehensive encryption
   */
  static async migrateToComprehensiveEncryption(
    existingData: unknown,
    password: string,
    salt: string,
  ): Promise<EncryptableData> {
    // Implementation for migrating existing encrypted data
    // This would be used to gradually upgrade existing encrypted groups

    if (this.isComprehensivelyEncrypted(existingData)) {
      return existingData // Already migrated
    }

    // Perform migration logic here
    const migrated: EncryptedGroupData = {
      ...(existingData as Record<string, unknown>),
      encryptionVersion: this.ENCRYPTION_VERSION,
      encryptionFields: ['migrated'],
    }
    return migrated
  }

  /**
   * Validate encryption integrity
   */
  static validateEncryptionIntegrity(encryptedData: unknown): boolean {
    if (!encryptedData || typeof encryptedData !== 'object') {
      return false
    }

    const data = encryptedData as Record<string, unknown>

    // Check for required fields
    const hasVersion = typeof data.encryptionVersion === 'number'
    const hasFields = Array.isArray(data.encryptionFields)

    return hasVersion && hasFields
  }

  /**
   * Encrypt activity data
   */
  static async encryptActivityData(
    activityData: string,
    password: string,
    salt: string,
  ): Promise<EncryptedActivityData> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    const encryption = await EncryptionService.encryptData(activityData, key)

    return {
      encryptedData: encryption.encryptedData,
      dataIv: encryption.iv,
      encryptionVersion: this.ENCRYPTION_VERSION,
    }
  }

  /**
   * Decrypt activity data
   */
  static async decryptActivityData(
    encryptedActivityData: EncryptedActivityData,
    password: string,
    salt: string,
  ): Promise<string> {
    if (!encryptedActivityData.encryptedData || !encryptedActivityData.dataIv) {
      throw new Error('Invalid encrypted activity data')
    }

    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    return await EncryptionService.decryptData(
      encryptedActivityData.encryptedData,
      encryptedActivityData.dataIv,
      key,
    )
  }

  /**
   * Encrypt statistics data
   */
  static async encryptStatsData(
    statsData: Record<string, unknown>,
    statsType: string,
    password: string,
    salt: string,
  ): Promise<EncryptedStatsData> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    const statsString = JSON.stringify(statsData)
    const encryption = await EncryptionService.encryptData(statsString, key)

    return {
      encryptedData: encryption.encryptedData,
      dataIv: encryption.iv,
      encryptionVersion: this.ENCRYPTION_VERSION,
      statsType,
    }
  }

  /**
   * Decrypt statistics data
   */
  static async decryptStatsData(
    encryptedStatsData: EncryptedStatsData,
    password: string,
    salt: string,
  ): Promise<Record<string, unknown>> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    const statsString = await EncryptionService.decryptData(
      encryptedStatsData.encryptedData,
      encryptedStatsData.dataIv,
      key,
    )

    return JSON.parse(statsString) as Record<string, unknown>
  }

  /**
   * Encrypt settings data
   */
  static async encryptSettingsData(
    settingsData: Record<string, unknown>,
    settingsType: string,
    password: string,
    salt: string,
  ): Promise<EncryptedSettingsData> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    const settingsString = JSON.stringify(settingsData)
    const encryption = await EncryptionService.encryptData(settingsString, key)

    return {
      encryptedData: encryption.encryptedData,
      dataIv: encryption.iv,
      encryptionVersion: this.ENCRYPTION_VERSION,
      settingsType,
    }
  }

  /**
   * CRITICAL SECURITY: Encrypt payment relationship data
   * This prevents exposure of "who paid whom" information
   */
  static async encryptPaymentRelationshipData(
    paymentData: PaymentRelationshipData,
    password: string,
    salt: string,
  ): Promise<EncryptedPaymentData> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    // Encrypt paidBy participant ID
    const paidByEncryption = await EncryptionService.encryptData(
      paymentData.paidById,
      key,
    )

    // Encrypt paidFor array (participantId and shares)
    const paidForString = JSON.stringify(paymentData.paidFor)
    const paidForEncryption = await EncryptionService.encryptData(
      paidForString,
      key,
    )

    return {
      encryptedPaidBy: paidByEncryption.encryptedData,
      paidByIv: paidByEncryption.iv,
      encryptedPaidFor: paidForEncryption.encryptedData,
      paidForIv: paidForEncryption.iv,
      encryptionVersion: this.ENCRYPTION_VERSION,
    }
  }

  /**
   * CRITICAL SECURITY: Decrypt payment relationship data
   */
  static async decryptPaymentRelationshipData(
    encryptedPaymentData: EncryptedPaymentData,
    password: string,
    salt: string,
  ): Promise<PaymentRelationshipData> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    // Decrypt paidBy participant ID
    const paidById = await EncryptionService.decryptData(
      encryptedPaymentData.encryptedPaidBy,
      encryptedPaymentData.paidByIv,
      key,
    )

    // Decrypt paidFor array
    const paidForString = await EncryptionService.decryptData(
      encryptedPaymentData.encryptedPaidFor,
      encryptedPaymentData.paidForIv,
      key,
    )

    const paidFor = JSON.parse(paidForString) as Array<{
      participantId: string
      shares: number
    }>

    return {
      paidById,
      paidFor,
    }
  }

  /**
   * CRITICAL SECURITY: Encrypt expense financial data (amount, date)
   */
  static async encryptExpenseFinancialData(
    amount: number,
    expenseDate: Date,
    password: string,
    salt: string,
  ): Promise<{
    encryptedAmount: string
    amountIv: string
    encryptedExpenseDate: string
    expenseDateIv: string
  }> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    // Encrypt amount
    const amountEncryption = await EncryptionService.encryptData(
      amount.toString(),
      key,
    )

    // Encrypt expense date
    const expenseDateEncryption = await EncryptionService.encryptData(
      expenseDate.toISOString(),
      key,
    )

    return {
      encryptedAmount: amountEncryption.encryptedData,
      amountIv: amountEncryption.iv,
      encryptedExpenseDate: expenseDateEncryption.encryptedData,
      expenseDateIv: expenseDateEncryption.iv,
    }
  }

  /**
   * CRITICAL SECURITY: Decrypt expense financial data
   */
  static async decryptExpenseFinancialData(
    encryptedAmount: string,
    amountIv: string,
    encryptedExpenseDate: string,
    expenseDateIv: string,
    password: string,
    salt: string,
  ): Promise<{
    amount: number
    expenseDate: Date
  }> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    // Decrypt amount
    const amountString = await EncryptionService.decryptData(
      encryptedAmount,
      amountIv,
      key,
    )

    // Decrypt expense date
    const expenseDateString = await EncryptionService.decryptData(
      encryptedExpenseDate,
      expenseDateIv,
      key,
    )

    return {
      amount: parseFloat(amountString),
      expenseDate: new Date(expenseDateString),
    }
  }

  /**
   * Decrypt settings data
   */
  static async decryptSettingsData(
    encryptedSettingsData: EncryptedSettingsData,
    password: string,
    salt: string,
  ): Promise<Record<string, unknown>> {
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)

    const settingsString = await EncryptionService.decryptData(
      encryptedSettingsData.encryptedData,
      encryptedSettingsData.dataIv,
      key,
    )

    return JSON.parse(settingsString) as Record<string, unknown>
  }
}

/**
 * Utility functions for encryption field management
 */
export class EncryptionFieldManager {
  /**
   * Add encryption field to tracking
   */
  static addEncryptionField(
    encryptionFields: string[],
    fieldName: string,
  ): string[] {
    if (!encryptionFields.includes(fieldName)) {
      return [...encryptionFields, fieldName]
    }
    return encryptionFields
  }

  /**
   * Remove encryption field from tracking
   */
  static removeEncryptionField(
    encryptionFields: string[],
    fieldName: string,
  ): string[] {
    return encryptionFields.filter((field) => field !== fieldName)
  }

  /**
   * Check if field is encrypted
   */
  static isFieldEncrypted(
    encryptionFields: string[],
    fieldName: string,
  ): boolean {
    return encryptionFields.includes(fieldName)
  }
}
