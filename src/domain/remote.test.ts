import { describe, it, expect } from 'vitest'
import {
  controlReducer,
  initialControlState,
  generateRoomCode,
  normalizeRoomCode,
  type GameSnapshot,
} from './remote'

/** RNG determinista (mulberry32), igual patrón que deck.test.ts. */
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

const SNAPSHOT: GameSnapshot = {
  phase: 'playing',
  mode: '4x4',
  excludeTrivial: true,
  current: { operation: '7 × 8', result: 56 },
  history: [{ operation: '7 × 8', result: 56 }],
  total: 30,
  drawn: 1,
  exhausted: false,
}

describe('controlReducer', () => {
  it('arranca desconectado y sin snapshot', () => {
    expect(initialControlState).toEqual({ connected: false, snapshot: null })
  })

  it('channel-connected marca connected en true sin tocar snapshot', () => {
    const next = controlReducer(initialControlState, { type: 'channel-connected' })
    expect(next.connected).toBe(true)
    expect(next.snapshot).toBeNull()
  })

  it('channel-disconnected marca connected en false y conserva el snapshot', () => {
    const withSnap = controlReducer(
      { connected: true, snapshot: null },
      { type: 'message', message: { kind: 'host:snapshot', snapshot: SNAPSHOT } }
    )
    const next = controlReducer(withSnap, { type: 'channel-disconnected' })
    expect(next.connected).toBe(false)
    expect(next.snapshot).toEqual(SNAPSHOT)
  })

  it('host:snapshot guarda el snapshot completo', () => {
    const next = controlReducer(initialControlState, {
      type: 'message',
      message: { kind: 'host:snapshot', snapshot: SNAPSHOT },
    })
    expect(next.snapshot).toEqual(SNAPSHOT)
  })

  it('ignora mensajes que no son host:snapshot', () => {
    const next = controlReducer(initialControlState, {
      type: 'message',
      message: { kind: 'control:hello' },
    })
    expect(next).toEqual(initialControlState)
  })
})

describe('generateRoomCode', () => {
  it('genera 4 caracteres del alfabeto seguro (sin 0/O/1/I)', () => {
    const code = generateRoomCode(makeSeeded(42))
    expect(code).toHaveLength(4)
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
  })

  it('es reproducible con la misma semilla', () => {
    expect(generateRoomCode(makeSeeded(7))).toBe(generateRoomCode(makeSeeded(7)))
  })

  it('con RNG que devuelve 0 retorna AAAA', () => {
    expect(generateRoomCode(() => 0)).toBe('AAAA')
  })
})

describe('normalizeRoomCode', () => {
  it('pasa a mayúsculas y saca espacios', () => {
    expect(normalizeRoomCode('  ab c2 ')).toBe('ABC2')
  })
})
