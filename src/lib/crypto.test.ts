/**
 * Tests for crypto utility functions
 * Note: Full encryption/decryption tests require actual Web Crypto API
 * which is available in browsers but limited in Jest/Node.js
 */

import {
  base64ToKey,
  clearDerivedKeyCache,
  isEncrypted,
  keyToBase64,
} from './crypto'

describe('crypto utilities', () => {
  describe('keyToBase64 and base64ToKey', () => {
    it('should convert key to base64 and back', () => {
      const original = new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ])
      const base64 = keyToBase64(original)
      const restored = base64ToKey(base64)

      expect(restored).toEqual(original)
    })

    it('should produce URL-safe base64', () => {
      // Test with values that would produce + and / in standard base64
      const key = new Uint8Array([
        62, 63, 62, 63, 62, 63, 62, 63, 62, 63, 62, 63, 62, 63, 62, 63,
      ])
      const base64 = keyToBase64(key)

      // Should not contain +, /, or =
      expect(base64).not.toContain('+')
      expect(base64).not.toContain('/')
      expect(base64).not.toContain('=')
    })

    it('should handle base64 with different padding scenarios', () => {
      const testCases = [
        new Uint8Array([
          255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
          255, 255,
        ]),
        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        new Uint8Array([
          62, 63, 62, 63, 62, 63, 62, 63, 62, 63, 62, 63, 62, 63, 62, 63,
        ]),
      ]

      for (const original of testCases) {
        const base64 = keyToBase64(original)
        const restored = base64ToKey(base64)
        expect(restored).toEqual(original)
      }
    })

    it('should handle URL-safe base64 with - and _', () => {
      // Manually create URL-safe base64 string
      const urlSafeBase64 = 'Pj8-Pz4_Pj8-Pz4_Pj8-Pw'
      const key = base64ToKey(urlSafeBase64)
      const roundTrip = keyToBase64(key)

      expect(roundTrip).toBe(urlSafeBase64)
    })
  })

  describe('isEncrypted', () => {
    it('should return true for valid encrypted data pattern', () => {
      // Encrypted data is at least 20 characters (12 bytes IV + some ciphertext in base64)
      const validEncrypted = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      expect(isEncrypted(validEncrypted)).toBe(true)
    })

    it('should return false for short strings', () => {
      expect(isEncrypted('short')).toBe(false)
      expect(isEncrypted('')).toBe(false)
      expect(isEncrypted('1234567890123456789')).toBe(false) // 19 chars
    })

    it('should return false for strings with invalid base64 characters', () => {
      expect(isEncrypted('this has spaces and is invalid!')).toBe(false)
      expect(isEncrypted('contains+plus+signs+here')).toBe(false)
      expect(isEncrypted('contains/slashes/here')).toBe(false)
    })

    it('should return true for URL-safe base64 with - and _', () => {
      const urlSafe = 'Pj8-Pz4_Pj8-Pz4_Pj8-Pw'
      expect(isEncrypted(urlSafe)).toBe(true)
    })
  })

  describe('key format validation', () => {
    it('should handle 16-byte keys (128-bit)', () => {
      const key = new Uint8Array(16)
      for (let i = 0; i < 16; i++) {
        key[i] = i
      }

      const base64 = keyToBase64(key)
      const restored = base64ToKey(base64)

      expect(restored.length).toBe(16)
      expect(restored).toEqual(key)
    })

    it('should preserve all byte values 0-255', () => {
      // Test with a range of byte values
      const key = new Uint8Array([
        0, 127, 128, 255, 1, 254, 2, 253, 64, 191, 32, 223, 16, 239, 8, 247,
      ])
      const base64 = keyToBase64(key)
      const restored = base64ToKey(base64)

      expect(restored).toEqual(key)
    })
  })

  describe('clearDerivedKeyCache', () => {
    it('should be a function that can be called without error', () => {
      // clearDerivedKeyCache should not throw when called
      expect(() => clearDerivedKeyCache()).not.toThrow()
    })

    it('should be idempotent (safe to call multiple times)', () => {
      // Calling multiple times should not cause issues
      expect(() => {
        clearDerivedKeyCache()
        clearDerivedKeyCache()
        clearDerivedKeyCache()
      }).not.toThrow()
    })
  })
})
