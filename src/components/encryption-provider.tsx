'use client'

import {
  base64ToKey,
  decrypt,
  decryptNumber,
  decryptObject,
  encrypt,
  encryptNumber,
  encryptObject,
  generateMasterKey,
  keyToBase64,
} from '@/lib/crypto'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

// localStorage key prefix for encryption keys
const STORAGE_KEY_PREFIX = 'spliit-e2ee-key-'

/**
 * Extract groupId from current URL path
 */
function getGroupIdFromPath(): string | null {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/\/groups\/([^/]+)/)
  return match ? match[1] : null
}

/**
 * Save encryption key to localStorage for a group
 */
function saveKeyToStorage(groupId: string, key: Uint8Array): void {
  if (typeof window === 'undefined') return
  try {
    const keyBase64 = keyToBase64(key)
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${groupId}`, keyBase64)
  } catch (error) {
    console.warn('Failed to save encryption key to localStorage:', error)
  }
}

/**
 * Load encryption key from localStorage for a group
 */
function loadKeyFromStorage(groupId: string): Uint8Array | null {
  if (typeof window === 'undefined') return null
  try {
    const keyBase64 = localStorage.getItem(`${STORAGE_KEY_PREFIX}${groupId}`)
    if (keyBase64) {
      const key = base64ToKey(keyBase64)
      if (key.length === 16) {
        return key
      }
    }
  } catch (error) {
    console.warn('Failed to load encryption key from localStorage:', error)
  }
  return null
}

interface EncryptionContextValue {
  /** The encryption key (null if not available) */
  encryptionKey: Uint8Array | null
  /** Whether the key is still being loaded from URL */
  isLoading: boolean
  /** Error message if key is invalid */
  error: string | null
  /** Whether a valid key is available */
  hasKey: boolean
  /** Whether the group requires encryption but key is missing */
  needsKey: boolean
  /** Get the key as base64 string */
  getKeyBase64: () => string | null
  /** Encrypt a string */
  encryptString: (data: string) => Promise<string>
  /** Decrypt a string */
  decryptString: (encrypted: string) => Promise<string>
  /** Encrypt a number */
  encryptNum: (num: number) => Promise<string>
  /** Decrypt a number */
  decryptNum: (encrypted: string) => Promise<number>
  /** Encrypt an object */
  encryptObj: <T>(obj: T) => Promise<string>
  /** Decrypt an object */
  decryptObj: <T>(encrypted: string) => Promise<T>
}

const EncryptionContext = createContext<EncryptionContextValue | null>(null)

interface EncryptionProviderProps {
  children: ReactNode
  /** If true, generate a new key if none exists in URL */
  generateIfMissing?: boolean
}

export function EncryptionProvider({
  children,
  generateIfMissing = false,
}: EncryptionProviderProps) {
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsKey, setNeedsKey] = useState(false)

  // Function to read key from URL hash and save to localStorage
  const readKeyFromHash = useCallback(() => {
    if (typeof window === 'undefined') return false

    const hash = window.location.hash.slice(1)
    const groupId = getGroupIdFromPath()

    if (hash) {
      try {
        const key = base64ToKey(hash)
        if (key.length === 16) {
          // Save to localStorage for future access
          if (groupId) {
            saveKeyToStorage(groupId, key)
          }
          // Only update if key changed
          setEncryptionKey((current) => {
            if (current && keyToBase64(current) === keyToBase64(key)) {
              return current
            }
            return key
          })
          setError(null)
          setNeedsKey(false)
          return true
        } else {
          setError('Invalid encryption key length')
        }
      } catch {
        setError('Invalid encryption key format')
      }
    }
    return false
  }, [])

  // Function to restore key from localStorage and update URL
  const restoreKeyFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return false

    const groupId = getGroupIdFromPath()
    if (!groupId) return false

    const key = loadKeyFromStorage(groupId)
    if (key) {
      setEncryptionKey(key)
      setError(null)
      setNeedsKey(false)

      // Update URL with key hash (without triggering navigation)
      const keyBase64 = keyToBase64(key)
      const newUrl = `${window.location.pathname}${window.location.search}#${keyBase64}`
      window.history.replaceState(null, '', newUrl)
      return true
    }
    return false
  }, [])

  // Read key from URL fragment on mount and handle missing key
  useEffect(() => {
    if (typeof window === 'undefined') return

    // First try to read from URL hash
    let hasKey = readKeyFromHash()

    // If no key in URL, try to restore from localStorage
    if (!hasKey) {
      hasKey = restoreKeyFromStorage()
    }

    // If still no key and we should generate one
    if (!hasKey && generateIfMissing) {
      const newKey = generateMasterKey()
      setEncryptionKey(newKey)
      setError(null)
      setNeedsKey(false)

      // Save to localStorage
      const groupId = getGroupIdFromPath()
      if (groupId) {
        saveKeyToStorage(groupId, newKey)
      }

      // Update URL without navigation
      const base64Key = keyToBase64(newKey)
      const newUrl = `${window.location.pathname}${window.location.search}#${base64Key}`
      window.history.replaceState(null, '', newUrl)
    }

    setIsLoading(false)

    // Listen for hash changes
    const handleHashChange = () => {
      readKeyFromHash()
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [generateIfMissing, readKeyFromHash, restoreKeyFromStorage])

  // Also check hash periodically in case hashchange event didn't fire
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkHash = () => {
      const hash = window.location.hash.slice(1)
      if (hash && !encryptionKey) {
        readKeyFromHash()
      } else if (!hash && !encryptionKey) {
        // Try to restore from localStorage
        restoreKeyFromStorage()
      }
    }

    // Check immediately
    checkHash()

    // Check again after a short delay (for navigation timing)
    const timer = setTimeout(checkHash, 100)
    return () => clearTimeout(timer)
  }, [encryptionKey, readKeyFromHash, restoreKeyFromStorage])

  const getKeyBase64 = useCallback(() => {
    if (!encryptionKey) return null
    return keyToBase64(encryptionKey)
  }, [encryptionKey])

  const encryptString = useCallback(
    async (data: string) => {
      if (!encryptionKey) throw new Error('No encryption key available')
      return encrypt(data, encryptionKey)
    },
    [encryptionKey]
  )

  const decryptString = useCallback(
    async (encrypted: string) => {
      if (!encryptionKey) throw new Error('No encryption key available')
      return decrypt(encrypted, encryptionKey)
    },
    [encryptionKey]
  )

  const encryptNum = useCallback(
    async (num: number) => {
      if (!encryptionKey) throw new Error('No encryption key available')
      return encryptNumber(num, encryptionKey)
    },
    [encryptionKey]
  )

  const decryptNum = useCallback(
    async (encrypted: string) => {
      if (!encryptionKey) throw new Error('No encryption key available')
      return decryptNumber(encrypted, encryptionKey)
    },
    [encryptionKey]
  )

  const encryptObj = useCallback(
    async <T,>(obj: T) => {
      if (!encryptionKey) throw new Error('No encryption key available')
      return encryptObject(obj, encryptionKey)
    },
    [encryptionKey]
  )

  const decryptObj = useCallback(
    async <T,>(encrypted: string) => {
      if (!encryptionKey) throw new Error('No encryption key available')
      return decryptObject<T>(encrypted, encryptionKey)
    },
    [encryptionKey]
  )

  const value = useMemo<EncryptionContextValue>(
    () => ({
      encryptionKey,
      isLoading,
      error,
      hasKey: encryptionKey !== null,
      needsKey,
      getKeyBase64,
      encryptString,
      decryptString,
      encryptNum,
      decryptNum,
      encryptObj,
      decryptObj,
    }),
    [
      encryptionKey,
      isLoading,
      error,
      needsKey,
      getKeyBase64,
      encryptString,
      decryptString,
      encryptNum,
      decryptNum,
      encryptObj,
      decryptObj,
    ]
  )

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  )
}

export function useEncryption() {
  const context = useContext(EncryptionContext)
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionProvider')
  }
  return context
}

/**
 * Hook that requires encryption key to be present
 * Shows error UI if key is missing
 */
export function useRequireEncryption() {
  const encryption = useEncryption()

  if (encryption.isLoading) {
    return { ...encryption, status: 'loading' as const }
  }

  if (!encryption.hasKey) {
    return { ...encryption, status: 'missing-key' as const }
  }

  if (encryption.error) {
    return { ...encryption, status: 'error' as const }
  }

  return { ...encryption, status: 'ready' as const }
}
