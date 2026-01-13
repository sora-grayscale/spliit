/**
 * Balance calculation tests
 * Tests for getBalances, getSuggestedReimbursements, getPublicBalances
 */

import {
  Balances,
  ExpenseForBalance,
  getBalances,
  getPublicBalances,
  getSuggestedReimbursements,
  Reimbursement,
} from './balances'

describe('getBalances', () => {
  describe('EVENLY split mode', () => {
    it('should split expense evenly among participants', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 300,
          splitMode: 'EVENLY',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: 1, participant: { id: 'alice' } },
            { shares: 1, participant: { id: 'bob' } },
            { shares: 1, participant: { id: 'charlie' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      expect(balances.alice).toEqual({ paid: 300, paidFor: 100, total: 200 })
      expect(balances.bob).toEqual({ paid: 0, paidFor: 100, total: -100 })
      expect(balances.charlie).toEqual({ paid: 0, paidFor: 100, total: -100 })
    })

    it('should handle string amounts', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: '300',
          splitMode: 'EVENLY',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: '1', participant: { id: 'alice' } },
            { shares: '1', participant: { id: 'bob' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      expect(balances.alice).toEqual({ paid: 300, paidFor: 150, total: 150 })
      expect(balances.bob).toEqual({ paid: 0, paidFor: 150, total: -150 })
    })

    it('should handle rounding correctly for uneven splits', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 100,
          splitMode: 'EVENLY',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: 1, participant: { id: 'alice' } },
            { shares: 1, participant: { id: 'bob' } },
            { shares: 1, participant: { id: 'charlie' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      // Due to rounding (100/3 = 33.33), last participant gets remainder
      // The algorithm assigns remaining amount to the last participant
      // Each gets 33 (rounded), and remaining goes to last = 34
      // Total paidFor should be close to 100 (within rounding tolerance)
      const totalPaidFor =
        balances.alice.paidFor + balances.bob.paidFor + balances.charlie.paidFor
      expect(totalPaidFor).toBeGreaterThanOrEqual(99)
      expect(totalPaidFor).toBeLessThanOrEqual(100)
    })
  })

  describe('BY_SHARES split mode', () => {
    it('should split expense by shares', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 100,
          splitMode: 'BY_SHARES',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: 2, participant: { id: 'alice' } },
            { shares: 3, participant: { id: 'bob' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      expect(balances.alice).toEqual({ paid: 100, paidFor: 40, total: 60 })
      expect(balances.bob).toEqual({ paid: 0, paidFor: 60, total: -60 })
    })

    it('should handle string shares', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 100,
          splitMode: 'BY_SHARES',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: '1', participant: { id: 'alice' } },
            { shares: '1', participant: { id: 'bob' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      expect(balances.alice.paidFor).toBe(50)
      expect(balances.bob.paidFor).toBe(50)
    })
  })

  describe('BY_PERCENTAGE split mode', () => {
    it('should split expense by percentage', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 100,
          splitMode: 'BY_PERCENTAGE',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: 30, participant: { id: 'alice' } }, // 30%
            { shares: 70, participant: { id: 'bob' } }, // 70%
          ],
        },
      ]

      const balances = getBalances(expenses)

      expect(balances.alice).toEqual({ paid: 100, paidFor: 30, total: 70 })
      expect(balances.bob).toEqual({ paid: 0, paidFor: 70, total: -70 })
    })
  })

  describe('BY_AMOUNT split mode', () => {
    it('should split expense by exact amounts', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 100,
          splitMode: 'BY_AMOUNT',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: 25, participant: { id: 'alice' } },
            { shares: 75, participant: { id: 'bob' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      expect(balances.alice).toEqual({ paid: 100, paidFor: 25, total: 75 })
      expect(balances.bob).toEqual({ paid: 0, paidFor: 75, total: -75 })
    })
  })

  describe('multiple expenses', () => {
    it('should accumulate balances across multiple expenses', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 100,
          splitMode: 'EVENLY',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: 1, participant: { id: 'alice' } },
            { shares: 1, participant: { id: 'bob' } },
          ],
        },
        {
          amount: 50,
          splitMode: 'EVENLY',
          paidBy: { id: 'bob' },
          paidFor: [
            { shares: 1, participant: { id: 'alice' } },
            { shares: 1, participant: { id: 'bob' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      // Alice: paid 100, paidFor 50+25=75 -> total 25
      // Bob: paid 50, paidFor 50+25=75 -> total -25
      expect(balances.alice).toEqual({ paid: 100, paidFor: 75, total: 25 })
      expect(balances.bob).toEqual({ paid: 50, paidFor: 75, total: -25 })
    })
  })

  describe('edge cases', () => {
    it('should handle empty expenses array', () => {
      const balances = getBalances([])
      expect(balances).toEqual({})
    })

    it('should handle zero amounts', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 0,
          splitMode: 'EVENLY',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: 1, participant: { id: 'alice' } },
            { shares: 1, participant: { id: 'bob' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      expect(balances.alice).toEqual({ paid: 0, paidFor: 0, total: 0 })
      expect(balances.bob).toEqual({ paid: 0, paidFor: 0, total: 0 })
    })

    it('should avoid negative zeros in output', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 100,
          splitMode: 'EVENLY',
          paidBy: { id: 'alice' },
          paidFor: [
            { shares: 1, participant: { id: 'alice' } },
            { shares: 1, participant: { id: 'bob' } },
          ],
        },
        {
          amount: 100,
          splitMode: 'EVENLY',
          paidBy: { id: 'bob' },
          paidFor: [
            { shares: 1, participant: { id: 'alice' } },
            { shares: 1, participant: { id: 'bob' } },
          ],
        },
      ]

      const balances = getBalances(expenses)

      // Should be 0, not -0
      expect(Object.is(balances.alice.total, -0)).toBe(false)
      expect(Object.is(balances.bob.total, -0)).toBe(false)
    })

    it('should handle single participant', () => {
      const expenses: ExpenseForBalance[] = [
        {
          amount: 100,
          splitMode: 'EVENLY',
          paidBy: { id: 'alice' },
          paidFor: [{ shares: 1, participant: { id: 'alice' } }],
        },
      ]

      const balances = getBalances(expenses)

      expect(balances.alice).toEqual({ paid: 100, paidFor: 100, total: 0 })
    })
  })
})

