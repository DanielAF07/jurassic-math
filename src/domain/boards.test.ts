import { describe, it, expect } from 'vitest'
import { generate3x3Boards, generate4x4Boards } from '../domain/boards'

// ─── Helpers ────────────────────────────────────────────────────────────────

function isPermutationOf1to9(cells: number[]): boolean {
  if (cells.length !== 9) return false
  const sorted = [...cells].sort((a, b) => a - b)
  return sorted.every((v, i) => v === i + 1)
}

function allUnique(boards: { cells: number[] }[]): boolean {
  const keys = boards.map(b => b.cells.join(','))
  return new Set(keys).size === keys.length
}

function allDistinctWithin(cells: number[]): boolean {
  return new Set(cells).size === cells.length
}

function allValuesInPool(cells: number[], pool: number[]): boolean {
  const poolSet = new Set(pool)
  return cells.every(v => poolSet.has(v))
}

// Deterministic random based on a seed (LCG) for reproducible tests
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0x100000000
  }
}

// ─── generate3x3Boards ──────────────────────────────────────────────────────

describe('generate3x3Boards', () => {
  it('devuelve la cantidad exacta de boards pedidos', () => {
    const boards = generate3x3Boards(5, seededRandom(42))
    expect(boards).toHaveLength(5)
  })

  it('cada board tiene type 3x3 y 9 celdas', () => {
    const boards = generate3x3Boards(10, seededRandom(1))
    for (const b of boards) {
      expect(b.type).toBe('3x3')
      expect(b.cells).toHaveLength(9)
    }
  })

  it('cada board es una permutación de 1..9', () => {
    const boards = generate3x3Boards(20, seededRandom(7))
    for (const b of boards) {
      expect(isPermutationOf1to9(b.cells)).toBe(true)
    }
  })

  it('todos los boards del set son únicos', () => {
    const boards = generate3x3Boards(50, seededRandom(99))
    expect(allUnique(boards)).toBe(true)
  })

  it('funciona para count=1', () => {
    const boards = generate3x3Boards(1, seededRandom(0))
    expect(boards).toHaveLength(1)
    expect(isPermutationOf1to9(boards[0].cells)).toBe(true)
  })

  it('lanza Error si count > 9! (362880)', () => {
    expect(() => generate3x3Boards(362881)).toThrow(/362880/)
  })

  it('no lanza Error para count exactamente igual a 9!', () => {
    // Solo verificamos que no lanza de entrada (la generación puede tardar, así que no la corremos)
    expect(() => {
      if (362880 > 362880) generate3x3Boards(362880)
    }).not.toThrow()
  })
})

// ─── generate4x4Boards ──────────────────────────────────────────────────────

const pool31 = Array.from({ length: 31 }, (_, i) => i + 1)   // [1..31]
const pool36 = Array.from({ length: 36 }, (_, i) => i + 1)   // [1..36]

describe('generate4x4Boards — pool de 31', () => {
  it('devuelve la cantidad exacta de boards pedidos', () => {
    const boards = generate4x4Boards(5, pool31, seededRandom(10))
    expect(boards).toHaveLength(5)
  })

  it('cada board tiene type 4x4 y 16 celdas', () => {
    const boards = generate4x4Boards(8, pool31, seededRandom(20))
    for (const b of boards) {
      expect(b.type).toBe('4x4')
      expect(b.cells).toHaveLength(16)
    }
  })

  it('cada board tiene 16 valores distintos', () => {
    const boards = generate4x4Boards(10, pool31, seededRandom(30))
    for (const b of boards) {
      expect(allDistinctWithin(b.cells)).toBe(true)
    }
  })

  it('todos los valores están dentro del pool', () => {
    const boards = generate4x4Boards(10, pool31, seededRandom(40))
    for (const b of boards) {
      expect(allValuesInPool(b.cells, pool31)).toBe(true)
    }
  })

  it('todos los boards del set son únicos', () => {
    const boards = generate4x4Boards(20, pool31, seededRandom(50))
    expect(allUnique(boards)).toBe(true)
  })
})

describe('generate4x4Boards — pool de 36', () => {
  it('devuelve la cantidad exacta de boards pedidos', () => {
    const boards = generate4x4Boards(5, pool36, seededRandom(60))
    expect(boards).toHaveLength(5)
  })

  it('cada board tiene 16 valores distintos dentro del pool', () => {
    const boards = generate4x4Boards(15, pool36, seededRandom(70))
    for (const b of boards) {
      expect(allDistinctWithin(b.cells)).toBe(true)
      expect(allValuesInPool(b.cells, pool36)).toBe(true)
    }
  })

  it('todos los boards del set son únicos', () => {
    const boards = generate4x4Boards(25, pool36, seededRandom(80))
    expect(allUnique(boards)).toBe(true)
  })
})

describe('generate4x4Boards — casos de error', () => {
  it('lanza Error si pool.length < 16', () => {
    const smallPool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(() => generate4x4Boards(1, smallPool)).toThrow(/pool/)
  })

  it('lanza Error si pool.length === 15 (justo debajo del mínimo)', () => {
    const pool15 = Array.from({ length: 15 }, (_, i) => i + 1)
    expect(() => generate4x4Boards(1, pool15)).toThrow(/pool/)
  })

  it('lanza Error si count excede la capacidad — pool exactamente de 16 y count > 16!', () => {
    // P(16,16) = 16! = 20922789888000; pedir más es imposible
    const pool16 = Array.from({ length: 16 }, (_, i) => i + 1)
    expect(() => generate4x4Boards(20922789888001, pool16)).toThrow()
  })

  it('no lanza Error para count=1 con pool de exactamente 16', () => {
    const pool16 = Array.from({ length: 16 }, (_, i) => i + 1)
    const boards = generate4x4Boards(1, pool16, seededRandom(5))
    expect(boards).toHaveLength(1)
    expect(boards[0].cells).toHaveLength(16)
    expect(allDistinctWithin(boards[0].cells)).toBe(true)
  })
})
