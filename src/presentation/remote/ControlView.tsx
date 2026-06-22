import type { GameSnapshot } from '../../domain/remote'

interface ControlViewProps {
  input: string
  code: string | null
  connected: boolean
  snapshot: GameSnapshot | null
  onInputChange: (value: string) => void
  onConnect: () => void
  onDisconnect: () => void
  onNext: () => void
  onReset: () => void
}

export function ControlView({
  input,
  code,
  connected,
  snapshot,
  onInputChange,
  onConnect,
  onDisconnect,
  onNext,
  onReset,
}: ControlViewProps) {
  // Sin code confirmado: pantalla de emparejamiento.
  if (!code) {
    return (
      <div className="control">
        <h1 className="control__title">Control del Pantallón</h1>
        <p className="control__hint">Ingresá el código que aparece en la TV.</p>
        <form
          className="control__join"
          onSubmit={(e) => {
            e.preventDefault()
            onConnect()
          }}
        >
          <input
            className="control__input"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="CÓDIGO"
            maxLength={4}
            autoCapitalize="characters"
            autoCorrect="off"
            inputMode="text"
            aria-label="Código de sala"
          />
          <button className="control__connect" type="submit" disabled={input.length < 4}>
            Conectar
          </button>
        </form>
      </div>
    )
  }

  // Con code: panel de control.
  const exhausted = snapshot?.exhausted ?? false
  return (
    <div className="control">
      <header className="control__bar">
        <span className={connected ? 'control__dot control__dot--on' : 'control__dot'} />
        <span className="control__room">Sala {code}</span>
        <button className="control__leave" type="button" onClick={onDisconnect}>
          Salir
        </button>
      </header>

      {!snapshot ? (
        <p className="control__waiting">Esperando al Pantallón…</p>
      ) : (
        <>
          <section className="control__current">
            <span className="control__current-label">Operación actual</span>
            {snapshot.current ? (
              <>
                <span className="control__current-op">{snapshot.current.operation}</span>
                <span className="control__current-res">= {snapshot.current.result}</span>
              </>
            ) : (
              <span className="control__current-empty">Todavía no se cantó nada.</span>
            )}
          </section>

          <div className="control__actions">
            <button
              className="control__next"
              type="button"
              onClick={onNext}
              disabled={exhausted}
            >
              ▶ Siguiente
            </button>
            <button className="control__reset" type="button" onClick={onReset}>
              ↻ Reiniciar
            </button>
          </div>

          <section className="control__history">
            <h2>Ya cantados ({snapshot.history.length})</h2>
            {snapshot.history.length === 0 ? (
              <p className="control__history-empty">Todavía no se cantó nada.</p>
            ) : (
              <ul className="control__history-list">
                {[...snapshot.history].reverse().map((call, index) => (
                  <li
                    key={snapshot.history.length - 1 - index}
                    className={
                      index === 0
                        ? 'control__chip control__chip--latest'
                        : 'control__chip'
                    }
                  >
                    <span className="control__chip-op">{call.operation}</span>
                    <span className="control__chip-eq">=</span>
                    <span className="control__chip-res">{call.result}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