describe('getSuggestedReimbursements', () => {
  it('should suggest simple reimbursement for two participants', () => {
    const balances: Balances = {
      alice: { paid: 100, paidFor: 50, total: 50 },
      bob: { paid: 0, paidFor: 50, total: -50 },
    }

    const reimbursements = getSuggestedReimbursements(balances)

    expect(reimbursements).toHaveLength(1)
    expect(reimbursements[0]).toEqual({ from: 'bob', to: 'alice', amount: 50 })
  })

  it('should handle three participants with different balances', () => {
    const balances: Balances = {
      alice: { paid: 300, paidFor: 100, total: 200 },
      bob: { paid: 0, paidFor: 100, total: -100 },
      charlie: { paid: 0, paidFor: 100, total: -100 },
    }

    const reimbursements = getSuggestedReimbursements(balances)

    // Total reimbursement should equal 200 (total positive balance)
    const totalReimbursement = reimbursements.reduce(
      (sum, r) => sum + r.amount,
      0,
    )
    expect(totalReimbursement).toBe(200)

    // All reimbursements should be to alice
    reimbursements.forEach((r) => {
      expect(r.to).toBe('alice')
    })
  })

  it('should handle balanced accounts (no reimbursements needed)', () => {
    const balances: Balances = {
      alice: { paid: 50, paidFor: 50, total: 0 },
      bob: { paid: 50, paidFor: 50, total: 0 },
    }

    const reimbursements = getSuggestedReimbursements(balances)

    expect(reimbursements).toHaveLength(0)
  })

  it('should filter out zero-amount reimbursements after rounding', () => {
    const balances: Balances = {
      alice: { paid: 100, paidFor: 100, total: 0.001 }, // Nearly zero
      bob: { paid: 100, paidFor: 100, total: -0.001 },
    }

    const reimbursements = getSuggestedReimbursements(balances)

    // Should be filtered out because rounds to 0
    expect(reimbursements).toHaveLength(0)
  })

  it('should handle complex multi-way reimbursements', () => {
    const balances: Balances = {
      alice: { paid: 200, paidFor: 100, total: 100 },
      bob: { paid: 100, paidFor: 100, total: 0 },
      charlie: { paid: 0, paidFor: 50, total: -50 },
      dave: { paid: 0, paidFor: 50, total: -50 },
    }

    const reimbursements = getSuggestedReimbursements(balances)

    // Total should balance out
    const totalFromNegative = reimbursements.reduce(
      (sum, r) => sum + r.amount,
      0,
    )
    expect(totalFromNegative).toBe(100) // charlie(-50) + dave(-50) = alice(100)
  })
})

describe('getPublicBalances', () => {
  it('should convert reimbursements to balances', () => {
    const reimbursements: Reimbursement[] = [
      { from: 'bob', to: 'alice', amount: 50 },
    ]

    const balances = getPublicBalances(reimbursements)

    expect(balances.bob).toEqual({ paid: 0, paidFor: 50, total: -50 })
    expect(balances.alice).toEqual({ paid: 50, paidFor: 0, total: 50 })
  })

  it('should handle multiple reimbursements', () => {
    const reimbursements: Reimbursement[] = [
      { from: 'bob', to: 'alice', amount: 50 },
      { from: 'charlie', to: 'alice', amount: 30 },
    ]

    const balances = getPublicBalances(reimbursements)

    expect(balances.alice).toEqual({ paid: 80, paidFor: 0, total: 80 })
    expect(balances.bob).toEqual({ paid: 0, paidFor: 50, total: -50 })
    expect(balances.charlie).toEqual({ paid: 0, paidFor: 30, total: -30 })
  })

  it('should handle empty reimbursements', () => {
    const balances = getPublicBalances([])
    expect(balances).toEqual({})
  })
})
