import { useCallback, useEffect, useRef, useState } from 'react'
import { useCaller } from '../caller/useCaller'
import { generateRoomCode } from '../../domain/remote'

export type RevealState = 'egg' | 'hatching' | 'shown'
export type MascotPose = 'idle' | 'roar' | 'think' | 'celebrate'

/** ms que dura el huevo cascándose antes de revelar la operación. */
const HATCH_MS = 620
/** ms tras revelar para que el dino pase de "rugido" a "pensando". */
const THINK_DELAY_MS = 1700
/** ms que el room code + QR quedan visibles antes de auto-ocultarse. */
const ROOM_CODE_VISIBLE_MS = 30000

/**
 * Orquesta el Pantallón (pantalla de TV). Reutiliza TODA la lógica de mazo de
 * `useCaller` (modos, triviales, sorteo) y le agrega lo propio de la tele:
 * fases setup/playing, animación de eclosión del huevo, pose del dino,
 * pantalla completa y avance por teclado (Espacio / Enter).
 *
 * A diferencia del Cantor, acá NUNCA se expone `current.result`: la pantalla
 * muestra solo la operación para que los niños la resuelvan.
 */
export function useTvScreen() {
  const {
    mode,
    setMode,
    excludeTrivial,
    setExcludeTrivial,
    current,
    history,
    total,
    drawn,
    exhausted,
    callNext,
    reset,
  } = useCaller()

  const rootRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup')
  const [reveal, setReveal] = useState<RevealState>('egg')
  const [pose, setPose] = useState<MascotPose>('idle')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [roomCodeVisible, setRoomCodeVisible] = useState(false)

  // Timers de la eclosión. Se limpian en cada avance y al desmontar para que un
  // avance rápido no deje callbacks viejos pisando el estado.
  const timers = useRef<number[]>([])
  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])

  // Lock: mantener apretado Espacio (o doble click) no debe disparar dos
  // sorteos. Se libera recién cuando la operación quedó revelada (HATCH_MS),
  // lo que además marca un ritmo mínimo entre cantos.
  const locked = useRef(false)

  // Timer del room code: SEPARADO de `timers` (animación) para que un avance no
  // lo cancele. El code/QR se auto-oculta tras ROOM_CODE_VISIBLE_MS.
  const roomCodeTimer = useRef<number | undefined>(undefined)

  // ----- Pantalla completa -----
  const enterFullscreen = useCallback(() => {
    rootRef.current?.requestFullscreen?.().catch(() => {})
  }, [])
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }, [])
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) exitFullscreen()
    else enterFullscreen()
  }, [enterFullscreen, exitFullscreen])

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // ----- Room code / QR del control remoto -----
  // Mostrar = visible + (re)arranca el timer de auto-ocultado.
  const showRoomCode = useCallback(() => {
    window.clearTimeout(roomCodeTimer.current)
    setRoomCodeVisible(true)
    roomCodeTimer.current = window.setTimeout(
      () => setRoomCodeVisible(false),
      ROOM_CODE_VISIBLE_MS
    )
  }, [])
  // Ocultar = apaga el timer y esconde (lo usa el host al conectarse un celu).
  const hideRoomCode = useCallback(() => {
    window.clearTimeout(roomCodeTimer.current)
    setRoomCodeVisible(false)
  }, [])

  // ----- Acciones -----
  const start = useCallback(() => {
    clearTimers()
    locked.current = false
    reset()
    setReveal('egg')
    setPose('idle')
    setRoomCode(generateRoomCode())
    showRoomCode()
    setPhase('playing')
    enterFullscreen()
  }, [clearTimers, reset, enterFullscreen, showRoomCode])

  const advance = useCallback(() => {
    if (locked.current || exhausted) return
    locked.current = true
    clearTimers()
    callNext()
    setReveal('hatching')
    setPose('roar')
    timers.current.push(
      window.setTimeout(() => {
        setReveal('shown')
        locked.current = false
      }, HATCH_MS)
    )
    timers.current.push(window.setTimeout(() => setPose('think'), THINK_DELAY_MS))
  }, [exhausted, callNext, clearTimers])

  const restart = useCallback(() => {
    clearTimers()
    locked.current = false
    reset()
    setReveal('egg')
    setPose('idle')
  }, [clearTimers, reset])

  const backToSetup = useCallback(() => {
    clearTimers()
    locked.current = false
    exitFullscreen()
    reset()
    setReveal('egg')
    setPose('idle')
    setRoomCode(null)
    hideRoomCode()
    setPhase('setup')
  }, [clearTimers, exitFullscreen, reset, hideRoomCode])

  // ----- Teclado (solo mientras se juega) -----
  // Refs para que el listener (suscrito una vez por fase) siempre llame a la
  // última versión de las acciones sin re-suscribirse en cada render.
  const advanceRef = useRef(advance)
  const restartRef = useRef(restart)
  const showRoomCodeRef = useRef(showRoomCode)
  advanceRef.current = advance
  restartRef.current = restart
  showRoomCodeRef.current = showRoomCode

  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        advanceRef.current()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        restartRef.current()
      } else if (e.key === 'c' || e.key === 'C') {
        // Volver a mostrar el code/QR (p. ej. si nadie se conectó y se ocultó).
        e.preventDefault()
        showRoomCodeRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  useEffect(() => () => clearTimers(), [clearTimers])
  useEffect(() => () => window.clearTimeout(roomCodeTimer.current), [])

  // Al agotarse el mazo el dino festeja, sin importar la pose de la animación.
  const mascotPose: MascotPose = exhausted ? 'celebrate' : pose

  return {
    rootRef,
    phase,
    mode,
    setMode,
    excludeTrivial,
    setExcludeTrivial,
    current,
    history,
    reveal,
    mascotPose,
    total,
    drawn,
    exhausted,
    isFullscreen,
    roomCode,
    roomCodeVisible,
    hideRoomCode,
    start,
    advance,
    restart,
    backToSetup,
    toggleFullscreen,
  }
}
