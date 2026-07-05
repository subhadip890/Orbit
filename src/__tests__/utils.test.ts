/**
 * utils.test.ts — Level 3
 * Unit tests for XLM/stroop conversion utilities.
 */
import { describe, it, expect } from 'vitest'
import { xlmToStroops, stroopsToXlm } from '../hooks/useCampaigns'

describe('xlmToStroops', () => {
  it('converts 1 XLM to 10_000_000 stroops', () => {
    expect(xlmToStroops(1)).toBe(10_000_000n)
  })

  it('converts 0.5 XLM correctly', () => {
    expect(xlmToStroops(0.5)).toBe(5_000_000n)
  })

  it('converts 100 XLM correctly', () => {
    expect(xlmToStroops(100)).toBe(1_000_000_000n)
  })

  it('returns 0n for 0 XLM', () => {
    expect(xlmToStroops(0)).toBe(0n)
  })
})

describe('stroopsToXlm', () => {
  it('converts 10_000_000 stroops to "1.00"', () => {
    expect(stroopsToXlm(10_000_000)).toBe('1.00')
  })

  it('converts 0 to "0.00"', () => {
    expect(stroopsToXlm(0)).toBe('0.00')
  })

  it('converts BigInt stroops correctly', () => {
    expect(stroopsToXlm(1_000_000_000n)).toBe('100.00')
  })

  it('converts 5_000_000 stroops to "0.50"', () => {
    expect(stroopsToXlm(5_000_000)).toBe('0.50')
  })
})
