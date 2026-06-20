import { Board, RandomFn } from '../domain/types'

function shuffleArray(arr: number[], random: RandomFn): number[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const FACTORIAL_9 = 362880

export function generate3x3Boards(count: number, random: RandomFn = Math.random): Board[] {
  if (count > FACTORIAL_9) {
    throw new Error(
      `No es posible generar ${count} boards 3x3 únicos: el máximo es ${FACTORIAL_9} (9!).`
    )
  }

  const base = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const seen = new Set<string>()
  const boards: Board[] = []

  const maxAttempts = count * 100
  let attempts = 0

  while (boards.length < count && attempts < maxAttempts) {
    attempts++
    const cells = shuffleArray(base, random)
    const key = cells.join(',')
    if (!seen.has(key)) {
      seen.add(key)
      boards.push({ type: '3x3', cells })
    }
  }

  if (boards.length < count) {
    throw new Error(
      `No se pudieron generar ${count} boards 3x3 únicos tras ${maxAttempts} intentos.`
    )
  }

  return boards
}

export function generate4x4Boards(
  count: number,
  pool: number[],
  random: RandomFn = Math.random
): Board[] {
  if (pool.length < 16) {
    throw new Error(
      `El pool debe tener al menos 16 elementos para boards 4x4, pero tiene ${pool.length}.`
    )
  }

  // Upper bound: C(pool.length, 16) * 16!  — astronomically large for typical pools,
  // but we compute a practical cap to catch clearly impossible requests.
  // C(n,16) * 16! = P(n,16) = n!/(n-16)!
  const n = pool.length
  let maxUnique = 1
  for (let i = 0; i < 16; i++) {
    maxUnique *= n - i
    if (maxUnique > Number.MAX_SAFE_INTEGER) {
      maxUnique = Number.MAX_SAFE_INTEGER
      break
    }
  }

  if (count > maxUnique) {
    throw new Error(
      `No es posible generar ${count} boards 4x4 únicos con un pool de ${pool.length} elementos (máximo factible: ${maxUnique}).`
    )
  }

  const seen = new Set<string>()
  const boards: Board[] = []

  const maxAttempts = count * 200
  let attempts = 0

  while (boards.length < count && attempts < maxAttempts) {
    attempts++
    // Pick 16 distinct values from pool then shuffle them
    const shuffledPool = shuffleArray(pool, random)
    const cells = shuffledPool.slice(0, 16)
    const key = cells.join(',')
    if (!seen.has(key)) {
      seen.add(key)
      boards.push({ type: '4x4', cells })
    }
  }

  if (boards.length < count) {
    throw new Error(
      `No se pudieron generar ${count} boards 4x4 únicos tras ${maxAttempts} intentos.`
    )
  }

  return boards
}
