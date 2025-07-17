/**
 * @jest-environment jsdom
 */

import { PasswordCrypto, PasswordSession } from './e2ee-crypto'

// Mock Web Crypto API for Node.js environment
const mockCrypto = {
  subtle: {
    importKey: jest.fn(),
    deriveKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn(),
}

// @ts-ignore
global.crypto = mockCrypto

describe('PasswordCrypto', () => {
  const testPassword = 'test-password-123'
  const testSalt = 'dGVzdC1zYWx0LWJhc2U2NA==' // base64 encoded
  const testData = 'sensitive data'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateSalt', () => {
    it('should generate a random salt', () => {
      const mockBytes = new Uint8Array(32).fill(1)
      mockCrypto.getRandomValues.mockReturnValue(mockBytes)

      const salt = PasswordCrypto.generateSalt()

      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array))
      expect(typeof salt).toBe('string')
      expect(salt.length).toBeGreaterThan(0)
    })
  })

  describe('deriveKeyFromPassword', () => {
    it('should derive key using PBKDF2', async () => {
      const mockKeyMaterial = {}
      const mockDerivedKey = {}

      mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial)
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey)

      const result = await PasswordCrypto.deriveKeyFromPassword(testPassword, testSalt)

      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        'PBKDF2',
        false,
        ['deriveKey']
      )

      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: expect.any(ArrayBuffer),
          iterations: 100000,
          hash: 'SHA-256',
        },
        mockKeyMaterial,
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['encrypt', 'decrypt']
      )

      expect(result).toBe(mockDerivedKey)
    })
  })

  describe('encryptData', () => {
    it('should encrypt data with AES-GCM', async () => {
      const mockKey = {}
      const mockIv = new Uint8Array(12)
      const mockEncryptedBuffer = new ArrayBuffer(16)

      mockCrypto.getRandomValues.mockReturnValue(mockIv)
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedBuffer)

      const result = await PasswordCrypto.encryptData(testData, mockKey as CryptoKey)

      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array))
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: mockIv,
        },
        mockKey,
        expect.any(Uint8Array)
      )

      expect(result).toHaveProperty('encryptedData')
      expect(result).toHaveProperty('iv')
      expect(typeof result.encryptedData).toBe('string')
      expect(typeof result.iv).toBe('string')
    })
  })

  describe('decryptData', () => {
    it('should decrypt data with AES-GCM', async () => {
      const mockKey = {}
      const mockDecryptedBuffer = new TextEncoder().encode(testData)
      const testEncryptedData = 'dGVzdA==' // base64
      const testIv = 'aXZfdGVzdA==' // base64

      mockCrypto.subtle.decrypt.mockResolvedValue(mockDecryptedBuffer)

      const result = await PasswordCrypto.decryptData(testEncryptedData, testIv, mockKey as CryptoKey)

      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: expect.any(ArrayBuffer),
        },
        mockKey,
        expect.any(ArrayBuffer)
      )

      expect(result).toBe(testData)
    })
  })

  describe('encryptExpenseData', () => {
    it('should encrypt expense title and notes', async () => {
      const mockKey = {}
      const mockEncryptedResult = {
        encryptedData: 'encrypted',
        iv: 'iv'
      }

      mockCrypto.subtle.importKey.mockResolvedValue({})
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey)
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12))
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16))

      const result = await PasswordCrypto.encryptExpenseData(
        'Test Title',
        'Test Notes',
        testPassword,
        testSalt
      )

      expect(result).toHaveProperty('encryptedData')
      expect(result).toHaveProperty('iv')
    })
  })
})

describe('PasswordSession', () => {
  const testGroupId = 'test-group-id'
  const testPassword = 'test-password'

  beforeEach(() => {
    PasswordSession.clearAllPasswords()
  })

  it('should store and retrieve passwords', () => {
    PasswordSession.setPassword(testGroupId, testPassword)
    expect(PasswordSession.getPassword(testGroupId)).toBe(testPassword)
    expect(PasswordSession.hasPassword(testGroupId)).toBe(true)
  })

  it('should clear individual passwords', () => {
    PasswordSession.setPassword(testGroupId, testPassword)
    PasswordSession.clearPassword(testGroupId)
    expect(PasswordSession.getPassword(testGroupId)).toBeUndefined()
    expect(PasswordSession.hasPassword(testGroupId)).toBe(false)
  })

  it('should clear all passwords', () => {
    PasswordSession.setPassword('group1', 'pass1')
    PasswordSession.setPassword('group2', 'pass2')
    
    PasswordSession.clearAllPasswords()
    
    expect(PasswordSession.getPassword('group1')).toBeUndefined()
    expect(PasswordSession.getPassword('group2')).toBeUndefined()
  })
})