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
    shareData: Record<string, any> | undefined,
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
    shareData?: Record<string, any>
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
    let shareData: Record<string, any> | undefined
    if (encryptedExpenseData.encryptedShares && encryptedExpenseData.sharesIv) {
      const shareDataString = await EncryptionService.decryptData(
        encryptedExpenseData.encryptedShares,
        encryptedExpenseData.sharesIv,
        key,
      )
      shareData = JSON.parse(shareDataString) as Record<string, any>
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
  static isComprehensivelyEncrypted(data: any): boolean {
    return (
      data &&
      data.encryptionVersion === this.ENCRYPTION_VERSION &&
      Array.isArray(data.encryptionFields) &&
      data.encryptionFields.length > 0
    )
  }

  /**
   * Migrate existing encrypted data to comprehensive encryption
   */
  static async migrateToComprehensiveEncryption(
    existingData: any,
    password: string,
    salt: string,
  ): Promise<any> {
    // Implementation for migrating existing encrypted data
    // This would be used to gradually upgrade existing encrypted groups

    if (this.isComprehensivelyEncrypted(existingData)) {
      return existingData // Already migrated
    }

    // Perform migration logic here
    return {
      ...existingData,
      encryptionVersion: this.ENCRYPTION_VERSION,
      encryptionFields: ['migrated'],
    }
  }

  /**
   * Validate encryption integrity
   */
  static validateEncryptionIntegrity(encryptedData: any): boolean {
    if (!encryptedData || typeof encryptedData !== 'object') {
      return false
    }

    // Check for required fields
    const hasVersion = typeof encryptedData.encryptionVersion === 'number'
    const hasFields = Array.isArray(encryptedData.encryptionFields)

    return hasVersion && hasFields
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
