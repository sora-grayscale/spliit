/**
 * Jest setup for E2EE testing environment
 */

import '@testing-library/jest-dom'

// Setup additional test utilities if needed
beforeEach(() => {
  // Clear any crypto mocks between tests
  jest.clearAllMocks()
})