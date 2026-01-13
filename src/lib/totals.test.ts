/**
 * Totals calculation tests
 * Tests for getTotalGroupSpending, calculateShare, getTotalActiveUserPaidFor, getTotalActiveUserShare
 */

import {
  calculateShare,
  ExpenseForTotals,
  getTotalActiveUserPaidFor,
  getTotalActiveUserShare,
  getTotalGroupSpending,
} from './totals'

describe('getTotalGroupSpending', () => {
  it('should sum all non-reimbursement expenses', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      },
      {
        amount: 50,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'bob' },
        paidFor: [{ shares: 1, participant: { id: 'alice' } }],
      },
    ]

    const total = getTotalGroupSpending(expenses)
    expect(total).toBe(150)
  })

  it('should exclude reimbursement expenses', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      },
      {
        amount: 50,
        splitMode: 'EVENLY',
        isReimbursement: true, // Should be excluded
        paidBy: { id: 'bob' },
        paidFor: [{ shares: 1, participant: { id: 'alice' } }],
      },
    ]

    const total = getTotalGroupSpending(expenses)
    expect(total).toBe(100) // Only the non-reimbursement expense
  })

  it('should handle string amounts', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: '100',
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      },
    ]

    const total = getTotalGroupSpending(expenses)
    expect(total).toBe(100)
  })

  it('should return 0 for empty expenses', () => {
    const total = getTotalGroupSpending([])
    expect(total).toBe(0)
  })
})

describe('getTotalActiveUserPaidFor', () => {
  it('should sum expenses paid by active user', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      },
      {
        amount: 50,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'bob' },
        paidFor: [{ shares: 1, participant: { id: 'alice' } }],
      },
    ]

    const total = getTotalActiveUserPaidFor('alice', expenses)
    expect(total).toBe(100)
  })

  it('should exclude reimbursements paid by active user', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      },
      {
        amount: 50,
        splitMode: 'EVENLY',
        isReimbursement: true, // Should be excluded
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      },
    ]

    const total = getTotalActiveUserPaidFor('alice', expenses)
    expect(total).toBe(100)
  })

  it('should return 0 if user has no paid expenses', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'bob' },
        paidFor: [{ shares: 1, participant: { id: 'alice' } }],
      },
    ]

    const total = getTotalActiveUserPaidFor('alice', expenses)
    expect(total).toBe(0)
  })

  it('should return 0 if activeUserId is null', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      },
    ]

    const total = getTotalActiveUserPaidFor(null, expenses)
    expect(total).toBe(0)
  })
})

describe('calculateShare', () => {
  describe('EVENLY split mode', () => {
    it('should calculate even share', () => {
      const expense: ExpenseForTotals = {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [
          { shares: 1, participant: { id: 'alice' } },
          { shares: 1, participant: { id: 'bob' } },
        ],
      }

      expect(calculateShare('alice', expense)).toBe(50)
      expect(calculateShare('bob', expense)).toBe(50)
    })
  })

  describe('BY_SHARES split mode', () => {
    it('should calculate share based on shares', () => {
      const expense: ExpenseForTotals = {
        amount: 100,
        splitMode: 'BY_SHARES',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [
          { shares: 1, participant: { id: 'alice' } },
          { shares: 3, participant: { id: 'bob' } },
        ],
      }

      expect(calculateShare('alice', expense)).toBe(25) // 1/4
      expect(calculateShare('bob', expense)).toBe(75) // 3/4
    })
  })

  describe('BY_PERCENTAGE split mode', () => {
    it('should calculate share based on percentage', () => {
      const expense: ExpenseForTotals = {
        amount: 100,
        splitMode: 'BY_PERCENTAGE',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [
          { shares: 4000, participant: { id: 'alice' } }, // 40%
          { shares: 6000, participant: { id: 'bob' } }, // 60%
        ],
      }

      expect(calculateShare('alice', expense)).toBe(40)
      expect(calculateShare('bob', expense)).toBe(60)
    })
  })

  describe('BY_AMOUNT split mode', () => {
    it('should return exact share amount', () => {
      const expense: ExpenseForTotals = {
        amount: 100,
        splitMode: 'BY_AMOUNT',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [
          { shares: 30, participant: { id: 'alice' } },
          { shares: 70, participant: { id: 'bob' } },
        ],
      }

      expect(calculateShare('alice', expense)).toBe(30)
      expect(calculateShare('bob', expense)).toBe(70)
    })
  })

  describe('edge cases', () => {
    it('should return 0 for reimbursements', () => {
      const expense: ExpenseForTotals = {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: true,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      }

      expect(calculateShare('bob', expense)).toBe(0)
    })

    it('should return 0 if participant not in paidFor', () => {
      const expense: ExpenseForTotals = {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      }

      expect(calculateShare('charlie', expense)).toBe(0)
    })

    it('should return 0 if participantId is null', () => {
      const expense: ExpenseForTotals = {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'bob' } }],
      }

      expect(calculateShare(null, expense)).toBe(0)
    })
  })
})

describe('getTotalActiveUserShare', () => {
  it('should sum user share across all expenses', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [
          { shares: 1, participant: { id: 'alice' } },
          { shares: 1, participant: { id: 'bob' } },
        ],
      },
      {
        amount: 50,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'bob' },
        paidFor: [
          { shares: 1, participant: { id: 'alice' } },
          { shares: 1, participant: { id: 'bob' } },
        ],
      },
    ]

    const total = getTotalActiveUserShare('alice', expenses)
    expect(total).toBe(75) // 50 + 25
  })

  it('should exclude reimbursements', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [{ shares: 1, participant: { id: 'alice' } }],
      },
      {
        amount: 50,
        splitMode: 'EVENLY',
        isReimbursement: true,
        paidBy: { id: 'bob' },
        paidFor: [{ shares: 1, participant: { id: 'alice' } }],
      },
    ]

    const total = getTotalActiveUserShare('alice', expenses)
    expect(total).toBe(100) // Only first expense, reimbursement excluded
  })

  it('should return 0 for empty expenses', () => {
    const total = getTotalActiveUserShare('alice', [])
    expect(total).toBe(0)
  })

  it('should round to 2 decimal places', () => {
    const expenses: ExpenseForTotals[] = [
      {
        amount: 100,
        splitMode: 'EVENLY',
        isReimbursement: false,
        paidBy: { id: 'alice' },
        paidFor: [
          { shares: 1, participant: { id: 'alice' } },
          { shares: 1, participant: { id: 'bob' } },
          { shares: 1, participant: { id: 'charlie' } },
        ],
      },
    ]

    const total = getTotalActiveUserShare('alice', expenses)
    // 100 / 3 = 33.333... should be rounded to 33.33
    expect(total).toBe(33.33)
  })
})
