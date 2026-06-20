import { Addition, RandomFn } from '../domain/types'

/**
 * Devuelve todas las sumas a + b = target con a <= b (sin duplicar orden).
 * Los sumandos van de 1 a 9, salvo que allowZero permita el 0.
 * Ejemplo: getAdditions(5, false) => [[1, 4], [2, 3]]
 */
export function getAdditions(target: number, allowZero: boolean): Addition[] {
  const result: Addition[] = []
  const min = allowZero ? 0 : 1
  for (let a = min; a <= 9; a++) {
    for (let b = a; b <= 9; b++) {
      if (a + b === target) {
        result.push([a, b])
      }
    }
  }
  return result
}

export function pickAddition(
  target: number,
  allowZero: boolean,
  random: RandomFn = Math.random
): Addition {
  const options = getAdditions(target, allowZero)
  if (options.length === 0) {
    throw new Error(
      `No valid addition found for target ${target} (allowZero=${allowZero})`
    )
  }
  const index = Math.floor(random() * options.length)
  return options[index]
}
