import { describe, it, expect } from 'vitest'
import { shuffle, createDeck, draw, isExhausted } from '../domain/deck'

/** Generador seeded determinista simple (mulberry32) */
function makeSeeded(seed: number): () => number {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('shuffle', () => {
  it('mantiene los mismos elementos', () => {
    const original = [1, 2, 3, 4, 5]
    const result = shuffle(original, makeSeeded(42))
    expect(result).toHaveLength(original.length)
    expect(result.sort((a, b) => a - b)).toEqual([...original].sort((a, b) => a - b))
  })

  it('es reproducible con la misma semilla', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const r1 = shuffle(items, makeSeeded(99))
    const r2 = shuffle(items, makeSeeded(99))
    expect(r1).toEqual(r2)
  })

  it('no muta el array original', () => {
    const original = [10, 20, 30]
    const copy = [...original]
    shuffle(original, makeSeeded(7))
    expect(original).toEqual(copy)
  })
})

describe('createDeck', () => {
  it('no muta el array original', () => {
    const items = [1, 2, 3]
    const copy = [...items]
    createDeck(items, makeSeeded(1))
    expect(items).toEqual(copy)
  })

  it('el deck contiene todos los items en remaining y drawn vacío', () => {
    const items = [1, 2, 3, 4]
    const deck = createDeck(items, makeSeeded(5))
    expect(deck.remaining).toHaveLength(4)
    expect(deck.drawn).toHaveLength(0)
    const sortedRemaining = [...deck.remaining].sort((a, b) => a - b)
    expect(sortedRemaining).toEqual([1, 2, 3, 4])
  })
})

describe('draw', () => {
  it('saca todos los items exactamente una vez sin repetir', () => {
    const items = [10, 20, 30, 40]
    let deck = createDeck(items, makeSeeded(3))
    const drawn: number[] = []

    for (let i = 0; i < items.length; i++) {
      const result = draw(deck)
      expect(result.value).not.toBeNull()
      drawn.push(result.value as number)
      deck = result.deck
    }

    expect(drawn.sort((a, b) => a - b)).toEqual([10, 20, 30, 40])
    // Sin duplicados
    expect(new Set(drawn).size).toBe(items.length)
  })

  it('devuelve value null e isExhausted true al agotarse', () => {
    const items = [1]
    let deck = createDeck(items, makeSeeded(2))

    const first = draw(deck)
    deck = first.deck

    const second = draw(deck)
    expect(second.value).toBeNull()
    expect(isExhausted(second.deck)).toBe(true)
  })

  it('no muta el deck de entrada', () => {
    const items = [1, 2, 3]
    const deck = createDeck(items, makeSeeded(8))
    const remainingSnapshot = [...deck.remaining]
    const drawnSnapshot = [...deck.drawn]

    draw(deck)

    expect(deck.remaining).toEqual(remainingSnapshot)
    expect(deck.drawn).toEqual(drawnSnapshot)
  })

  it('cada draw mueve el valor de remaining a drawn', () => {
    const items = ['a', 'b', 'c']
    let deck = createDeck(items, makeSeeded(11))

    const r1 = draw(deck)
    expect(r1.deck.remaining).toHaveLength(2)
    expect(r1.deck.drawn).toHaveLength(1)
    expect(r1.deck.drawn[0]).toBe(r1.value)

    deck = r1.deck
    const r2 = draw(deck)
    expect(r2.deck.remaining).toHaveLength(1)
    expect(r2.deck.drawn).toHaveLength(2)
  })
})

describe('isExhausted', () => {
  it('false para deck con elementos', () => {
    const deck = createDeck([1, 2], makeSeeded(0))
    expect(isExhausted(deck)).toBe(false)
  })

  it('true para deck vacío', () => {
    const emptyDeck = { remaining: [], drawn: [1, 2] }
    expect(isExhausted(emptyDeck)).toBe(true)
  })
})
