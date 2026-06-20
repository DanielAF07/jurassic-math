import { useCaller } from './useCaller'
import { CallerView } from './CallerView'
import { CallHistory } from './CallHistory'

export function CallerContainer() {
  const {
    mode,
    setMode,
    excludeTrivial,
    setExcludeTrivial,
    current,
    history,
    exhausted,
    callNext,
    reset,
  } = useCaller()

  // Al cambiar modo o el toggle, solo actualizamos el estado: useCaller
  // reconstruye el mazo de forma reactiva (efecto sobre `values`).
  return (
    <CallerView
      mode={mode}
      excludeTrivial={excludeTrivial}
      current={current}
      exhausted={exhausted}
      onModeChange={setMode}
      onExcludeTrivialChange={setExcludeTrivial}
      onCallNext={callNext}
      onReset={reset}
    >
      <CallHistory history={history} />
    </CallerView>
  )
}
