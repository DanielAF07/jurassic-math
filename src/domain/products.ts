/**
 * Domain logic for lottery products (multiplication results).
 * Products are all unique results of a × b where a, b ∈ [1, 9].
 */

/**
 * Computes the set of all distinct products from a × b where a, b ∈ [1, 9],
 * sorted in ascending order.
 */
export function deriveDistinctProducts(): number[] {
  const products = new Set<number>()
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      products.add(a * b)
    }
  }
  return Array.from(products).sort((x, y) => x - y)
}

/**
 * All 36 distinct products from multiplications a×b (a,b ∈ [1,9]).
 * Computed once and cached.
 */
export const FULL_PRODUCTS: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28,
  30, 32, 35, 36, 40, 42, 45, 48, 49, 54, 56, 63, 64, 72, 81,
]

/**
 * Products that are ONLY obtained by multiplying by 1.
 * These are trivial and often excluded from playable pools.
 */
export const TRIVIAL_X1: number[] = [1, 2, 3, 5, 7]

/**
 * Playable products: all distinct products excluding those that only appear
 * when one factor is 1. This gives a more interesting lottery pool.
 */
export const PLAYABLE_PRODUCTS: number[] = FULL_PRODUCTS.filter(
  (p) => !TRIVIAL_X1.includes(p)
)

/**
 * Returns the product pool based on whether trivial (×1) products are excluded.
 * @param excludeTrivial - If true, returns PLAYABLE_PRODUCTS; otherwise FULL_PRODUCTS.
 */
export function getProductPool(excludeTrivial: boolean): number[] {
  return excludeTrivial ? PLAYABLE_PRODUCTS : FULL_PRODUCTS
}
