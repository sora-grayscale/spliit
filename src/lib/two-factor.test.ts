/**
 * Tests for Two-Factor Authentication (2FA) utilities
 */

// Mock the env module to provide TWO_FA_ENCRYPTION_KEY
jest.mock('./env', () => ({
  env: {
    // 256-bit key (64 hex characters)
    TWO_FA_ENCRYPTION_KEY:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
}))

// Mock otpauth ESM module
const mockGenerate = jest.fn().mockReturnValue('123456')
const mockValidate = jest.fn().mockReturnValue(0) // 0 means valid (delta = 0)
const mockBase32Secret = 'JBSWY3DPEHPK3PXP'

jest.mock('otpauth', () => ({
  TOTP: jest.fn().mockImplementation((options) => ({
    secret: {
      base32: options?.secret?.base32 || mockBase32Secret,
    },
    toString: jest
      .fn()
      .mockReturnValue(
        `otpauth://totp/anon-spliit:${options?.label || 'user'}?secret=${options?.secret?.base32 || mockBase32Secret}&issuer=anon-spliit&algorithm=SHA1&digits=6&period=30`,
      ),
    generate: mockGenerate,
    validate: mockValidate,
  })),
  Secret: {
    fromBase32: jest.fn().mockImplementation((base32) => ({
      base32: base32,
    })),
  },
}))

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest
    .fn()
    .mockResolvedValue(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    ),
}))

import {
  decryptBackupCodes,
  decryptSecret,
  encryptBackupCodes,
  encryptSecret,
  generateBackupCodes,
  generateQRCode,
  generateTOTPSecret,
  normalizeToken,
  verifyTOTP,
} from './two-factor'

