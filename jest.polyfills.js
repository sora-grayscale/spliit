/**
 * Jest polyfills for Web APIs required by E2EE crypto functionality
 */

// TextEncoder and TextDecoder polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util')

Object.assign(global, {
  TextEncoder,
  TextDecoder,
})

// Basic crypto polyfill for testing
Object.assign(global, {
  crypto: {
    getRandomValues: jest.fn((arr) => {
      // Fill with deterministic values for testing
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
    subtle: {
      importKey: jest.fn().mockResolvedValue({}),
      deriveKey: jest.fn().mockResolvedValue({}),
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
})