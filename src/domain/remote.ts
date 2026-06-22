import type { RandomFn } from './types'

/** Modo de juego, alineado con CallerMode de la presentación. */
export type RemoteMode = '3x3' | '4x4'

/** Fase del Pantallón, alineada con useTvScreen. */
export type RemotePhase = 'setup' | 'playing'

/** Una operación cantada, tal como la ve el control (CON resultado: el celu sí lo muestra). */
export interface RemoteCall {
  /** Operación sin resultado. Ej "7 × 8". */
  operation: string
  /** Resultado de la operación (el número cantado). El celu SÍ lo muestra. */
  result: number
}

/**
 * Estado COMPLETO del juego que el Pantallón difunde al control.
 * No son deltas: cada snapshot es autosuficiente (sirve para late join y reconexión).
 */
export interface GameSnapshot {
  phase: RemotePhase
  mode: RemoteMode
  excludeTrivial: boolean
  /** Operación + resultado actuales, o null si todavía no se cantó nada. */
  current: RemoteCall | null
  /** Historial completo, del más viejo al más nuevo. */
  history: RemoteCall[]
  total: number
  drawn: number
  exhausted: boolean
}

/** Comandos que el control le manda al Pantallón. */
export type RemoteCommand = { type: 'next' } | { type: 'reset' }

/** Eventos que viajan por el canal. Discriminados por `kind`. */
export type RemoteMessage =
  | { kind: 'control:hello' }
  | { kind: 'host:snapshot'; snapshot: GameSnapshot }
  | { kind: 'control:command'; command: RemoteCommand }

/** Nombres de evento del canal (constantes, para no tipear strings sueltos). */
export const REMOTE_EVENTS = {
  hello: 'control:hello',
  snapshot: 'host:snapshot',
  command: 'control:command',
} as const

/**
 * Estado que mantiene el CONTROL (celu). Empieza desconectado/sin snapshot.
 * `connected` = el canal está suscrito; `snapshot` = último estado recibido de la TV.
 */
export interface ControlState {
  connected: boolean
  snapshot: GameSnapshot | null
}

export const initialControlState: ControlState = {
  connected: false,
  snapshot: null,
}

/** Acciones internas del reducer del control. */
export type ControlAction =
  | { type: 'channel-connected' }
  | { type: 'channel-disconnected' }
  | { type: 'message'; message: RemoteMessage }

/**
 * Reducer PURO del control: dado el estado actual y una acción, devuelve el
 * nuevo estado. El único mensaje entrante que le interesa al control es
 * `host:snapshot`; los demás los ignora (el adaptador no debería enviárselos,
 * pero el reducer es defensivo).
 */
export function controlReducer(
  state: ControlState,
  action: ControlAction
): ControlState {
  switch (action.type) {
    case 'channel-connected':
      return { ...state, connected: true }
    case 'channel-disconnected':
      return { ...state, connected: false }
    case 'message':
      if (action.message.kind === 'host:snapshot') {
        return { ...state, snapshot: action.message.snapshot }
      }
      return state
    default:
      return state
  }
}

/** Alfabeto sin caracteres ambiguos (sin 0/O/1/I) para el room code. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4

/**
 * Genera un room code corto y legible. Aleatoriedad INYECTABLE (patrón del dominio):
 * los tests pasan un RNG determinista. NO usa Math.random directo.
 */
export function generateRoomCode(random: RandomFn = Math.random): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(random() * CODE_ALPHABET.length)
    code += CODE_ALPHABET[idx]
  }
  return code
}

/** Normaliza lo que el usuario tipea en el celu: mayúsculas y sin espacios. */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '')
}
