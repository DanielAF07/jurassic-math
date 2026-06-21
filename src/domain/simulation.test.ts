import { describe, it, expect } from 'vitest'
import {
  lineGroups,
  hasLine,
  simulateGame,
  runSimulation,
  type GameConfig,
  type SimulationStats,
} from './simulation'
import type { Board } from './types'

// ─── PRNG reproducible (mulberry32) ─────────────────────────────────────────────
// Un único generador sembrado se reutiliza a lo largo de todas las partidas de un
// escenario: cada partida consume valores distintos, así que obtenemos variedad
// real entre partidas pero el resultado global es 100% reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function printReport(title: string, stats: SimulationStats) {
  const { winningCall: wc } = stats
  const lines = [
    '',
    `── ${title} ──`,
    `  tablas: ${stats.config.boardCount} | modo: ${stats.config.type}` +
      (stats.config.type === '4x4'
        ? ` | excludeTrivial: ${stats.config.excludeTrivial}`
        : ''),
    `  partidas simuladas: ${stats.trials}`,
    `  con ganador: ${stats.gamesWithWinner} | sin ganador: ${stats.gamesWithNoWinner} (${(stats.noWinnerRate * 100).toFixed(2)}%)`,
    `  canto ganador → min: ${wc.min} | mediana: ${wc.median.toFixed(1)} | media: ${wc.mean.toFixed(2)} | p90: ${wc.p90.toFixed(1)} | max: ${wc.max}`,
    `  ganadores simultáneos (empate) promedio: ${stats.avgSimultaneousWinners.toFixed(2)}`,
  ]
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'))
}

// ─── Detección de líneas (unit) ─────────────────────────────────────────────────

describe('lineGroups', () => {
  it('genera 8 líneas para 3x3 (3 filas + 3 columnas + 2 diagonales)', () => {
    expect(lineGroups(3)).toHaveLength(8)
  })

  it('genera 10 líneas para 4x4 (4 filas + 4 columnas + 2 diagonales)', () => {
    expect(lineGroups(4)).toHaveLength(10)
  })
})

describe('hasLine', () => {
  const board: Board = { type: '3x3', cells: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
  const groups = lineGroups(3)

  it('detecta una fila completa', () => {
    expect(hasLine(board, new Set([4, 5, 6]), groups)).toBe(true)
  })

  it('detecta una columna completa', () => {
    expect(hasLine(board, new Set([1, 4, 7]), groups)).toBe(true)
  })

  it('detecta una diagonal completa', () => {
    expect(hasLine(board, new Set([1, 5, 9]), groups)).toBe(true)
  })

  it('no detecta línea con casillas sueltas', () => {
    expect(hasLine(board, new Set([1, 5, 6]), groups)).toBe(false)
  })
})

// ─── Una partida ────────────────────────────────────────────────────────────────

describe('simulateGame', () => {
  it('3x3: siempre hay ganador y el canto ganador está dentro del mazo (≤ 9)', () => {
    const random = mulberry32(123)
    for (let i = 0; i < 50; i++) {
      const r = simulateGame({ boardCount: 30, type: '3x3', random })
      expect(r.winningCall).not.toBeNull()
      expect(r.winningCall!).toBeGreaterThanOrEqual(3) // mínimo teórico: 3 cantos
      expect(r.winningCall!).toBeLessThanOrEqual(9)
    }
  })

  it('4x4: el canto ganador nunca supera el tamaño del mazo', () => {
    const random = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const r = simulateGame({
        boardCount: 30,
        type: '4x4',
        excludeTrivial: true,
        random,
      })
      if (r.winningCall !== null) {
        expect(r.winningCall).toBeLessThanOrEqual(r.deckSize)
        expect(r.winningCall).toBeGreaterThanOrEqual(4) // mínimo teórico: 4 cantos
      }
    }
  })
})

// ─── Estadística sobre muchas partidas (lo que pidió el usuario) ─────────────────

const TRIALS = 2000

describe('runSimulation — probabilidad y tiempo hasta ganar', () => {
  const scenarios: { title: string; config: GameConfig }[] = [
    { title: '3x3 · 10 tablas', config: { boardCount: 10, type: '3x3' } },
    { title: '3x3 · 50 tablas', config: { boardCount: 50, type: '3x3' } },
    {
      title: '4x4 · 10 tablas · sin triviales',
      config: { boardCount: 10, type: '4x4', excludeTrivial: true },
    },
    {
      title: '4x4 · 50 tablas · sin triviales',
      config: { boardCount: 50, type: '4x4', excludeTrivial: true },
    },
    {
      title: '4x4 · 50 tablas · con triviales',
      config: { boardCount: 50, type: '4x4', excludeTrivial: false },
    },
  ]

  for (const { title, config } of scenarios) {
    it(`reporta estadísticas: ${title}`, () => {
      const random = mulberry32(2026)
      const stats = runSimulation(TRIALS, { ...config, random })
      printReport(title, stats)

      // Invariantes:
      // 1. Toda partida termina clasificada como con/sin ganador.
      expect(stats.gamesWithWinner + stats.gamesWithNoWinner).toBe(TRIALS)
      // 2. Como las tablas se arman del MISMO pool que canta el cantor,
      //    al agotarse el mazo toda casilla queda marcada → siempre hay ganador.
      expect(stats.gamesWithNoWinner).toBe(0)
      // 3. Más tablas ⇒ el ganador aparece igual o antes (más oportunidades).
      expect(stats.winningCall.mean).toBeGreaterThan(0)
    })
  }
})

describe('runSimulation — más tablas, ganador más temprano', () => {
  it('4x4: la media del canto ganador baja al aumentar la cantidad de tablas', () => {
    const few = runSimulation(TRIALS, {
      boardCount: 5,
      type: '4x4',
      excludeTrivial: true,
      random: mulberry32(1),
    })
    const many = runSimulation(TRIALS, {
      boardCount: 100,
      type: '4x4',
      excludeTrivial: true,
      random: mulberry32(1),
    })
    expect(many.winningCall.mean).toBeLessThan(few.winningCall.mean)
  })
})
