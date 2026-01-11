/**
 * E2EE Encryption utilities using Web Crypto API
 *
 * This module provides end-to-end encryption for sensitive group data.
 * The encryption key is stored in the URL fragment and never sent to the server.
 */

// Check if we're in an environment with Web Crypto API
// Works in browsers and in Node.js test environments with jsdom
const isClient =
  typeof globalThis !== 'undefined' &&
  globalThis.crypto?.subtle !== undefined

/**
 * Generate a new random master key (128-bit)
 */
export function generateMasterKey(): Uint8Array {
  if (!isClient) {
    throw new Error('Crypto API not available')
  }
  return crypto.getRandomValues(new Uint8Array(16))
}

/**
 * Convert a key to URL-safe base64 string
 */
export function keyToBase64(key: Uint8Array): string {
  const binary = String.fromCharCode.apply(null, Array.from(key))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Convert a URL-safe base64 string back to key bytes
 */
export function base64ToKey(base64: string): Uint8Array {
  // Restore standard base64
  let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding if needed
  while (standardBase64.length % 4) {
    standardBase64 += '='
  }
  const binary = atob(standardBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Derive an encryption key from the master key using HKDF
 */
export async function deriveKey(
  masterKey: Uint8Array,
  purpose: 'data' | 'metadata' = 'data'
): Promise<CryptoKey> {
  if (!isClient) {
    throw new Error('Crypto API not available')
  }

  // Import the master key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    masterKey.buffer.slice(masterKey.byteOffset, masterKey.byteOffset + masterKey.byteLength),
    'HKDF',
    false,
    ['deriveKey']
  )

  // Derive the actual encryption key
  const info = new TextEncoder().encode(`spliit-e2ee-${purpose}`)
  const salt = new Uint8Array(16) // Zero salt (key is already random)

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-128-GCM
 * Returns base64-encoded ciphertext with IV prepended
 */
export async function encrypt(
  data: string,
  masterKey: Uint8Array
): Promise<string> {
  if (!isClient) {
    throw new Error('Crypto API not available')
  }

  const key = await deriveKey(masterKey, 'data')
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(data)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return keyToBase64(combined)
}

/**
 * Decrypt data using AES-128-GCM
 */
export async function decrypt(
  encryptedData: string,
  masterKey: Uint8Array
): Promise<string> {
  if (!isClient) {
    throw new Error('Crypto API not available')
  }

  const key = await deriveKey(masterKey, 'data')
  const combined = base64ToKey(encryptedData)

  // Extract IV and ciphertext
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Encrypt a number (for amounts)
 */
export async function encryptNumber(
  num: number,
  masterKey: Uint8Array
): Promise<string> {
  return encrypt(num.toString(), masterKey)
}

/**
 * Decrypt a number
 */
export async function decryptNumber(
  encryptedData: string,
  masterKey: Uint8Array
): Promise<number> {
  const decrypted = await decrypt(encryptedData, masterKey)
  return parseInt(decrypted, 10)
}

/**
 * Encrypt an object (for complex data)
 */
export async function encryptObject<T>(
  obj: T,
  masterKey: Uint8Array
): Promise<string> {
  return encrypt(JSON.stringify(obj), masterKey)
}

/**
 * Decrypt an object
 */
export async function decryptObject<T>(
  encryptedData: string,
  masterKey: Uint8Array
): Promise<T> {
  const decrypted = await decrypt(encryptedData, masterKey)
  return JSON.parse(decrypted) as T
}

/**
 * Check if a string looks like encrypted data (base64 with minimum length)
 */
export function isEncrypted(data: string): boolean {
  // Encrypted data will be at least IV (12 bytes) + some ciphertext
  // Base64 encoded, minimum ~20 characters
  if (data.length < 20) return false
  // Check if it's valid URL-safe base64
  return /^[A-Za-z0-9_-]+$/.test(data)
}

/**
 * Get the encryption key from URL fragment
 */
export function getKeyFromFragment(): Uint8Array | null {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.slice(1) // Remove #
  if (!hash) return null

  try {
    return base64ToKey(hash)
  } catch {
    return null
  }
}

/**
 * Set the encryption key in URL fragment (without triggering navigation)
 */
export function setKeyInFragment(key: Uint8Array): void {
  if (typeof window === 'undefined') return

  const base64Key = keyToBase64(key)
  const newUrl = `${window.location.pathname}${window.location.search}#${base64Key}`
  window.history.replaceState(null, '', newUrl)
}

/**
 * Generate a full group URL with encryption key
 */
export function generateGroupUrl(groupId: string, key: Uint8Array): string {
  const base64Key = keyToBase64(key)
  return `/groups/${groupId}#${base64Key}`
}
