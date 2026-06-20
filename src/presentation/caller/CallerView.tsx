import './caller.css'
import type { CallerMode, CurrentCall } from './useCaller'

interface CallerViewProps {
  mode: CallerMode
  excludeTrivial: boolean
  current: CurrentCall | null
  exhausted: boolean
  onModeChange: (mode: CallerMode) => void
  onExcludeTrivialChange: (value: boolean) => void
  onCallNext: () => void
  onReset: () => void
  children?: React.ReactNode
}

export function CallerView({
  mode,
  excludeTrivial,
  current,
  exhausted,
  onModeChange,
  onExcludeTrivialChange,
  onCallNext,
  onReset,
  children,
}: CallerViewProps) {
  return (
    <section className="caller">
      <h2>El cantor</h2>

      <div className="caller__controls">
        <div
          className="caller__segmented"
          role="radiogroup"
          aria-label="Modo"
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === '3x3'}
            className={
              mode === '3x3'
                ? 'caller__segment caller__segment--active'
                : 'caller__segment'
            }
            onClick={() => onModeChange('3x3')}
          >
            <span className="caller__segment-title">3x3</span>
            <span className="caller__segment-sub">números 1–9</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === '4x4'}
            className={
              mode === '4x4'
                ? 'caller__segment caller__segment--active'
                : 'caller__segment'
            }
            onClick={() => onModeChange('4x4')}
          >
            <span className="caller__segment-title">4x4</span>
            <span className="caller__segment-sub">productos</span>
          </button>
        </div>

        {mode === '4x4' && (
          <label className="caller__toggle">
            <span className="caller__toggle-label">Excluir triviales del ×1</span>
            <input
              type="checkbox"
              className="caller__toggle-input"
              checked={excludeTrivial}
              onChange={(e) => onExcludeTrivialChange(e.target.checked)}
            />
            <span className="caller__toggle-track" aria-hidden="true">
              <span className="caller__toggle-thumb" />
            </span>
          </label>
        )}
      </div>

      <div className="caller__current">
        {current ? (
          <>
            <span className="caller__operation">{current.operation}</span>
            <span className="caller__result">{current.result}</span>
          </>
        ) : (
          <span className="caller__placeholder">
            Toca "Cantar" para empezar
          </span>
        )}
      </div>

      <div className="caller__actions">
        <button type="button" onClick={onCallNext} disabled={exhausted}>
          Cantar
        </button>
        <button type="button" onClick={onReset}>
          Reiniciar
        </button>
      </div>

      {exhausted && <p className="caller__exhausted">¡El mazo se agotó!</p>}

      {children}
    </section>
  )
}
