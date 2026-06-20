import { describe, it, expect } from 'vitest'
import { getFactorizations, pickFactorization } from '../domain/factorization'
import { PLAYABLE_PRODUCTS } from '../domain/products'

describe('getFactorizations', () => {
  it('incluye [2,9] y [3,6] para 18 con allowFactorOne=true', () => {
    const result = getFactorizations(18, true)
    expect(result).toContainEqual([2, 9])
    expect(result).toContainEqual([3, 6])
  })

  it('incluye [2,6] y [3,4] para 12 con allowFactorOne=true', () => {
    const result = getFactorizations(12, true)
    expect(result).toContainEqual([2, 6])
    expect(result).toContainEqual([3, 4])
  })

  it('getFactorizations(4, false) === [[2,2]]', () => {
    expect(getFactorizations(4, false)).toEqual([[2, 2]])
  })

  it('getFactorizations(49, false) === [[7,7]]', () => {
    expect(getFactorizations(49, false)).toEqual([[7, 7]])
  })

  it('excluye pares con factor 1 cuando allowFactorOne=false', () => {
    const result = getFactorizations(7, false)
    expect(result).toEqual([])
  })

  it('incluye par con factor 1 cuando allowFactorOne=true', () => {
    const result = getFactorizations(7, true)
    expect(result).toContainEqual([1, 7])
  })

  it('retorna pares canónicos con a<=b (sin duplicar orden)', () => {
    const result = getFactorizations(12, true)
    for (const [a, b] of result) {
      expect(a).toBeLessThanOrEqual(b)
    }
  })
})

describe('pickFactorization', () => {
  it('es determinista con random inyectado ()=>0 (toma la primera)', () => {
    const result = pickFactorization(18, true, () => 0)
    const options = getFactorizations(18, true)
    expect(result).toEqual(options[0])
  })

  it('toma el último elemento con random inyectado ()=>0.999', () => {
    const options = getFactorizations(12, true)
    const result = pickFactorization(12, true, () => 0.999)
    expect(result).toEqual(options[options.length - 1])
  })

  it('lanza Error cuando no hay factorización válida', () => {
    expect(() => pickFactorization(7, false)).toThrow()
  })

  it('lanza Error con mensaje claro para producto sin factores válidos', () => {
    expect(() => pickFactorization(11, false)).toThrow(/factorization/i)
  })
})

describe('pool jugable nunca necesita el fallback ×1', () => {
  // Garantía de regresión: con el toggle por defecto (excluir triviales),
  // CADA producto del pool 4x4 tiene al menos una factorización SIN factor 1.
  // Por eso el cantor jamás debe mostrar una operación "× 1".
  it('cada producto jugable tiene factorización sin factor 1', () => {
    for (const product of PLAYABLE_PRODUCTS) {
      const options = getFactorizations(product, false)
      expect(options.length).toBeGreaterThan(0)
      for (const [a, b] of options) {
        expect(a).not.toBe(1)
        expect(b).not.toBe(1)
      }
    }
  })
})
