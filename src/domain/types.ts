export type BoardType = '3x3' | '4x4'

export interface Board {
  type: BoardType
  /** Celdas en orden row-major: 9 elementos para 3x3, 16 para 4x4 */
  cells: number[]
}

export type Factorization = [number, number]

export type Addition = [number, number]

export interface Deck<T> {
  remaining: T[]
  drawn: T[]
}

/** Función de aleatoriedad inyectable: devuelve un número en [0, 1) */
export type RandomFn = () => number
