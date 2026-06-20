import { describe, it, expect } from 'vitest'
import { getAdditions, pickAddition } from './addition'

describe('getAdditions', () => {
  it('devuelve sumas canónicas a <= b con sumandos >= 1', () => {
    expect(getAdditions(5, false)).toEqual([
      [1, 4],
      [2, 3],
    ])
  })

  it('incluye sumas con sumandos iguales (1 + 1 = 2)', () => {
    expect(getAdditions(2, false)).toEqual([[1, 1]])
  })

  it('cubre todas las parejas de un número mayor (9)', () => {
    expect(getAdditions(9, false)).toEqual([
      [1, 8],
      [2, 7],
      [3, 6],
      [4, 5],
    ])
  })

  it('sin el 0, el target 1 no tiene sumas', () => {
    expect(getAdditions(1, false)).toEqual([])
  })

  it('con allowZero, el target 1 se expresa como 0 + 1', () => {
    expect(getAdditions(1, true)).toEqual([[0, 1]])
  })

  it('con allowZero incluye las parejas con 0', () => {
    expect(getAdditions(5, true)).toEqual([
      [0, 5],
      [1, 4],
      [2, 3],
    ])
  })
})

describe('pickAddition', () => {
  it('es determinista con un random inyectado (toma la primera)', () => {
    expect(pickAddition(5, false, () => 0)).toEqual([1, 4])
  })

  it('toma la última con random cercano a 1', () => {
    expect(pickAddition(5, false, () => 0.999)).toEqual([2, 3])
  })

  it('lanza Error si no hay suma válida', () => {
    expect(() => pickAddition(1, false)).toThrow()
  })

  it('con allowZero resuelve el caso borde del 1', () => {
    expect(pickAddition(1, true, () => 0)).toEqual([0, 1])
  })
})
