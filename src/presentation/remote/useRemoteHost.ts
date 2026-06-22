import { useEffect, useRef } from 'react'
import { joinRoom, type RoomConnection } from './channel'
import type { GameSnapshot, RemoteMessage } from '../../domain/remote'

interface UseRemoteHostArgs {
  /** Room code de la sala. Si es null/'' no se conecta. */
  code: string | null
  /** Snapshot actual del juego (lo arma el container del Pantallón). */
  snapshot: GameSnapshot
  /** Qué hacer cuando el control pide "siguiente". */
  onNext: () => void
  /** Qué hacer cuando el control pide "reiniciar". */
  onReset: () => void
}

/**
 * Lado HOST del control remoto: difunde el snapshot del juego al canal y
 * ejecuta los comandos que llegan del celu. El Pantallón sigue siendo la
 * autoridad del estado; esto es solo un transporte.
 */
export function useRemoteHost({ code, snapshot, onNext, onReset }: UseRemoteHostArgs) {
  const connRef = useRef<RoomConnection | null>(null)

  // Refs para que el listener (suscrito una sola vez por code) siempre vea el
  // último snapshot y los últimos callbacks sin re-suscribir el canal.
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext
  const onResetRef = useRef(onReset)
  onResetRef.current = onReset

  // Conexión al canal: se rehace solo si cambia el code.
  useEffect(() => {
    if (!code) return
    const handleMessage = (message: RemoteMessage) => {
      if (message.kind === 'control:hello') {
        // Late join: el celu pide el estado actual → se lo mandamos.
        connRef.current?.send({ kind: 'host:snapshot', snapshot: snapshotRef.current })
      } else if (message.kind === 'control:command') {
        if (message.command.type === 'next') onNextRef.current()
        else if (message.command.type === 'reset') onResetRef.current()
      }
    }
    const conn = joinRoom(code, handleMessage, () => {})
    connRef.current = conn
    return () => {
      conn.close()
      connRef.current = null
    }
  }, [code])

  // Difundir el snapshot cada vez que cambia (incluye "ya estaba conectado").
  useEffect(() => {
    connRef.current?.send({ kind: 'host:snapshot', snapshot })
  }, [snapshot])
}
