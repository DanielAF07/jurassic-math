import { useMemo } from 'react'
import { useTvScreen } from './useTvScreen'
import { TvView } from './TvView'
import { useRemoteHost } from '../remote/useRemoteHost'
import type { GameSnapshot, RemoteCall } from '../../domain/remote'

export function TvContainer() {
  const tv = useTvScreen()

  // Mapear el historial del cantor (CurrentCall) al historial remoto (RemoteCall).
  const remoteHistory: RemoteCall[] = useMemo(
    () => tv.history.map((c) => ({ operation: c.operation, result: c.result })),
    [tv.history]
  )

  // Snapshot completo que se difunde al control. useMemo para no difundir en cada render.
  const snapshot: GameSnapshot = useMemo(
    () => ({
      phase: tv.phase,
      mode: tv.mode,
      excludeTrivial: tv.excludeTrivial,
      current: tv.current
        ? { operation: tv.current.operation, result: tv.current.result }
        : null,
      history: remoteHistory,
      total: tv.total,
      drawn: tv.drawn,
      exhausted: tv.exhausted,
    }),
    [
      tv.phase,
      tv.mode,
      tv.excludeTrivial,
      tv.current,
      remoteHistory,
      tv.total,
      tv.drawn,
      tv.exhausted,
    ]
  )

  useRemoteHost({
    code: tv.roomCode,
    snapshot,
    onNext: tv.advance,
    onReset: tv.restart,
    onControlJoined: tv.hideRoomCode,
  })

  return (
    <TvView
      rootRef={tv.rootRef}
      phase={tv.phase}
      mode={tv.mode}
      excludeTrivial={tv.excludeTrivial}
      current={tv.current}
      reveal={tv.reveal}
      mascotPose={tv.mascotPose}
      total={tv.total}
      drawn={tv.drawn}
      exhausted={tv.exhausted}
      isFullscreen={tv.isFullscreen}
      roomCode={tv.roomCode}
      roomCodeVisible={tv.roomCodeVisible}
      onModeChange={(m) => tv.setMode(m)}
      onExcludeTrivialChange={(v) => tv.setExcludeTrivial(v)}
      onStart={tv.start}
      onAdvance={tv.advance}
      onRestart={tv.restart}
      onBackToSetup={tv.backToSetup}
      onToggleFullscreen={tv.toggleFullscreen}
    />
  )
}
