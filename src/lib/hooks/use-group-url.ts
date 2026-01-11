'use client'

import { useEncryption } from '@/components/encryption-provider'
import { useCallback } from 'react'

/**
 * Hook to build URLs that preserve the encryption key hash
 */
export function useGroupUrl() {
  const { getKeyBase64 } = useEncryption()

  /**
   * Build a URL with the encryption key hash appended
   */
  const buildUrl = useCallback(
    (path: string): string => {
      const keyBase64 = getKeyBase64()
      if (keyBase64) {
        // Remove any existing hash and add the encryption key
        const basePath = path.split('#')[0]
        return `${basePath}#${keyBase64}`
      }
      return path
    },
    [getKeyBase64]
  )

  /**
   * Get the current hash (encryption key) from the URL
   */
  const getHash = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1)
    return hash || null
  }, [])

  return {
    buildUrl,
    getHash,
    getKeyBase64,
  }
}