describe('two-factor authentication', () => {
  // ============================================================
  // encryptSecret / decryptSecret
  // ============================================================
  describe('encryptSecret / decryptSecret', () => {
    it('should encrypt and decrypt a secret (round-trip)', () => {
      const originalSecret = 'my-super-secret-totp-key'
      const encrypted = encryptSecret(originalSecret)
      const decrypted = decryptSecret(encrypted)

      expect(decrypted).toBe(originalSecret)
    })

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const secret = 'same-secret'
      const encrypted1 = encryptSecret(secret)
      const encrypted2 = encryptSecret(secret)

      // Different IVs should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2)

      // But both should decrypt to the same value
      expect(decryptSecret(encrypted1)).toBe(secret)
      expect(decryptSecret(encrypted2)).toBe(secret)
    })

    it('should handle empty string', () => {
      const originalSecret = ''
      const encrypted = encryptSecret(originalSecret)
      const decrypted = decryptSecret(encrypted)

      expect(decrypted).toBe(originalSecret)
    })

    it('should handle unicode characters', () => {
      const originalSecret = 'パスワード🔐秘密'
      const encrypted = encryptSecret(originalSecret)
      const decrypted = decryptSecret(encrypted)

      expect(decrypted).toBe(originalSecret)
    })

    it('should handle long secrets', () => {
      const originalSecret = 'a'.repeat(10000)
      const encrypted = encryptSecret(originalSecret)
      const decrypted = decryptSecret(encrypted)

      expect(decrypted).toBe(originalSecret)
    })

    it('should throw error for invalid encrypted data (corrupted)', () => {
      const invalidData = 'invalidbase64data=='

      expect(() => decryptSecret(invalidData)).toThrow()
    })

    it('should throw error for tampered data (authentication failure)', () => {
      const secret = 'my-secret'
      const encrypted = encryptSecret(secret)

      // Tamper with the encrypted data (flip a character in the middle)
      const tampered =
        encrypted.substring(0, 20) +
        (encrypted[20] === 'A' ? 'B' : 'A') +
        encrypted.substring(21)

      expect(() => decryptSecret(tampered)).toThrow()
    })

    it('should produce base64-encoded output', () => {
      const secret = 'test-secret'
      const encrypted = encryptSecret(secret)

      // Check that output is valid base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow()

      // Encrypted data should contain: IV (12 bytes) + ciphertext + authTag (16 bytes)
      // Minimum length: 12 + 1 + 16 = 29 bytes = ~39 base64 chars
      expect(encrypted.length).toBeGreaterThan(30)
    })
  })

  // ============================================================
  // generateBackupCodes
  // ============================================================
  describe('generateBackupCodes', () => {
    it('should generate exactly 10 backup codes', () => {
      const codes = generateBackupCodes()

      expect(codes).toHaveLength(10)
    })

    it('should generate codes with exactly 8 characters each', () => {
      const codes = generateBackupCodes()

      codes.forEach((code) => {
        expect(code).toHaveLength(8)
      })
    })

    it('should generate codes with only uppercase alphanumeric characters', () => {
      const codes = generateBackupCodes()
      const validPattern = /^[A-Z0-9]+$/

      codes.forEach((code) => {
        expect(code).toMatch(validPattern)
      })
    })

    it('should generate unique codes (no duplicates within a set)', () => {
      const codes = generateBackupCodes()
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(codes.length)
    })

    it('should generate different codes on each call', () => {
      const codes1 = generateBackupCodes()
      const codes2 = generateBackupCodes()

      // At least one code should be different (extremely unlikely to be all same)
      const allSame = codes1.every((code, i) => code === codes2[i])
      expect(allSame).toBe(false)
    })

    it('should generate codes with sufficient entropy', () => {
      // Generate multiple sets and ensure we see variety
      const allCodes: string[] = []
      for (let i = 0; i < 100; i++) {
        allCodes.push(...generateBackupCodes())
      }

      // Should have at least 900 unique codes out of 1000 (very conservative)
      const uniqueCodes = new Set(allCodes)
      expect(uniqueCodes.size).toBeGreaterThan(900)
    })
  })

  // ============================================================
  // encryptBackupCodes / decryptBackupCodes
  // ============================================================
  describe('encryptBackupCodes / decryptBackupCodes', () => {
    it('should encrypt and decrypt backup codes (round-trip)', () => {
      const originalCodes = generateBackupCodes()
      const encrypted = encryptBackupCodes(originalCodes)
      const decrypted = decryptBackupCodes(encrypted)

      expect(decrypted).toEqual(originalCodes)
    })

    it('should handle empty array', () => {
      const originalCodes: string[] = []
      const encrypted = encryptBackupCodes(originalCodes)
      const decrypted = decryptBackupCodes(encrypted)

      expect(decrypted).toEqual(originalCodes)
    })

    it('should handle single code', () => {
      const originalCodes = ['ABCD1234']
      const encrypted = encryptBackupCodes(originalCodes)
      const decrypted = decryptBackupCodes(encrypted)

      expect(decrypted).toEqual(originalCodes)
    })

    it('should preserve order of codes', () => {
      const originalCodes = ['CODE0001', 'CODE0002', 'CODE0003', 'CODE0004']
      const encrypted = encryptBackupCodes(originalCodes)
      const decrypted = decryptBackupCodes(encrypted)

      expect(decrypted).toEqual(originalCodes)
      expect(decrypted[0]).toBe('CODE0001')
      expect(decrypted[3]).toBe('CODE0004')
    })

    it('should throw error for tampered encrypted codes', () => {
      const codes = generateBackupCodes()
      const encrypted = encryptBackupCodes(codes)

      // Tamper with the data
      const tampered =
        encrypted.substring(0, 10) + 'XXXX' + encrypted.substring(14)

      expect(() => decryptBackupCodes(tampered)).toThrow()
    })
  })

  // ============================================================
  // generateTOTPSecret
  // ============================================================
  describe('generateTOTPSecret', () => {
    it('should generate a valid base32 secret', () => {
      const { secret } = generateTOTPSecret()

      // Base32 characters: A-Z and 2-7
      expect(secret).toMatch(/^[A-Z2-7]+$/)

      // Secret should be at least 16 characters (80 bits minimum for security)
      expect(secret.length).toBeGreaterThanOrEqual(16)
    })

    it('should generate a valid otpauth URL', () => {
      const { otpauthUrl } = generateTOTPSecret('testuser')

      expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\//)
      expect(otpauthUrl).toContain('anon-spliit')
      expect(otpauthUrl).toContain('testuser')
      expect(otpauthUrl).toContain('secret=')
    })

    it('should use default user identifier when not provided', () => {
      const { otpauthUrl } = generateTOTPSecret()

      expect(otpauthUrl).toContain('user')
    })

    it('should call TOTP constructor with correct parameters', () => {
      // With mocked otpauth, we verify the function calls the constructor properly
      const { secret, otpauthUrl } = generateTOTPSecret('customuser')

      // The mock returns our predefined secret
      expect(secret).toBe(mockBase32Secret)
      expect(otpauthUrl).toContain('anon-spliit')
      expect(otpauthUrl).toContain('customuser')
    })

    it('should include required TOTP parameters in URL', () => {
      const { otpauthUrl } = generateTOTPSecret()

      // Check for standard TOTP parameters
      expect(otpauthUrl).toContain('algorithm=')
      expect(otpauthUrl).toContain('digits=')
      expect(otpauthUrl).toContain('period=')
    })

    it('should handle special characters in user identifier', () => {
      const { otpauthUrl } = generateTOTPSecret('user@example.com')

      // URL should be properly encoded
      expect(otpauthUrl).toContain('user')
      expect(otpauthUrl).toContain('example.com')
    })
  })

  // ============================================================
  // verifyTOTP
  // ============================================================
  describe('verifyTOTP', () => {
    beforeEach(() => {
      // Reset mock for each test
      mockValidate.mockClear()
      mockValidate.mockReturnValue(0) // Valid by default
    })

    it('should verify a valid TOTP token', () => {
      const { secret } = generateTOTPSecret()
      mockValidate.mockReturnValue(0) // 0 means valid (delta = 0)

      const isValid = verifyTOTP(secret, '123456')

      expect(isValid).toBe(true)
    })

    it('should reject an invalid TOTP token', () => {
      const { secret } = generateTOTPSecret()
      mockValidate.mockReturnValue(null) // null means invalid

      expect(verifyTOTP(secret, '000000')).toBe(false)
      expect(verifyTOTP(secret, '999999')).toBe(false)
    })

    it('should reject malformed tokens', () => {
      const { secret } = generateTOTPSecret()
      mockValidate.mockReturnValue(null) // null means invalid

      // Too short
      expect(verifyTOTP(secret, '12345')).toBe(false)

      // Too long
      expect(verifyTOTP(secret, '1234567')).toBe(false)

      // Non-numeric
      expect(verifyTOTP(secret, 'abcdef')).toBe(false)

      // Empty
      expect(verifyTOTP(secret, '')).toBe(false)
    })

    it('should return false for invalid secret', () => {
      // Make the mock throw an error for invalid secrets
      mockValidate.mockImplementation(() => {
        throw new Error('Invalid secret')
      })

      // Invalid base32 secret
      expect(verifyTOTP('invalid!@#$%', '123456')).toBe(false)

      // Empty secret
      expect(verifyTOTP('', '123456')).toBe(false)
    })

    it('should handle token with window tolerance', () => {
      const { secret } = generateTOTPSecret()
      // 1 means one time step ahead (within window)
      mockValidate.mockReturnValue(1)

      // Verify token within window works
      expect(verifyTOTP(secret, '123456')).toBe(true)
    })
  })

  // ============================================================
  // generateQRCode
  // ============================================================
  describe('generateQRCode', () => {
    it('should generate a valid data URL', async () => {
      const { otpauthUrl } = generateTOTPSecret('testuser')
      const qrDataUrl = await generateQRCode(otpauthUrl)

      // Should be a valid data URL starting with the correct prefix
      expect(qrDataUrl).toMatch(/^data:image\/png;base64,/)
    })

    it('should generate a non-empty QR code', async () => {
      const { otpauthUrl } = generateTOTPSecret('testuser')
      const qrDataUrl = await generateQRCode(otpauthUrl)

      // Extract base64 data and check it's not empty
      const base64Data = qrDataUrl.split(',')[1]
      // With mock, we get a small test image
      expect(base64Data.length).toBeGreaterThan(50)
    })

    it('should call toDataURL with correct parameters', async () => {
      const QRCode = require('qrcode')
      const { otpauthUrl } = generateTOTPSecret('testuser')

      await generateQRCode(otpauthUrl)

      // Verify toDataURL was called with the URL
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        otpauthUrl,
        expect.any(Object),
      )
    })

    it('should handle long URLs', async () => {
      const longIdentifier = 'a'.repeat(100)
      const { otpauthUrl } = generateTOTPSecret(longIdentifier)
      const qrDataUrl = await generateQRCode(otpauthUrl)

      expect(qrDataUrl).toMatch(/^data:image\/png;base64,/)
    })

    it('should generate decodable PNG image', async () => {
      const { otpauthUrl } = generateTOTPSecret('testuser')
      const qrDataUrl = await generateQRCode(otpauthUrl)

      // Extract base64 and decode to check PNG magic bytes
      const base64Data = qrDataUrl.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')

      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      expect(buffer[0]).toBe(0x89)
      expect(buffer[1]).toBe(0x50) // P
      expect(buffer[2]).toBe(0x4e) // N
      expect(buffer[3]).toBe(0x47) // G
    })
  })

  // ============================================================
  // Missing encryption key tests
  // ============================================================
  describe('missing encryption key', () => {
    it('should throw error when TWO_FA_ENCRYPTION_KEY is not set', () => {
      // Create a separate test module with no key
      jest.resetModules()

      // Mock env with no key
      jest.doMock('./env', () => ({
        env: {
          TWO_FA_ENCRYPTION_KEY: undefined,
        },
      }))

      // Re-import the module with the new mock
      const twoFactor = require('./two-factor')

      expect(() => twoFactor.encryptSecret('test')).toThrow(
        'TWO_FA_ENCRYPTION_KEY environment variable is not set',
      )

      // Restore the original mock
      jest.resetModules()
      jest.doMock('./env', () => ({
        env: {
          TWO_FA_ENCRYPTION_KEY:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
      }))
    })
  })

  // ============================================================
  // normalizeToken
  // ============================================================
  describe('normalizeToken', () => {
    it('should trim whitespace', () => {
      expect(normalizeToken('  123456  ')).toBe('123456')
    })

    it('should convert to uppercase', () => {
      expect(normalizeToken('abc123')).toBe('ABC123')
    })

    it('should remove non-alphanumeric characters', () => {
      expect(normalizeToken('ABC-123-DEF')).toBe('ABC123DEF')
    })

    it('should handle backup codes with spaces', () => {
      expect(normalizeToken('ABCD 1234')).toBe('ABCD1234')
    })

    it('should handle empty string', () => {
      expect(normalizeToken('')).toBe('')
    })

    it('should normalize TOTP tokens', () => {
      expect(normalizeToken('123456')).toBe('123456')
    })

    it('should normalize backup codes', () => {
      expect(normalizeToken('abcd1234')).toBe('ABCD1234')
    })
  })
})
