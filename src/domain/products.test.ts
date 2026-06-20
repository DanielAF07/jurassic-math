import { describe, it, expect } from 'vitest'
import {
  FULL_PRODUCTS,
  TRIVIAL_X1,
  PLAYABLE_PRODUCTS,
  getProductPool,
  deriveDistinctProducts,
} from './products'

describe('products', () => {
  describe('FULL_PRODUCTS', () => {
    it('should match the derived distinct products', () => {
      const derived = deriveDistinctProducts()
      expect(FULL_PRODUCTS).toEqual(derived)
    })

    it('should be sorted in ascending order', () => {
      const sorted = [...FULL_PRODUCTS].sort((a, b) => a - b)
      expect(FULL_PRODUCTS).toEqual(sorted)
    })

    it('should have 36 elements', () => {
      expect(FULL_PRODUCTS).toHaveLength(36)
    })
  })

  describe('TRIVIAL_X1', () => {
    it('should contain products only obtained by multiplying by 1', () => {
      expect(TRIVIAL_X1).toEqual([1, 2, 3, 5, 7])
    })
  })

  describe('PLAYABLE_PRODUCTS', () => {
    it('should have 31 elements', () => {
      expect(PLAYABLE_PRODUCTS).toHaveLength(31)
    })

    it('should be FULL_PRODUCTS without TRIVIAL_X1', () => {
      const expected = FULL_PRODUCTS.filter((p) => !TRIVIAL_X1.includes(p))
      expect(PLAYABLE_PRODUCTS).toEqual(expected)
    })

    it('should not contain any trivial products', () => {
      for (const trivial of TRIVIAL_X1) {
        expect(PLAYABLE_PRODUCTS).not.toContain(trivial)
      }
    })

    it('should be sorted in ascending order', () => {
      const sorted = [...PLAYABLE_PRODUCTS].sort((a, b) => a - b)
      expect(PLAYABLE_PRODUCTS).toEqual(sorted)
    })
  })

  describe('getProductPool', () => {
    it('should return PLAYABLE_PRODUCTS when excludeTrivial is true', () => {
      expect(getProductPool(true)).toEqual(PLAYABLE_PRODUCTS)
    })

    it('should return FULL_PRODUCTS when excludeTrivial is false', () => {
      expect(getProductPool(false)).toEqual(FULL_PRODUCTS)
    })
  })

  describe('deriveDistinctProducts', () => {
    it('should compute all distinct products from a×b where a,b ∈ [1,9]', () => {
      const derived = deriveDistinctProducts()
      expect(derived).toHaveLength(36)
      expect(derived).toEqual(FULL_PRODUCTS)
    })

    it('should return products in ascending order', () => {
      const derived = deriveDistinctProducts()
      const sorted = [...derived].sort((a, b) => a - b)
      expect(derived).toEqual(sorted)
    })

    it('should cover all unique products from the multiplication table', () => {
      const derived = new Set(deriveDistinctProducts())
      for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= 9; b++) {
          expect(derived.has(a * b)).toBe(true)
        }
      }
    })
  })
})
