/**
 * Group change detection utilities for optimized comparison and change tracking
 */

import { useMemo } from 'react'

export interface GroupData {
  id?: string
  name: string
  currency: string
  information?: string | null
  participants: Array<{
    id?: string
    name: string
  }>
}

export interface GroupFormValues {
  name: string
  currency: string
  information: string
  participants: Array<{
    id?: string
    name: string
  }>
}

export interface ChangeDetectionResult {
  hasChanges: boolean
  changes: string[]
  changeTypes: {
    name: boolean
    currency: boolean
    information: boolean
    participants: boolean
    participantNames: boolean
  }
}

/**
 * Efficient participant comparison using Set-based approach
 */
function compareParticipants(
  original: Array<{ id?: string; name: string }>,
  updated: Array<{ id?: string; name: string }>,
): { hasChanges: boolean; hasNameChanges: boolean } {
  if (original.length !== updated.length) {
    return { hasChanges: true, hasNameChanges: false }
  }

  // Create Sets for efficient comparison
  const originalNames = new Set(original.map((p) => p.name))
  const updatedNames = new Set(updated.map((p) => p.name))

  // Check if names have changed
  if (originalNames.size !== updatedNames.size) {
    return { hasChanges: true, hasNameChanges: true }
  }

  // PERFORMANCE FIX: Use Array.some() for better performance and early exit
  const hasNameChanges = !Array.from(updatedNames).every((name) =>
    originalNames.has(name),
  )

  if (hasNameChanges) {
    return { hasChanges: true, hasNameChanges: true }
  }

  return { hasChanges: false, hasNameChanges: false }
}

/**
 * Detect changes between original group data and form values
 */
export function detectGroupChanges(
  originalGroup: GroupData | null | undefined,
  formValues: GroupFormValues,
): ChangeDetectionResult {
  const changes: string[] = []
  const changeTypes = {
    name: false,
    currency: false,
    information: false,
    participants: false,
    participantNames: false,
  }

  if (!originalGroup) {
    return {
      hasChanges: false,
      changes: [],
      changeTypes,
    }
  }

  // Check name changes
  if (formValues.name !== originalGroup.name) {
    changes.push(`Group name: "${formValues.name}"`)
    changeTypes.name = true
  }

  // Check currency changes
  if (formValues.currency !== originalGroup.currency) {
    changes.push(`Currency: ${formValues.currency}`)
    changeTypes.currency = true
  }

  // Check information changes (handle null/undefined properly)
  const originalInfo = originalGroup.information ?? ''
  const newInfo = formValues.information ?? ''
  if (newInfo !== originalInfo) {
    changes.push('Description')
    changeTypes.information = true
  }

  // Check participant changes with efficient comparison
  const participantComparison = compareParticipants(
    originalGroup.participants || [],
    formValues.participants || [],
  )

  if (participantComparison.hasChanges) {
    if (formValues.participants.length !== originalGroup.participants.length) {
      changes.push(`Participants (${formValues.participants.length} members)`)
      changeTypes.participants = true
    } else if (participantComparison.hasNameChanges) {
      changes.push('Participant names')
      changeTypes.participantNames = true
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes,
    changeTypes,
  }
}

/**
 * React hook for memoized change detection
 */
export function useGroupChangeDetection(
  originalGroup: GroupData | null | undefined,
  formValues: GroupFormValues,
): ChangeDetectionResult {
  return useMemo(() => {
    return detectGroupChanges(originalGroup, formValues)
  }, [originalGroup, formValues])
}

/**
 * Generate user-friendly change message
 */
export function formatChangeMessage(
  changes: string[],
  defaultMessage: string = 'Group settings saved successfully',
): string {
  if (changes.length === 0) {
    return defaultMessage
  }

  return `Changes: ${changes.join(', ')}`
}

/**
 * Optimized participant array comparison for large groups
 */
export function fastParticipantComparison(
  original: Array<{ id?: string; name: string }>,
  updated: Array<{ id?: string; name: string }>,
): boolean {
  if (original.length !== updated.length) {
    return true // Has changes
  }

  // Use Map for O(1) lookup instead of O(n) for each comparison
  const originalMap = new Map(original.map((p, index) => [index, p.name]))

  for (let i = 0; i < updated.length; i++) {
    if (originalMap.get(i) !== updated[i].name) {
      return true // Has changes
    }
  }

  return false // No changes
}

/**
 * Batch change detection for multiple groups (if needed for bulk operations)
 */
export function detectBatchGroupChanges(
  originalGroups: GroupData[],
  updatedGroups: GroupFormValues[],
): Map<string, ChangeDetectionResult> {
  const results = new Map<string, ChangeDetectionResult>()

  for (
    let i = 0;
    i < Math.min(originalGroups.length, updatedGroups.length);
    i++
  ) {
    const original = originalGroups[i]
    const updated = updatedGroups[i]
    const groupId = original.id || `temp-${i}`

    results.set(groupId, detectGroupChanges(original, updated))
  }

  return results
}
