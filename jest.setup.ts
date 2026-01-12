import { webcrypto } from 'crypto'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill Web Crypto API for Node.js test environment
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
})

// Polyfill TextEncoder/TextDecoder for jsdom
Object.defineProperty(globalThis, 'TextEncoder', {
  value: TextEncoder,
})
Object.defineProperty(globalThis, 'TextDecoder', {
  value: TextDecoder,
})
