import { Factorization, RandomFn } from '../domain/types'

export function getFactorizations(product: number, allowFactorOne: boolean): Factorization[] {
  const result: Factorization[] = []
  for (let a = 1; a <= 9; a++) {
    for (let b = a; b <= 9; b++) {
      if (a * b === product) {
        if (!allowFactorOne && (a === 1 || b === 1)) continue
        result.push([a, b])
      }
    }
  }
  return result
}

export function pickFactorization(
  product: number,
  allowFactorOne: boolean,
  random: RandomFn = Math.random
): Factorization {
  const options = getFactorizations(product, allowFactorOne)
  if (options.length === 0) {
    throw new Error(
      `No valid factorization found for product ${product} (allowFactorOne=${allowFactorOne})`
    )
  }
  const index = Math.floor(random() * options.length)
  return options[index]
}
