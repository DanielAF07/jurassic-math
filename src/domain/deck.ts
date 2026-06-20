import { Deck, RandomFn } from '../domain/types'

export function shuffle<T>(items: T[], random: RandomFn = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

export function createDeck<T>(items: T[], random: RandomFn = Math.random): Deck<T> {
  return {
    remaining: shuffle(items, random),
    drawn: [],
  }
}

export function draw<T>(deck: Deck<T>): { deck: Deck<T>; value: T | null } {
  if (deck.remaining.length === 0) {
    return { deck, value: null }
  }
  const [value, ...rest] = deck.remaining
  return {
    deck: {
      remaining: rest,
      drawn: [...deck.drawn, value],
    },
    value,
  }
}

export function isExhausted<T>(deck: Deck<T>): boolean {
  return deck.remaining.length === 0
}
