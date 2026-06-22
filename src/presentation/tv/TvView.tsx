import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { CallerMode, CurrentCall } from '../caller/useCaller'
import type { MascotPose, RevealState } from './useTvScreen'
import { QRCodeSVG } from 'qrcode.react'
import './tv.css'

const MASCOT_POSES: MascotPose[] = ['idle', 'roar', 'think', 'celebrate']

interface TvViewProps {
  rootRef: RefObject<HTMLDivElement>
  phase: 'setup' | 'playing'
  mode: CallerMode
  excludeTrivial: boolean
  current: CurrentCall | null
  reveal: RevealState
  mascotPose: MascotPose
  total: number
  drawn: number
  exhausted: boolean
  isFullscreen: boolean
  roomCode: string | null
  roomCodeVisible: boolean
  onModeChange: (mode: CallerMode) => void
  onExcludeTrivialChange: (value: boolean) => void
  onStart: () => void
  onAdvance: () => void
  onRestart: () => void
  onBackToSetup: () => void
  onToggleFullscreen: () => void
}

/** Pinta la operación (ej. "7 × 8") con el operador resaltado en ámbar. */
function Operation({ operation }: { operation?: string }) {
  if (!operation) return null
  const parts = operation.split(' ')
  if (parts.length !== 3) return <span className="tv__num">{operation}</span>
  const [a, symbol, b] = parts
  return (
    <>
      <span className="tv__num">{a}</span>
      <span className="tv__sym">{symbol}</span>
      <span className="tv__num">{b}</span>
    </>
  )
}

export function TvView({
  rootRef,
  phase,
  mode,
  excludeTrivial,
  current,
  reveal,
  mascotPose,
  total,
  drawn,
  exhausted,
  isFullscreen,
  roomCode,
  roomCodeVisible,
  onModeChange,
  onExcludeTrivialChange,
  onStart,
  onAdvance,
  onRestart,
  onBackToSetup,
  onToggleFullscreen,
}: TvViewProps) {
  // Auto-ocultado de la barra de controles: aparece al mover el mouse y se
  // esconde (junto con el cursor) tras 3s de quietud, para no ensuciar la tele.
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (phase !== 'playing') return
    const ping = () => {
      setControlsVisible(true)
      window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000)
    }
    ping()
    window.addEventListener('mousemove', ping)
    return () => {
      window.removeEventListener('mousemove', ping)
      window.clearTimeout(hideTimer.current)
    }
  }, [phase])

  const cue = exhausted
    ? '¡Se acabó! Presiona R para volver a empezar'
    : reveal === 'egg'
      ? 'Presiona Espacio para empezar'
      : '¿Cuánto da? 🦖'

  return (
    <div ref={rootRef} className={phase === 'playing' ? 'tv tv--playing' : 'tv'}>
      {phase === 'setup' ? (
        <div className="tv__setup">
          <div className="tv__setup-card">
            <img
              className="tv__setup-mascot"
              src="/tv/mascot-idle.png"
              alt=""
              aria-hidden="true"
            />
            <h1 className="tv__title">Jurassic Math</h1>
            <p className="tv__subtitle">
              Pantalla de juego — los jugadores resuelven la operación
            </p>

            <div className="tv__modes" role="radiogroup" aria-label="Modo de juego">
              <button
                type="button"
                role="radio"
                aria-checked={mode === '3x3'}
                className={mode === '3x3' ? 'tv__mode tv__mode--active' : 'tv__mode'}
                onClick={() => onModeChange('3x3')}
              >
                <span className="tv__mode-title">3 × 3</span>
                <span className="tv__mode-sub">sumas · números 1–9</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === '4x4'}
                className={mode === '4x4' ? 'tv__mode tv__mode--active' : 'tv__mode'}
                onClick={() => onModeChange('4x4')}
              >
                <span className="tv__mode-title">4 × 4</span>
                <span className="tv__mode-sub">multiplicaciones · productos</span>
              </button>
            </div>

            {mode === '4x4' && (
              <label className="tv__toggle">
                <span>Excluir triviales del ×1</span>
                <input
                  type="checkbox"
                  className="tv__toggle-input"
                  checked={excludeTrivial}
                  onChange={(e) => onExcludeTrivialChange(e.target.checked)}
                />
                <span className="tv__toggle-track" aria-hidden="true">
                  <span className="tv__toggle-thumb" />
                </span>
              </label>
            )}

            <button type="button" className="tv__start" onClick={onStart}>
              ¡Empezar! ▶
            </button>
            <p className="tv__hint-kbd">
              Avanza con <kbd>Espacio</kbd> o <kbd>Enter</kbd>
            </p>
          </div>
        </div>
      ) : (
        <div className={controlsVisible ? 'tv__stage' : 'tv__stage tv__stage--idle'}>
          <div className="tv__bg" aria-hidden="true" />
          <div className="tv__vignette" aria-hidden="true" />

          <img
            className="tv__decor tv__decor--stegosaurus"
            src="/tv/dino-stegosaurus.png"
            alt=""
            aria-hidden="true"
          />
          <img
            className="tv__decor tv__decor--brachiosaurus"
            src="/tv/dino-brachiosaurus.png"
            alt=""
            aria-hidden="true"
          />
          <img
            className="tv__decor tv__decor--triceratops"
            src="/tv/dino-triceratops.png"
            alt=""
            aria-hidden="true"
          />

          <div className="tv__progress">
            {drawn} / {total}
          </div>

          {roomCode && (
            <div className={roomCodeVisible ? 'tv__room' : 'tv__room tv__room--hidden'}>
              <div className="tv__room-text">
                <span className="tv__room-label">Control en el celu</span>
                <span className="tv__room-code">{roomCode}</span>
              </div>
              <div className="tv__room-qr">
                <QRCodeSVG
                  value={`${window.location.origin}/control?code=${roomCode}`}
                  size={88}
                />
              </div>
            </div>
          )}

          <div className="tv__reveal">
            <div className="tv__eggs" aria-hidden="true">
              <img
                className={
                  reveal === 'egg' ? 'tv__egg tv__egg--whole is-on' : 'tv__egg tv__egg--whole'
                }
                src="/tv/egg.png"
                alt=""
              />
              <img
                className={
                  reveal === 'hatching'
                    ? 'tv__egg tv__egg--cracked is-on'
                    : 'tv__egg tv__egg--cracked'
                }
                src="/tv/egg-cracked.png"
                alt=""
              />
            </div>
            <div
              key={drawn}
              className={reveal === 'shown' ? 'tv__op is-on' : 'tv__op'}
              aria-live="polite"
            >
              <Operation operation={current?.operation} />
            </div>
          </div>

          <div className="tv__mascot" aria-hidden="true">
            {MASCOT_POSES.map((p) => (
              <img
                key={p}
                className={mascotPose === p ? 'tv__mascot-img is-on' : 'tv__mascot-img'}
                src={`/tv/mascot-${p}.png`}
                alt=""
              />
            ))}
          </div>

          <p className="tv__cue">{cue}</p>

          <div className="tv__bar">
            <button type="button" onClick={onAdvance} disabled={exhausted}>
              ▶ Siguiente
            </button>
            <button type="button" onClick={onRestart}>
              ↻ Reiniciar
            </button>
            <button type="button" onClick={onToggleFullscreen}>
              {isFullscreen ? '🗗 Ventana' : '⛶ Pantalla completa'}
            </button>
            <button type="button" onClick={onBackToSetup}>
              ✕ Salir
            </button>
            <span className="tv__bar-kbd">
              Espacio / Enter = siguiente · R = reiniciar · C = código
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
