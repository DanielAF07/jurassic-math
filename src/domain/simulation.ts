/**
 * Simulador de partidas de la lotería de multiplicar.
 *
 * Reutiliza la lógica REAL del dominio (boards + deck) para reproducir una
 * partida completa: se generan N tablas, el cantor saca valores de su mazo uno
 * por uno y, tras cada canto, se marcan las casillas y se revisa si alguna tabla
 * completó una LÍNEA (fila, columna o diagonal). La partida termina en el primer
 * canto que produce al menos un ganador.
 */
import { generate3x3Boards, generate4x4Boards } from './boards'
import { createDeck, draw } from './deck'
import { getProductPool } from './products'
import type { Board, BoardType, RandomFn } from './types'

const NUMBERS_3X3 = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export interface GameConfig {
  /** Cantidad de tablas en juego. */
  boardCount: number
  /** Tipo de tabla / modo del cantor. */
  type: BoardType
  /** Solo aplica a 4x4: excluir productos triviales (×1) del pool. */
  excludeTrivial?: boolean
  /** Fuente de aleatoriedad inyectable (para reproducibilidad). */
  random?: RandomFn
}

export interface GameResult {
  /** Canto (1-indexado) en el que apareció el primer ganador, o null si nadie ganó. */
  winningCall: number | null
  /** Índices de las tablas ganadoras en ese canto (puede haber empate). */
  winners: number[]
  /** Total de cantos realizados hasta terminar (gane alguien o se agote el mazo). */
  callsMade: number
  /** Tamaño del mazo del cantor. */
  deckSize: number
  /** Casillas marcadas por tabla al momento de terminar. */
  marksPerBoard: number[]
}

// ─── Detección de líneas ──────────────────────────────────────────────────────

/**
 * Devuelve los grupos de índices (row-major) que forman una línea ganadora:
 * cada fila, cada columna y las dos diagonales.
 */
export function lineGroups(size: number): number[][] {
  const groups: number[][] = []

  // Filas
  for (let r = 0; r < size; r++) {
    groups.push(Array.from({ length: size }, (_, c) => r * size + c))
  }
  // Columnas
  for (let c = 0; c < size; c++) {
    groups.push(Array.from({ length: size }, (_, r) => r * size + c))
  }
  // Diagonal principal y secundaria
  groups.push(Array.from({ length: size }, (_, i) => i * size + i))
  groups.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)))

  return groups
}

/** Lado de la tabla según su tipo. */
function sideOf(type: BoardType): number {
  return type === '3x3' ? 3 : 4
}

/** True si la tabla tiene al menos una línea completa dado el set de valores cantados. */
export function hasLine(board: Board, called: Set<number>, groups: number[][]): boolean {
  return groups.some((group) => group.every((idx) => called.has(board.cells[idx])))
}

// ─── Simulación ────────────────────────────────────────────────────────────────

function buildBoards(config: GameConfig): { boards: Board[]; deckValues: number[] } {
  const random = config.random ?? Math.random
  if (config.type === '3x3') {
    return {
      boards: generate3x3Boards(config.boardCount, random),
      deckValues: NUMBERS_3X3,
    }
  }
  const pool = getProductPool(config.excludeTrivial ?? true)
  return {
    boards: generate4x4Boards(config.boardCount, pool, random),
    deckValues: pool,
  }
}

/** Corre UNA partida completa y devuelve su resultado. */
export function simulateGame(config: GameConfig): GameResult {
  const random = config.random ?? Math.random
  const { boards, deckValues } = buildBoards(config)
  const groups = lineGroups(sideOf(config.type))

  let deck = createDeck(deckValues, random)
  const called = new Set<number>()
  let callsMade = 0
  let winningCall: number | null = null
  let winners: number[] = []

  while (deck.remaining.length > 0) {
    const result = draw(deck)
    deck = result.deck
    if (result.value === null) break
    called.add(result.value)
    callsMade++

    const roundWinners: number[] = []
    for (let i = 0; i < boards.length; i++) {
      if (hasLine(boards[i], called, groups)) roundWinners.push(i)
    }

    if (roundWinners.length > 0) {
      winningCall = callsMade
      winners = roundWinners
      break
    }
  }

  const marksPerBoard = boards.map(
    (b) => b.cells.filter((v) => called.has(v)).length
  )

  return {
    winningCall,
    winners,
    callsMade,
    deckSize: deckValues.length,
    marksPerBoard,
  }
}

// ─── Estadísticas sobre muchas partidas ────────────────────────────────────────

export interface SimulationStats {
  trials: number
  config: Omit<GameConfig, 'random'>
  /** Partidas donde ganó al menos una tabla. */
  gamesWithWinner: number
  /** Partidas donde NADIE ganó (mazo agotado sin línea). */
  gamesWithNoWinner: number
  noWinnerRate: number
  /** Estadísticas del canto ganador (solo sobre partidas con ganador). */
  winningCall: {
    min: number
    max: number
    mean: number
    median: number
    p90: number
  }
  /** Promedio de tablas que ganan a la vez en el canto ganador (empates). */
  avgSimultaneousWinners: number
  /** Histograma: canto ganador -> cantidad de partidas. */
  histogram: Record<number, number>
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  }
  return sorted[base]
}

/**
 * Corre `trials` partidas con la misma configuración y agrega estadísticas.
 * Si se pasa `random`, se usa esa fuente para TODAS las partidas (útil para
 * reproducibilidad); de lo contrario usa Math.random.
 */
export function runSimulation(
  trials: number,
  config: GameConfig
): SimulationStats {
  const random = config.random ?? Math.random
  const winningCalls: number[] = []
  const histogram: Record<number, number> = {}
  let gamesWithWinner = 0
  let gamesWithNoWinner = 0
  let totalSimultaneous = 0

  for (let t = 0; t < trials; t++) {
    const result = simulateGame({ ...config, random })
    if (result.winningCall !== null) {
      gamesWithWinner++
      winningCalls.push(result.winningCall)
      totalSimultaneous += result.winners.length
      histogram[result.winningCall] = (histogram[result.winningCall] ?? 0) + 1
    } else {
      gamesWithNoWinner++
    }
  }

  winningCalls.sort((a, b) => a - b)
  const sum = winningCalls.reduce((acc, v) => acc + v, 0)

  const { random: _r, ...configNoRandom } = config

  return {
    trials,
    config: configNoRandom,
    gamesWithWinner,
    gamesWithNoWinner,
    noWinnerRate: gamesWithNoWinner / trials,
    winningCall: {
      min: winningCalls[0] ?? 0,
      max: winningCalls[winningCalls.length - 1] ?? 0,
      mean: winningCalls.length ? sum / winningCalls.length : 0,
      median: quantile(winningCalls, 0.5),
      p90: quantile(winningCalls, 0.9),
    },
    avgSimultaneousWinners: gamesWithWinner ? totalSimultaneous / gamesWithWinner : 0,
    histogram,
  }
}
